#!/usr/bin/env node
// DuangDee TikTok バリエーション生成 — 「同じ型の連投」を避け、TikTok の拡散機構(完了率・保存・シェア・コメント)を型ごとに狙う
// 使い方: node gen-variants.mjs <type> [YYYY-MM-DD]
//   type = quote  : 8〜10秒。แม่หมอ の一言(引用カード)。ループ前提。安い(≈120字)
//          weekly : 12〜15秒。曜日別「今週の吉色/凶色」一覧 = 保存(セーブ)狙いの資料型。週1(日曜)
//          zodiac : 15秒。干支(ปีนักษัตร)フック = 誕生曜日と別軸の「自分事化」。シェア狙い
//          pick2  : 25秒。2択「ซ้าย/ขวา」= コメント欄が割れる参加型
// 出力: out/YYYY-MM-DD-<type>/<type>.mp4 + caption.txt + meta.json (+ <type>.cover.png)
// 共通: 数字は扱わない(防火壁)。断定・保証・煽り禁止。先頭カット noFadeIn(サムネ)。ハッシュタグは5個まで
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAnimated } from "../../kamishibai/anim.mjs";
import { loadEnv, cyrb53, bkkIso, thDate, dowOf, DAYS, PALETTES, MOTIFS, STAGE, makePage } from "./lib/scene.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
loadEnv(ROOT);
const TYPES = ["quote", "weekly", "zodiac", "pick2"];
const type = process.argv[2];
if (!TYPES.includes(type)) { console.error(`usage: node gen-variants.mjs <${TYPES.join("|")}> [YYYY-MM-DD]`); process.exit(1); }
const iso = bkkIso(process.argv[3]);
const pick = (pool, salt) => pool[cyrb53(iso + "|" + type + "|" + salt) % pool.length];
const pal = pick(PALETTES, "pal");
const motif = pick(MOTIFS, "motif");
const page = makePage(pal, motif);
const day = DAYS[dowOf(iso)];

// ---------- 素材 (タイ語・AI生成・要ネイティブ校正) ----------
const QUOTES = [
  "วันที่คุณแค่ลุกขึ้นมาได้… ก็เก่งแล้วนะลูก",
  "ไม่ต้องรีบเข้มแข็งวันนี้ก็ได้ พรุ่งนี้แม่ยังอยู่ตรงนี้",
  "คนที่ทำให้คุณเหนื่อย ไม่ควรได้พลังของคุณไปทั้งหมด",
  "คุณไม่ได้ช้า… คุณแค่เดินทางของตัวเอง",
  "เรื่องที่คิดวนอยู่ตอนนี้ อีกสามเดือนจะเป็นแค่เรื่องเล่า",
  "ใจดีกับคนอื่นมาตลอด… วันนี้ลองใจดีกับตัวเองสักครั้ง",
  "ที่คุณยังไม่ยอมแพ้ นั่นแหละคือโชคที่คุณสร้างเอง",
  "เงียบไม่ได้แปลว่าไม่มีใครเห็น แม่เห็นนะ",
  "ของดีมันมาเงียบ ๆ อย่าเพิ่งปิดประตู",
  "หายใจลึก ๆ หนึ่งครั้ง โลกยังไม่พังหรอกลูก"
];
const QUOTE_HOOKS = [
  { screen: "แม่ขอพูด\nแค่ประโยคเดียว 🐾", tts: "แม่ขอพูดแค่ประโยคเดียวนะลูก" },
  { screen: "ฟังแม่แป๊บ 🐾", tts: "ฟังแม่แป๊บนึง" },
  { screen: "ถ้าวันนี้เหนื่อย 🐾\nอ่านอันนี้", tts: "ถ้าวันนี้เหนื่อย อ่านอันนี้นะ" }
];
// 干支: 一言はキャラ(親近感→承認→本当の優しさ)。content.js の ZODIAC(長文)とは別に短文で管理
const ZODIAC = [
  { name: "ปีชวด", animal: "หนู", emoji: "🐭", line: "หัวไวจนคนตามไม่ทัน… แต่ใจคุณก็เหนื่อยเร็วเหมือนกัน พักบ้างนะ" },
  { name: "ปีฉลู", animal: "วัว", emoji: "🐮", line: "คุณทำเงียบ ๆ มานาน… คนเริ่มเห็นค่าแล้ว อย่าเพิ่งท้อ" },
  { name: "ปีขาล", animal: "เสือ", emoji: "🐯", line: "กล้าจนคนคิดว่าไม่กลัวอะไร… แม่รู้ว่ากลัวเหมือนกัน แต่ก็ยังไป นั่นแหละเก่ง" },
  { name: "ปีเถาะ", animal: "กระต่าย", emoji: "🐰", line: "อ่อนโยนไม่ใช่อ่อนแอ… คนที่รักคุณ เขาเห็นสิ่งนี้" },
  { name: "ปีมะโรง", animal: "มังกร", emoji: "🐲", line: "ฝันใหญ่แล้วโดนหัวเราะ… ปล่อยเขา คนที่ไปถึงมักโดนหัวเราะก่อน" },
  { name: "ปีมะเส็ง", animal: "งู", emoji: "🐍", line: "คุณรู้ก่อนคนอื่นเสมอ… ครั้งนี้เชื่อสัญชาตญาณตัวเองนะ" },
  { name: "ปีมะเมีย", animal: "ม้า", emoji: "🐴", line: "วิ่งมาตลอด… หยุดพักไม่ได้แปลว่าแพ้นะลูก" },
  { name: "ปีมะแม", animal: "แพะ", emoji: "🐐", line: "ใจดีจนคนเอาเปรียบ… ใจดีต่อไปได้ แต่เลือกคนหน่อย" },
  { name: "ปีวอก", animal: "ลิง", emoji: "🐵", line: "ทำให้ทุกคนหัวเราะ… แล้วใครทำให้คุณหัวเราะบ้าง แม่ถามจริง" },
  { name: "ปีระกา", animal: "ไก่", emoji: "🐔", line: "เป๊ะกับทุกอย่าง… ยกเว้นการให้อภัยตัวเอง ลองดูนะ" },
  { name: "ปีจอ", animal: "หมา", emoji: "🐶", line: "ซื่อสัตย์กับทุกคน… อย่าลืมซื่อสัตย์กับความรู้สึกตัวเองด้วย" },
  { name: "ปีกุน", animal: "หมู", emoji: "🐷", line: "คุณให้มากกว่าที่ได้รับมาตลอด… รอบนี้ถึงตาคุณได้บ้างแล้ว" }
];
const PICK2_PAIRS = [
  { L: { key: "ความรัก", hex: "#ff5d8f", msg: "คนที่คิดถึงคุณอยู่ มีจริงนะลูก… เขาแค่ยังไม่กล้าทัก" }, R: { key: "การเงิน", hex: "#2e9e5b", msg: "ของที่เกือบลืมไปแล้ว อาจกลับมาเป็นเงินก้อนเล็ก ๆ… เปิดตาไว้" } },
  { L: { key: "พลังใจ", hex: "#f5c518", msg: "คุณไม่ต้องเก่งทุกวันก็ได้… วันที่แค่ลุกขึ้นมาได้ ก็เก่งแล้ว" }, R: { key: "โอกาส", hex: "#2f6fd0", msg: "ประตูที่คิดว่าปิดแล้ว… จริง ๆ แค่ปิดไม่สนิท" } },
  { L: { key: "ความสงบ", hex: "#9d4edd", msg: "ไม่ต้องคิดให้ครบทุกอย่างคืนนี้… พรุ่งนี้ค่อยคิดต่อก็ได้" }, R: { key: "เสน่ห์", hex: "#f77f00", msg: "คุณดูดีกว่าที่เห็นในกระจกนะลูก… คนอื่นเห็นมาตลอด" } }
];

// ---------- 型ごとのスライド ----------
const css = `
  .day{font-size:104px;font-weight:800;line-height:1.2;margin:30px 60px 0;white-space:pre-line}
  .quote{font-family:'Sarabun';font-size:62px;line-height:1.5;margin:56px 90px 0;color:#fff;font-weight:600}
  .week{display:inline-block;margin-top:8px;padding:8px 34px;border-radius:999px;border:3px solid #f4c95d;color:#f4c95d;font-size:38px;font-weight:600}
  .tbl{width:900px;margin-top:40px;border-collapse:separate;border-spacing:0 14px;font-size:40px;font-weight:600}
  .tbl td{padding:6px 14px;text-align:left}
  .dot{display:inline-block;width:46px;height:46px;border-radius:50%;vertical-align:middle;margin-right:14px;box-shadow:0 0 18px color-mix(in srgb, var(--c) 60%, transparent);background:radial-gradient(circle at 38% 32%, #ffffffcc, var(--c) 60%, #00000055)}
  .dim{color:#f5f2ffb0;font-weight:500;font-size:34px}
  .lr{display:flex;gap:80px;margin-top:56px}
  .lr .o{width:260px;height:260px;border-radius:50%;box-shadow:0 0 80px color-mix(in srgb, var(--c) 55%, transparent);background:radial-gradient(circle at 38% 32%, #ffffffcc, var(--c) 58%, #00000055)}
  .lr .l{font-size:44px;font-weight:700;margin-top:16px}
  .msg{font-family:'Sarabun';font-size:50px;line-height:1.6;margin:36px 80px 0;color:#fff}
  .url{margin-top:26px;font-size:44px;color:#f4c95d;font-weight:700}`;
const base = (s) => ({ seek: true, loop: 3.0, hold: 0.3, ...s });   // s.hold 指定があれば優先(weekly の長い hold 等)
let slides = [], caption = "", meta = {};
const TAGS_FIXED = "#สายมู #ดูดวง #แม่หมอดีดี";
const URL_LINE = "duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)";

if (type === "quote") {
  const hook = pick(QUOTE_HOOKS, "hook"), q = pick(QUOTES, "q");
  slides = [
    base({ html: page(480, `${STAGE}<h1 class="day">${hook.screen}</h1>`, css), tts: hook.tts, noFadeIn: true }),
    base({ html: page(420, `${STAGE}<div class="week">แม่หมอดีดี</div><div class="quote">${q}</div>`, css), tts: q, hold: 1.2, noFadeOut: true })
  ];
  caption = `${q} 🐾 เซฟไว้อ่านวันที่เหนื่อยนะ ${TAGS_FIXED} #กำลังใจ #มูเตลู`;
  meta = { hook: hook.screen, quote: q };
} else if (type === "weekly") {
  const rows = DAYS.map((d) => `<tr><td>${d.name}</td><td><span class="dot" style="--c:${d.lucky[1]}"></span>${d.lucky[0]}</td><td class="dim"><span class="dot" style="--c:${d.avoid[1]};opacity:.7"></span>เลี่ยง ${d.avoid[0]}</td></tr>`).join("");
  const tts = "สีมงคลของแต่ละวันเกิด สัปดาห์นี้… เซฟไว้ดูได้เลยนะลูก แล้วส่งให้เพื่อนด้วย";
  slides = [
    base({ html: page(360, `${STAGE}<div class="week">สัปดาห์นี้ · ${thDate(iso)}</div><h1 class="day" style="font-size:80px">สีมงคล<br>ตามวันเกิด 🔮</h1><table class="tbl">${rows}</table>`, css), tts, noFadeIn: true, noFadeOut: true, hold: 6.0 })
  ];
  caption = `สีมงคลตามวันเกิด สัปดาห์นี้ครบ 7 วัน 🔮 เซฟไว้ แล้วส่งให้เพื่อนที่เกิดวันนั้น 🐾 วอลเปเปอร์สีมงคลเฉพาะคุณ → ${URL_LINE} ${TAGS_FIXED} #สีมงคล #เสริมดวง`;
  meta = { days: DAYS.map((d) => [d.name, d.lucky[0], d.avoid[0]]) };
} else if (type === "zodiac") {
  const z = ZODIAC[cyrb53(iso + "|z") % ZODIAC.length];
  const hook = { screen: `คนเกิด${z.name} ${z.emoji}\nหยุดก่อน`, tts: `คนเกิด${z.name} หยุดก่อนนะลูก แม่ขอแป๊บเดียว` };
  const cta = { screen: `ส่งให้เพื่อน 🐾\nที่เกิด${z.name}`, tts: `ส่งให้เพื่อนที่เกิด${z.name}ด้วยนะ` };
  slides = [
    base({ html: page(480, `${STAGE}<div class="week">ปีนักษัตร · ${thDate(iso)}</div><h1 class="day">${hook.screen}</h1>`, css), tts: hook.tts, noFadeIn: true }),
    base({ html: page(420, `${STAGE}<div class="week">แม่เห็นนะ</div><div class="quote" style="font-size:56px">${z.line}</div>`, css), tts: z.line }),
    base({ html: page(400, `${STAGE}<h1 class="day">${cta.screen}</h1><div class="url">duangdeedee.me</div>`, css), tts: cta.tts, noFadeOut: true })
  ];
  caption = `คนเกิด${z.name} ${z.emoji} ฟังแม่แป๊บ… ${z.line} 🐾 ส่งให้เพื่อนที่เกิด${z.name} → ${URL_LINE} ${TAGS_FIXED} #คนเกิด${z.name} #มูเตลู`;
  meta = { zodiac: z.name, line: z.line };
} else if (type === "pick2") {
  const p = pick(PICK2_PAIRS, "pair");
  const hook = pick([{ screen: "ซ้าย หรือ ขวา? 🐾\nเลือกก่อนอ่าน", tts: "ซ้ายหรือขวา เลือกก่อนนะลูก แล้วค่อยอ่าน" }, { screen: "ใจเรียกข้างไหน 🐾\nซ้าย หรือ ขวา", tts: "ใจคุณเรียกข้างไหน ซ้าย หรือ ขวา" }], "hook");
  slides = [
    base({ html: page(420, `${STAGE}<h1 class="day">${hook.screen}</h1><div class="lr"><div><div class="o" data-pulse style="--c:${p.L.hex}"></div><div class="l">ซ้าย</div></div><div><div class="o" data-pulse style="--c:${p.R.hex}"></div><div class="l">ขวา</div></div></div>`, css), tts: hook.tts, noFadeIn: true }),
    base({ html: page(400, `${STAGE}<h1 class="day" style="font-size:72px">ซ้าย · <span class="gold">${p.L.key}</span></h1><div class="lr" style="justify-content:center"><div class="o" style="--c:${p.L.hex}"></div></div><div class="msg">${p.L.msg}</div>`, css), tts: `ถ้าเลือกซ้าย… ${p.L.msg}` }),
    base({ html: page(400, `${STAGE}<h1 class="day" style="font-size:72px">ขวา · <span class="gold">${p.R.key}</span></h1><div class="lr" style="justify-content:center"><div class="o" style="--c:${p.R.hex}"></div></div><div class="msg">${p.R.msg}</div>`, css), tts: `ถ้าเลือกขวา… ${p.R.msg}` }),
    base({ html: page(420, `${STAGE}<h1 class="day">ทีมซ้าย หรือ ทีมขวา 🐾</h1><div class="url">duangdeedee.me</div>`, css), tts: "คุณทีมซ้ายหรือทีมขวา บอกแม่ในคอมเมนต์นะ", noFadeOut: true })
  ];
  caption = `ซ้าย (${p.L.key}) หรือ ขวา (${p.R.key})? เลือกก่อนอ่านนะลูก 🔮 ทีมไหนบอกแม่ในคอมเมนต์ 🐾 สีมงคลตามวันเกิด → ${URL_LINE} ${TAGS_FIXED} #มูเตลู #ดวงวันนี้`;
  meta = { left: p.L.key, right: p.R.key };
}

// ---------- 生成 ----------
const ttsEngine = process.env.TTS_ENGINE || undefined;
const engineEff = ttsEngine || ((process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) ? "elevenlabs" : "edge");
const ttsChars = slides.reduce((a, s) => a + (s.tts || "").length, 0);
const outDir = join(ROOT, "out", `${iso}-${type}${process.env.VAR_SUFFIX || ""}`);
if (process.env.VAR_DRY) { console.log(`[${type}] DRY ${iso} engine=${engineEff} tts chars=${ttsChars} (botnoi V2 ≈ ${ttsChars * 2} point) slides=${slides.length}`); console.log(caption); process.exit(0); }
mkdirSync(outDir, { recursive: true });
console.log(`[${type}] ${iso} — ${JSON.stringify(meta).slice(0, 80)} | tts=${engineEff} ${ttsChars}字`);
const outMp4 = await renderAnimated({
  out: join(outDir, `${type}.mp4`), size: [1080, 1920], fps: 30, padSec: 0.2, fade: 0.2,
  ttsEngine, botnoiSpeaker: process.env.BOTNOI_SPEAKER, ttsCache: join(ROOT, ".tts-cache"),
  voice: "th-TH-PremwadeeNeural", rate: "+2%", ttsTempo: engineEff === "elevenlabs" ? 1.18 : 1.0,
  music: join(ROOT, "assets", "bgm-warm.mp3"), musicVol: 0.10, slides
}, ROOT);
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: type, ...meta, palette: pal, ttsChars }, null, 2));
console.log(`[${type}] ✅ ${outMp4}`);
