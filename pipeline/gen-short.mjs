#!/usr/bin/env node
// DuangDee TikTok「15秒ループ型」— 誕生曜日フック × 今週の吉色/凶色 × 一言 × シェア誘導
// 使い方: node gen-short.mjs [YYYY-MM-DD]   (省略時=バンコク時間の今日。その日の曜日 = 対象の「〜曜日生まれ」)
// 出力: out/YYYY-MM-DD-short/short.mp4 + caption.txt + meta.json (+ short.cover.png = 1フレーム目)
//
// 設計 (2026-09-06 ユーザー「当たりを出すには」への回答):
//  - 完了率が最重要 → 12〜16秒。最初の1秒で「自分のことだ」と分かるフック(生まれ曜日)
//  - シェア動機 = 「〜曜日生まれの友達に送って」。保存動機 = 曜日の吉色/凶色(資料性)
//  - 先頭カットはフェードイン無し(=既定サムネ)、末尾はフェードアウト無し(=ループが繋がる)
//  - 数字(เลขนำโชค)は扱わない = 防火壁クリーン。断定・保証・煽り禁止
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAnimated } from "../../kamishibai/anim.mjs";
import { loadEnv, cyrb53, bkkIso, thDate, dowOf, DAYS, PALETTES, STAGE, makePage } from "./lib/scene.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
loadEnv(ROOT);
const iso = bkkIso(process.argv[2]);
const pick = (pool, salt) => pool[cyrb53(iso + "|short|" + salt) % pool.length];
const day = DAYS[dowOf(iso)];
const pal = pick(PALETTES, "pal");
const page = makePage(pal);

// ---------- 台本プール (タイ語・AI生成・要ネイティブ校正) ----------
const HOOKS = [
  { screen: `คนเกิด${day.name} 🐾\nหยุดก่อน`, tts: `คนเกิด${day.name} หยุดก่อนนะลูก แม่ขอแป๊บเดียว` },
  { screen: `คนเกิด${day.name} 👀\nแม่ขอ 10 วิ`, tts: `คนเกิด${day.name} ฟังแม่ 10 วินะ` },
  { screen: `เกิด${day.name}ใช่ไหม 🐾\nมานี่ก่อน`, tts: `เกิด${day.name}ใช่ไหมลูก มานี่ก่อน` }
];
const INSIGHTS = [
  { tts: `สัปดาห์นี้ ใส่${day.lucky[0]}ไว้นะ โชคเข้าง่าย… ส่วน${day.avoid[0]} เลี่ยงไว้ก่อน` },
  { tts: `อาทิตย์นี้ ${day.lucky[0]}คือสีของคุณ… ${day.avoid[0]}พักไว้ก่อนนะลูก` }
];
// 曜日別の「見抜いてる」一言 (親近感→承認→本当の優しさ)。2本ずつ = 同じ曜日でも週ごとに変わる
const HEARTS = {
  0: ["คุณดูแลทุกคนได้… แต่พอเรื่องตัวเอง กลับเงียบ แม่เห็นนะลูก", "คนเกิดวันอาทิตย์ยอมแพ้ยาก… แต่พักได้นะ พักไม่ใช่แพ้"],
  1: ["คุณอ่านใจคนอื่นเก่ง… แต่ลืมอ่านใจตัวเอง แม่รู้", "อ่อนโยนไม่ใช่อ่อนแอนะลูก… คนที่ไว้ใจคุณ เขาเห็นสิ่งนี้"],
  2: ["คุณลุยมาตลอด… วันนี้ไม่ต้องสู้ก็ได้ แค่หายใจ", "ใจกล้าของคุณ คนรอบข้างได้พลังไปเยอะ… อย่าลืมเก็บไว้ให้ตัวเองบ้าง"],
  3: ["คุณพูดให้ทุกคนสบายใจได้… แต่คำที่คุณอยากได้ยิน ยังไม่มีใครพูด แม่พูดให้: เก่งแล้ว", "ปรับตัวเก่งจนบางทีลืมว่าตัวเองอยากได้อะไร… ลองถามตัวเองวันนี้นะ"],
  4: ["ใคร ๆ มาปรึกษาคุณ… แล้วคุณปรึกษาใครลูก แม่อยู่ตรงนี้", "รอบคอบดีแล้ว… แต่บางเรื่อง ใจถูกมากกว่าหัว"],
  5: ["คุณสดใสให้คนอื่นเสมอ… วันไหนไม่ไหว ไม่ต้องยิ้มก็ได้นะ", "เสน่ห์ของคุณไม่ใช่หน้าตา… คือตอนที่คุณจริงใจ"],
  6: ["คุณอึดจนคนคิดว่าคุณไม่เหนื่อย… แม่รู้ว่าเหนื่อย ทำได้ดีมากแล้ว", "ความสำเร็จของคุณสร้างเอง… ภูมิใจได้เต็มที่นะลูก"]
};
const CTAS = [
  { screen: `ส่งให้เพื่อน 🐾\nที่เกิด${day.name}`, tts: `ส่งให้เพื่อนที่เกิด${day.name}ด้วยนะลูก` },
  { screen: `แท็กเพื่อน 🐾\nที่เกิด${day.name}`, tts: `แท็กเพื่อนที่เกิด${day.name}มาอ่านด้วยนะ` }
];
const hook = pick(HOOKS, "hook"), insight = pick(INSIGHTS, "ins"), heart = pick(HEARTS[day.key], "heart"), cta = pick(CTAS, "cta");

// ---------- スライド (4カット・各カットは猫のアイドルループ) ----------
const css = `
  .day{font-size:112px;font-weight:800;line-height:1.2;margin:30px 60px 0;white-space:pre-line}
  .row{display:flex;gap:44px;margin-top:56px;align-items:center}
  .sw{width:250px;height:250px;border-radius:50%;box-shadow:0 0 80px color-mix(in srgb, var(--c) 55%, transparent);
    background:radial-gradient(circle at 38% 32%, #ffffffcc, var(--c) 58%, #00000055)}
  .sw.small{width:150px;height:150px;opacity:.75;filter:grayscale(.2)}
  .lbl{font-size:44px;font-weight:700;margin-top:18px}
  .lbl small{display:block;font-size:34px;font-weight:600;color:#f5f2ffb0}
  .heart{font-family:'Sarabun';font-size:54px;line-height:1.55;margin:40px 80px 0;color:#fff}
  .url{margin-top:26px;font-size:44px;color:#f4c95d;font-weight:700}
  .week{display:inline-block;margin-top:8px;padding:8px 34px;border-radius:999px;border:3px solid #f4c95d;color:#f4c95d;font-size:38px;font-weight:600}`;
const slides = [
  { html: page(480, `${STAGE}<div class="week">${day.power} · ${thDate(iso)}</div><h1 class="day">${hook.screen}</h1>`, css), tts: hook.tts, noFadeIn: true },
  { html: page(400, `${STAGE}<div class="week">สัปดาห์นี้</div><div class="row"><div><div class="sw" data-pulse style="--c:${day.lucky[1]}"></div><div class="lbl">ใส่ ${day.lucky[0]}<small>โชคเข้าง่าย</small></div></div><div><div class="sw small" style="--c:${day.avoid[1]}"></div><div class="lbl" style="opacity:.8">เลี่ยง ${day.avoid[0]}<small>พักไว้ก่อน</small></div></div></div>`, css), tts: insight.tts },
  { html: page(420, `${STAGE}<div class="week">แม่เห็นนะ</div><div class="heart">${heart}</div>`, css), tts: heart },
  { html: page(400, `${STAGE}<h1 class="day">${cta.screen}</h1><div class="url">duangdeedee.me</div><div class="sub" style="font-size:38px">สีมงคลครบทุกวันเกิด</div>`, css), tts: cta.tts, noFadeOut: true }
].map((s) => ({ ...s, seek: true, loop: 3.0, hold: 0.25 }));

// ---------- 生成 ----------
const ttsEngine = process.env.TTS_ENGINE || undefined;
const engineEff = ttsEngine || ((process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) ? "elevenlabs" : "edge");
const ttsChars = slides.reduce((a, s) => a + (s.tts || "").length, 0);
const outDir = join(ROOT, "out", iso + "-short" + (process.env.SHORT_SUFFIX || ""));
if (process.env.SHORT_DRY) { console.log(`[short] DRY ${iso} ${day.name} engine=${engineEff} tts chars=${ttsChars} (botnoi V2 ≈ ${ttsChars * 2} point)`); process.exit(0); }
mkdirSync(outDir, { recursive: true });
console.log(`[short] ${iso} ${day.name} — hook#${HOOKS.indexOf(hook)} heart#${HEARTS[day.key].indexOf(heart)} pal#${PALETTES.indexOf(pal)} | tts=${engineEff} ${ttsChars}字`);
const outMp4 = process.env.SHORT_CAPTION_ONLY ? join(outDir, "short.mp4") : await renderAnimated({
  out: join(outDir, "short.mp4"), size: [1080, 1920], fps: 30, padSec: 0.2, fade: 0.2,
  ttsEngine, botnoiSpeaker: process.env.BOTNOI_SPEAKER, ttsCache: join(ROOT, ".tts-cache"),
  voice: "th-TH-PremwadeeNeural", rate: "+2%",
  ttsTempo: engineEff === "elevenlabs" ? 1.18 : 1.0,
  music: join(ROOT, "assets", "bgm-warm.mp3"), musicVol: 0.10,
  slides
}, ROOT);

const TAIL_TAGS = ["#fyp", "#สายมูต้องรู้", "#ดวงวันนี้", "#fypシ"];
const caption = `คนเกิด${day.name} ฟังแม่แป๊บ 🐾 สัปดาห์นี้ใส่${day.lucky[0]} เลี่ยง${day.avoid[0]}… ${cta.screen.split("\n").join(" ").replace(/🐾/g, "").trim()} 🔮 สีมงคลครบทุกวันเกิด → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#คนเกิด${day.name} #สีมงคล #สายมู #ดูดวง #มูเตลู #แม่หมอดีดี ${pick(TAIL_TAGS, "tag")}`;
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: "short", day: day.name, lucky: day.lucky[0], avoid: day.avoid[0], hook: hook.screen, heart, palette: pal, ttsChars }, null, 2));
console.log(`[short] ✅ ${outMp4}`);
