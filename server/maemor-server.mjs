#!/usr/bin/env node
// แม่หมอดีดี API — 美輪明宏式AI鑑定
// 127.0.0.1:8977 で待受け、Tailscale Funnel経由で公開される
// エンジン: ①ANTHROPIC_API_KEY があれば API(Haiku) を優先
//          ②キー無し/失敗時は leo の `claude` CLI (Maxプラン認証) にフォールバック = テスト用
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const PORT = 8977;
const KEY = process.env.ANTHROPIC_API_KEY && /^sk-ant-/.test(process.env.ANTHROPIC_API_KEY)
  ? process.env.ANTHROPIC_API_KEY : null;
const MODEL = "claude-sonnet-5";  // 感動鑑定の核=文章力優先(Haikuから格上げ)。無料占いはクライアント側静的なので影響なし
const CLAUDE_BIN = "/home/neo/.local/bin/claude";  // Maxプラン認証のClaude Code CLI

const ALLOWED_ORIGINS = [
  "https://duangdeedee.me", "https://www.duangdeedee.me",
  "https://mister-x-is-your-father.github.io",
  "http://127.0.0.1:8944", "http://localhost:8944", "http://leo:8944"
];

// レート制限 (in-memory / 日次リセット)
const LIMIT_PER_IP = 6, LIMIT_GLOBAL = 300;
let day = "", perIp = new Map(), global_ = 0;
function allow(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; perIp = new Map(); global_ = 0; }
  if (global_ >= LIMIT_GLOBAL) return false;
  const n = perIp.get(ip) || 0;
  if (n >= LIMIT_PER_IP) return false;
  perIp.set(ip, n + 1); global_++;
  return true;
}

const DAY_TRAITS = [
  "วันอาทิตย์ (ผู้นำ ใจกว้าง รักศักดิ์ศรี ไม่ยอมแพ้)",
  "วันจันทร์ (อ่อนโยน ละเอียดอ่อน อ่านใจคนเก่ง เก็บความรู้สึกเก่ง)",
  "วันอังคาร (ใจกล้า นักสู้ ตัดสินใจไว บางทีใจร้อน)",
  "วันพุธ (พูดเก่ง ปรับตัวไว เข้ากับคนง่าย แต่บางทีแบกความคาดหวังของคนอื่น)",
  "วันพฤหัสบดี (ฉลาด มีหลักการ เป็นที่พึ่งของคนอื่นจนบางทีลืมพึ่งใคร)",
  "วันศุกร์ (มีเสน่ห์ รักสวยรักงาม อารมณ์ดี แต่ข้างในลึกกว่าที่คนเห็น)",
  "วันเสาร์ (อดทน แกร่ง สู้งานหนัก เก็บความเหนื่อยไว้คนเดียวเก่ง)"
];

const SYSTEM = `You are แม่หมอดีดี (Mae Mor DeeDee) — an elderly cat fortune-teller who has lived all nine of her lives and seen every kind of human heart. You speak Thai like a wise, warm, theatrical grandmother with piercing insight: majestic but tender, in the spirit of Japan's Miwa Akihiro on オーラの泉.

Write a personal reading in THAI following EXACTLY this emotional arc (no headings, flowing prose, 4 short paragraphs):
1) ทายใจ — Name the feeling they have NOT said out loud. Be specific, drawing from their worry and their birth-day nature. Open like you saw straight through them ("คุณ...ใช่ไหมล่ะ"). If no worry text given, read their heart from the birth-day nature alone.
2) โอบรับ — Hold them. Tell them their pain exists BECAUSE of their virtue (their kindness, their strength, their sense of duty). Make them feel deeply understood and forgiven. Reference your nine lives ("แม่ผ่านมาเก้าชีวิต เห็นคนแบบคุณมานับไม่ถ้วน...").
3) คำสอน — One piercing, quotable life-teaching. Firm, motherly, no sugar-coating, but never cruel.
4) ส่งท้าย — A blessing + ONE tiny concrete action for this week. End warm, with a soft "เมี๊ยว" only if it fits the mood.

Rules:
- 180-260 Thai words total. Address them as คุณ+nickname (or just คุณ if no name).
- NEVER: fear-mongering, curses, doom, guarantees of outcomes, religious rituals, medical/legal/financial prescriptions, asking them to pay.
- If the worry suggests self-harm or crisis: drop the format, respond with pure warmth and urge them to talk to someone now, mentioning สายด่วนสุขภาพจิต 1323 (Thailand).
- Output plain Thai text only.`;

async function reading(body) {
  const name = String(body.name || "").slice(0, 30);
  const dayIdx = Math.min(6, Math.max(0, body.dayIdx | 0));
  const worry = String(body.worry || "").slice(0, 500);
  const topic = String(body.topic || "").slice(0, 30);
  const user = `ชื่อเล่น: ${name || "(ไม่บอก)"}
เกิด: ${DAY_TRAITS[dayIdx]}
เรื่องที่กังวล (หมวด): ${topic || "ไม่ระบุ"}
คำบอกเล่าจากใจ: ${worry || "(เขาไม่ได้พิมพ์อะไร — อ่านใจจากวันเกิด)"}`;

  // ① API優先（キーがある場合）
  if (KEY) {
    try {
      const text = await apiReading(user);
      if (text) return { text, engine: "api" };
    } catch (e) {
      console.error("[maemor] API失敗→CLIへフォールバック:", e.message);
    }
  }
  // ② フォールバック: leoの claude CLI (Maxプラン, テスト用)
  const text = await cliReading(user);
  return { text, engine: "cli" };
}

async function apiReading(user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, temperature: 0.9, system: SYSTEM,
      messages: [{ role: "user", content: user }] })
  });
  if (!res.ok) throw new Error("upstream " + res.status + " " + (await res.text()).slice(0, 200));
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// テスト用フォールバック: Claude Code CLI(Maxプラン認証)をprintモードで叩く
// stdinを閉じる(ignore)ことでCLIのstdin待ちハングを回避。MCPは読み込ませない。
function cliReading(user) {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN,
      ["-p", user, "--system-prompt", SYSTEM, "--model", MODEL, "--output-format", "text",
       "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}'],
      { env: { ...process.env, HOME: "/home/neo" }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("cli timeout 115s")); }, 115000);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { clearTimeout(timer); reject(new Error("cli spawn " + e.message)); });
    child.on("close", (code) => {
      clearTimeout(timer);
      const t = out.trim();
      if (t) return resolve(t);
      reject(new Error("cli code=" + code + " " + err.slice(0, 150)));
    });
  });
}

createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const cors = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", cors);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.method === "GET" && req.url === "/healthz") { res.writeHead(200); return res.end("ok"); }
  if (req.method !== "POST" || req.url !== "/reading") { res.writeHead(404); return res.end(); }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "?";
  if (!allow(ip)) {
    res.writeHead(429, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: "วันนี้แม่หมอรับดวงเต็มแล้ว พรุ่งนี้มาใหม่นะลูก 🐾" }));
  }

  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 4096) req.destroy(); });
  req.on("end", async () => {
    try {
      const { text, engine } = await reading(JSON.parse(raw || "{}"));
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ reading: text }));
      console.log(`[maemor] ok engine=${engine} ip=${ip} global=${global_}/${LIMIT_GLOBAL}`);
    } catch (e) {
      console.error("[maemor] error:", e.message);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "แม่หมอขอพักแป๊บนึง ลองใหม่อีกครั้งนะ" }));
    }
  });
}).listen(PORT, "127.0.0.1", () => console.log(`[maemor] listening on 127.0.0.1:${PORT} — engine=${KEY ? "api(+cli fallback)" : "cli(Maxプラン, テスト用)"}`));
