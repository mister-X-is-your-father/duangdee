#!/usr/bin/env node
// ElevenLabs 声選定ツール — Voice Library からタイ語対応の候補を抽出 → 自分のライブラリに追加 → 同じタイ語2文で試聴mp3を一括生成(+edge-tts基準)
// 使い方: node tools/el-voices.mjs [--gender female] [--n 3]
//   要: pipeline/.env.local の ELEVENLABS_API_KEY  (無料枠はカスタム声3枠なので --n は3以下推奨)
// 出力: out/voices/<name>_1.mp3, _2.mp3, edge-Premwadee_*.mp3, summary.json(voice_id 一覧)
//   → 聴き比べで決めたら .env.local に ELEVENLABS_VOICE_ID=<voice_id> を書く
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // pipeline/
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* なし */ }

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("ELEVENLABS_API_KEY がありません (pipeline/.env.local)"); process.exit(1); }
const H = { "xi-api-key": KEY };
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const gender = opt("--gender", "female"), N = Math.max(1, +opt("--n", "3"));
// タイ語は v3 が正常(flash_v2_5 は英語premade声×タイ語で誤読・暴走を実測)。$ELEVENLABS_MODEL で上書き可
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_v3";
const LINES = [
  "สวัสดีจ้ะลูก… แม่หมอดีดีมาแล้ว วันนี้แม่มีเรื่องดี ๆ จะบอก",
  "ช่วงนี้คุณเหนื่อยแบบไม่บอกใครใช่ไหม… แม่รู้นะ แต่คุณแกร่งกว่าที่คิด"
];
const out = join(ROOT, "out", "voices");
mkdirSync(out, { recursive: true });
const sanitize = (s) => String(s || "voice").replace(/[^\w\-]+/g, "_").slice(0, 32);

// 1) 候補抽出 (Voice Library: タイ語 × 性別)
const q = new URLSearchParams({ language: "th", gender, page_size: "60" });
const res = await fetch("https://api.elevenlabs.io/v1/shared-voices?" + q, { headers: H });
if (!res.ok) throw new Error(`shared-voices ${res.status} ${(await res.text()).slice(0, 300)}`);
let { voices = [] } = await res.json();
console.log(`[voices] タイ語×${gender} の候補: ${voices.length} 件`);
// Voice Library にタイ語タグの声が無い場合(2026-09実測: 0件)は premade 声にフォールバック(多言語モデルがタイ語を喋る)
if (!voices.length) {
  const r2 = await fetch("https://api.elevenlabs.io/v1/voices", { headers: H });
  const j2 = r2.ok ? await r2.json() : { voices: [] };
  voices = (j2.voices || []).filter((v) => v.category === "premade" && (v.labels || {}).gender === gender)
    .map((v) => ({ ...v, ...(v.labels || {}), premade: true }));
  console.log(`[voices] premade(${gender}) にフォールバック: ${voices.length} 件`);
}
// 「ばあちゃん猫」に寄せる: 中年〜高齢 / calm・warm・soft 系の記述を優先
const score = (v) => {
  const txt = `${v.age || ""} ${v.descriptive || ""} ${v.description || ""} ${v.use_case || ""}`.toLowerCase();
  return (/(middle|old|senior|mature)/.test(txt) ? 3 : 0) + (/(calm|warm|soft|gentle|soothing|kind|friendly|storytell|narrat)/.test(txt) ? 2 : 0)
    + (v.language === "th" ? 1 : 0) + Math.min(1, (v.cloned_by_count || 0) / 1000);
};
const picked = [...voices].sort((a, b) => score(b) - score(a)).slice(0, N);
if (!picked.length) { console.error("候補が0件でした。--gender male も試すか、Voice Library UI で手動選定を"); process.exit(2); }

// 2) 追加 → 3) 試聴生成
const summary = [];
for (const v of picked) {
  let voiceId = v.voice_id;
  if (!v.premade) try {   // premade は既にライブラリ内なので追加不要
    const add = await fetch(`https://api.elevenlabs.io/v1/voices/add/${v.public_owner_id}/${v.voice_id}`, {
      method: "POST", headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ new_name: ("DD " + (v.name || v.voice_id)).slice(0, 30) }) });
    if (add.ok) { const j = await add.json(); voiceId = j.voice_id || voiceId; }
    else console.warn(`  add失敗 ${v.name}: ${add.status} ${(await add.text()).slice(0, 120)}`);
  } catch (e) { console.warn("  add例外", e.message); }
  const files = [];
  for (let i = 0; i < LINES.length; i++) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST", headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ text: LINES[i], model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }) });
    if (!r.ok) { console.warn(`  tts失敗 ${v.name}: ${r.status} ${(await r.text()).slice(0, 120)}`); continue; }
    const f = join(out, `${sanitize(v.name)}_${i + 1}.mp3`);
    writeFileSync(f, Buffer.from(await r.arrayBuffer())); files.push(f);
  }
  summary.push({ name: v.name, voice_id: voiceId, age: v.age, accent: v.accent, gender: v.gender, description: v.description || v.descriptive, use_case: v.use_case, preview_url: v.preview_url, files });
  console.log(`[voices] ${v.name} (${v.age || "?"}, ${v.accent || "?"}) voice_id=${voiceId} -> ${files.length} files`);
}
// 基準: 現行 edge-tts
for (let i = 0; i < LINES.length; i++) {
  const f = join(out, `edge-Premwadee_${i + 1}.mp3`);
  execFileSync("edge-tts", ["--voice", "th-TH-PremwadeeNeural", "--text", LINES[i], "--write-media", f]);
}
writeFileSync(join(out, "summary.json"), JSON.stringify({ model: MODEL, lines: LINES, candidates: summary }, null, 2));
console.log(`[voices] ✅ ${join(out, "summary.json")}`);
