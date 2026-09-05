#!/usr/bin/env node
// DuangDee TikTok「เลือก 1 ใน 3」(3択リビール) ジェネレータ — 戦略 reports/11 のA型テスト用
// 使い方: node gen-pick3.mjs [YYYY-MM-DD]   (省略時=バンコク時間の今日)
// 出力: out/YYYY-MM-DD-pick3/pick3.mp4 + caption.txt + meta.json
//
// 設計原則 (reports/11):
//  - 毎回変わる: フック / 3テーマの組合せ / 文言 / 背景パレット  → 同一テンプレ反復(Unoriginal判定)を避ける
//  - 変わらない: แม่หมอดีดี の性格 (แม่→ลูก、短文、間「…」、断定より寄り添い、前向き着地)
//  - 数字(เลขนำโชค)は扱わない = 防火壁クリーン。保証表現・煽り・取引条件CTAは禁止
//  - 猫は常にアイドル動作(瞬き/呼吸/揺れ/カメラ目線) = anim.mjs の loop モード
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAnimated } from "../../kamishibai/anim.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));

// 任意: pipeline/.env.local (ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID 等) を読む。gitignore済み。無ければ edge-tts で生成
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* .env.local なし */ }

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const dateArg = process.argv[2];
// バンコクの「壁時計の日付」を使う(toISOString は UTC に戻すため深夜〜朝7時は前日になるバグの回避)
const bkkNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
const pad2 = (n) => String(n).padStart(2, "0");
const iso = dateArg || `${bkkNow.getFullYear()}-${pad2(bkkNow.getMonth() + 1)}-${pad2(bkkNow.getDate())}`;
const pick = (pool, salt) => pool[cyrb53(iso + "|" + salt) % pool.length];

// ---------- 台本プール (タイ語・AI生成・要ネイティブ校正) ----------
const HOOKS = [
  { screen: "หยุดก่อน 🐾\nแม่มีของขวัญให้", tts: "หยุดก่อนนะลูก… แม่มีของขวัญให้ 1 อย่าง" },
  { screen: "อย่าเพิ่งเลื่อน ✨\nวันนี้มีเรื่องดีซ่อนอยู่", tts: "อย่าเพิ่งเลื่อนผ่านนะ… วันนี้ดวงคุณมีเรื่องดีซ่อนอยู่" },
  { screen: "แม่เห็นบางอย่าง 👀\nในดวงคุณ", tts: "แม่เห็นบางอย่างในดวงคุณ… มาดูด้วยกันนะลูก" },
  { screen: "ลูกเหนื่อยใช่ไหม 🐾\nมานี่ก่อน", tts: "ลูกเหนื่อยใช่ไหม… มานี่ก่อน แม่มีอะไรจะบอก" }
];
const CHOOSE = { screen: "เลือก 1 ลูก 🔮\nที่ใจเรียก… แตะค้างไว้", tts: "เลือกลูกแก้ว 1 ลูก ที่ใจเรียกนะ… แตะค้างไว้ อย่าเปลี่ยนใจ" };
const THEMES = [
  { key: "พลังใจ", color: "สีเหลือง", hex: "#f5c518",
    msgs: ["ช่วงนี้คุณเหนื่อยแบบไม่บอกใครใช่ไหม… แม่รู้นะ แต่ที่ยืนอยู่ได้ทุกวันนี้ เพราะคุณแกร่งกว่าที่คิด", "คุณไม่ต้องเก่งทุกวันก็ได้ลูก… วันที่แค่ลุกขึ้นมาได้ ก็เก่งแล้ว"],
    acts: ["วันนี้พกของสีเหลืองติดตัว แล้วหายใจลึก ๆ 1 ที ก่อนออกจากบ้าน", "เขียนสิ่งที่ทำได้ดีวันนี้ 1 อย่าง ก่อนนอน"] },
  { key: "การเงิน", color: "สีเขียว", hex: "#2e9e5b",
    msgs: ["เงินกำลังหาทางเข้าหาคุณ… แต่มันชอบคนที่กระเป๋าเป็นระเบียบนะลูก", "ของที่คุณเกือบลืมไปแล้ว อาจกลับมาเป็นเงินก้อนเล็ก ๆ… เปิดตาไว้"],
    acts: ["เอาใบเสร็จเก่าออกจากกระเป๋าตังค์วันนี้ เปิดที่ให้เงินใหม่", "จดรายจ่ายแค่ 1 วัน… วันเดียวพอ แม่ขอแค่นี้"] },
  { key: "ความรัก", color: "สีชมพู", hex: "#ff5d8f",
    msgs: ["คนที่คิดถึงคุณอยู่ มีจริงนะลูก… เขาแค่ยังไม่กล้าทัก", "ความรักช่วงนี้ไม่ต้องรีบ… ของดีมันมาแบบเงียบ ๆ"],
    acts: ["ใส่สีชมพูสักชิ้น แล้วทักคนที่คุณคิดถึงก่อน 1 คน", "ยิ้มให้ตัวเองในกระจก 3 วินาที คนอื่นจะยิ้มตาม"] },
  { key: "โอกาส", color: "สีน้ำเงิน", hex: "#2f6fd0",
    msgs: ["ประตูที่คุณคิดว่าปิดแล้ว… จริง ๆ แค่ปิดไม่สนิทนะลูก", "โอกาสครั้งนี้มาในชุดที่ดูธรรมดา… อย่ามองข้าม"],
    acts: ["วันนี้ตอบ 'ได้' กับเรื่องที่คุณเกือบปฏิเสธ 1 เรื่อง", "ทักคนที่ไม่ได้คุยนาน 1 คน มีข่าวดีรออยู่"] },
  { key: "ความสงบ", color: "สีม่วง", hex: "#9d4edd",
    msgs: ["ใจคุณดังกว่าเสียงรอบตัวมานานแล้ว… วันนี้ให้มันได้เงียบบ้างนะ", "ไม่ต้องคิดให้ครบทุกอย่างในคืนนี้… พรุ่งนี้ค่อยคิดต่อก็ได้"],
    acts: ["ก่อนนอน วางมือถือห่างตัว 1 ช่วงแขน", "ดื่มน้ำอุ่น 1 แก้ว ช้า ๆ ไม่ต้องรีบ"] },
  { key: "เสน่ห์", color: "สีส้ม", hex: "#f77f00",
    msgs: ["คุณดูดีกว่าที่คุณเห็นในกระจกนะลูก… คนอื่นเห็นมาตลอด", "เสน่ห์ของคุณไม่ใช่หน้าตา… มันคือตอนที่คุณตั้งใจฟังคนอื่น"],
    acts: ["ใส่สีส้มสักจุด แล้วออกไปเจอคนวันนี้", "ชมคนใกล้ตัว 1 คนแบบจริงใจ แล้วดูสิ่งที่ย้อนกลับมา"] }
];
const CLOSES = [
  // クローズは短く(完了率優先)。URLは画面に出すので読みは軽く
  { screen: "คุณเลือกลูกไหน? 🐾\nบอกแม่หน่อย", tts: "คุณเลือกลูกไหนนะ… บอกแม่หน่อย… สีมงคลตามวันเกิดของคุณ อยู่ที่ ดวงดี๊ดี ดอท เอ็มอี นะลูก" },
  { screen: "เลือกลูกไหน… 🐾\nแม่รออ่านอยู่", tts: "เลือกลูกไหน บอกแม่ในคอมเมนต์นะ… แม่รออ่านอยู่… สีมงคลเฉพาะคุณ ที่ ดวงดี๊ดี ดอท เอ็มอี" }
];
const PALETTES = [
  ["#2f2470", "#1a1440", "#0d0b26"], ["#1e3a5f", "#132a45", "#0a1626"],
  ["#4a1f5e", "#2a1240", "#120a24"], ["#2b2b60", "#1a1a3f", "#0c0c22"]
];
const ORDINAL = ["ลูกที่หนึ่ง", "ลูกที่สอง", "ลูกที่สาม"];

// 今日の3テーマ: 決定論的シャッフルの先頭3つ(重複なし)
const themes = THEMES.map((t, i) => ({ t, k: cyrb53(iso + "#t" + i) })).sort((a, b) => a.k - b.k).slice(0, 3).map((x) => x.t);
const hook = pick(HOOKS, "hook"), close = pick(CLOSES, "close"), pal = pick(PALETTES, "pal");

// ---------- キャラ(SVG) + アイドル動作(__seek は周期関数 = loop モード用) ----------
const CAT_SVG = `<svg id="cat" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g id="head">
    <polygon points="55,70 68,28 92,62" fill="#5b4636"/><polygon points="145,70 132,28 108,62" fill="#5b4636"/>
    <polygon points="62,64 70,40 84,60" fill="#8a6f57"/><polygon points="138,64 130,40 116,60" fill="#8a6f57"/>
    <ellipse cx="100" cy="95" rx="52" ry="46" fill="#f3e5cf"/><ellipse cx="100" cy="112" rx="24" ry="17" fill="#e8d5b8"/>
    <g id="eyesOpen"><ellipse cx="80" cy="92" rx="4.6" ry="5.2" fill="#5b4636"/><ellipse cx="120" cy="92" rx="4.6" ry="5.2" fill="#5b4636"/>
      <circle cx="81.6" cy="90.2" r="1.5" fill="#fff"/><circle cx="121.6" cy="90.2" r="1.5" fill="#fff"/></g>
    <g id="eyesClosed" style="display:none"><path d="M72 92 q8 6 16 0" stroke="#5b4636" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M112 92 q8 6 16 0" stroke="#5b4636" stroke-width="4" fill="none" stroke-linecap="round"/></g>
    <path d="M97 106 q3 3 6 0" stroke="#c98b8b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M100 109 q0 6 -7 8 M100 109 q0 6 7 8" stroke="#5b4636" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <g stroke="#cbb79b" stroke-width="2.4" stroke-linecap="round"><line x1="42" y1="100" x2="66" y2="103"/><line x1="42" y1="112" x2="66" y2="110"/>
      <line x1="158" y1="100" x2="134" y2="103"/><line x1="158" y1="112" x2="134" y2="110"/></g>
  </g>
  <g id="orb"><circle cx="100" cy="168" r="24" fill="url(#orbg)"/><circle cx="93" cy="161" r="6" fill="rgba(255,255,255,0.75)"/></g>
  <defs><radialGradient id="orbg" cx="0.4" cy="0.35" r="1"><stop offset="0%" stop-color="#ffe9a8"/><stop offset="55%" stop-color="#f4c95d"/><stop offset="100%" stop-color="#c78f2d"/></radialGradient></defs>
  <ellipse cx="78" cy="160" rx="10" ry="8" fill="#f3e5cf"/><ellipse cx="122" cy="160" rx="10" ry="8" fill="#f3e5cf"/>
</svg>`;
const CAT_SCRIPT = `<script>
window.__seek=function(t){var TWO=Math.PI*2,br=Math.sin(t*TWO*2),sw=Math.sin(t*TWO);
 document.getElementById('head').setAttribute('transform','translate(0 '+(br*1.6).toFixed(2)+') rotate('+(sw*1.4).toFixed(2)+' 100 95)');
 var bl=(Math.abs(t-0.30)<0.028)||(Math.abs(t-0.76)<0.028);
 document.getElementById('eyesOpen').style.display=bl?'none':'block';document.getElementById('eyesClosed').style.display=bl?'block':'none';
 var g=document.getElementById('glow'); if(g) g.style.opacity=(0.72+0.28*Math.sin(t*TWO*2)).toFixed(3);
 document.getElementById('orb').setAttribute('transform','translate(100 168) scale('+(1+0.035*Math.sin(t*TWO*2+1)).toFixed(3)+') translate(-100 -168)');
 document.querySelectorAll('[data-pulse]').forEach(function(el,i){el.style.transform='scale('+(1+0.035*Math.sin(t*TWO*2+i*1.3)).toFixed(3)+')';});
};window.__seek(0);</script>`;

const FONT = `<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700;800&family=Sarabun:wght@500;600&display=block" rel="stylesheet">`;
const page = (cat, body) => `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT}<style>
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
  body{font-family:'Prompt',sans-serif;color:#f5f2ff;text-align:center;position:relative;display:flex;flex-direction:column;align-items:center;
    background:radial-gradient(circle at 50% 28%, ${pal[0]} 0%, ${pal[1]} 45%, ${pal[2]} 100%)}
  .stage{position:relative;width:${cat}px;height:${cat}px;margin-top:140px;flex:none}
  #glow{position:absolute;inset:-8%;border-radius:50%;background:radial-gradient(circle, rgba(244,201,93,0.30), rgba(244,201,93,0) 62%)}
  #cat{position:relative;width:100%;height:100%;filter:drop-shadow(0 14px 44px rgba(244,201,93,0.35))}
  .brand{position:absolute;bottom:56px;left:0;right:0;font-size:32px;color:#ffffffbb;font-weight:600}
  h1{font-size:82px;font-weight:800;line-height:1.28;margin:36px 60px 0;white-space:pre-line}
  .gold{color:#f4c95d}
  .sub{font-family:'Sarabun';font-size:46px;color:#f5f2ffd9;line-height:1.55;margin:28px 90px 0}
  .orbs{display:flex;gap:56px;margin-top:64px}
  .orb{width:210px;height:210px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:800;color:#33260a;
    background:radial-gradient(circle at 38% 32%, #ffe9a8, #f4c95d 55%, #c78f2d);box-shadow:0 0 60px #f4c95d66}
  .big{width:300px;height:300px;border-radius:50%;margin-top:36px;box-shadow:0 0 90px color-mix(in srgb, var(--c) 55%, transparent);
    background:radial-gradient(circle at 38% 32%, #ffffffcc, var(--c) 58%, #00000055)}
  .chip{display:inline-block;margin-top:24px;padding:8px 36px;border-radius:999px;border:3px solid var(--c);color:var(--c);font-size:40px;font-weight:600}
  .msg{font-family:'Sarabun';font-size:46px;line-height:1.6;margin:30px 80px 0;color:#fff}
  .act{font-family:'Sarabun';font-size:38px;line-height:1.5;margin:26px 90px 0;color:#f4c95d}
</style></head><body>${body}<div class="brand">🐱 ดวงดี๊ดี · duangdeedee.me · เพื่อความบันเทิง</div>${CAT_SCRIPT}</body></html>`;
const stage = `<div class="stage"><div id="glow"></div>${CAT_SVG}</div>`;

// ---------- スライド ----------
const slides = [
  { html: page(560, `${stage}<h1>${hook.screen}</h1>`), tts: hook.tts },
  { html: page(520, `${stage}<h1>${CHOOSE.screen}</h1><div class="orbs"><div class="orb" data-pulse>1</div><div class="orb" data-pulse>2</div><div class="orb" data-pulse>3</div></div>`), tts: CHOOSE.tts },
  ...themes.map((th, i) => {
    const msg = pick(th.msgs, "m" + i), act = pick(th.acts, "a" + i);
    return {
      html: page(420, `${stage}<h1 style="font-size:64px">ลูกที่ ${i + 1} · <span class="gold">${th.key}</span></h1><div class="big" data-pulse style="--c:${th.hex}"></div><div class="chip" style="--c:${th.hex}">${th.color}</div><div class="msg">${msg}</div><div class="act">🐾 ${act}</div>`),
      tts: `ถ้าคุณเลือก${ORDINAL[i]}… ${msg}`   // 行動提案(act)は画面表示のみ = リビール尺を短く(完了率優先)
    };
  }),
  { html: page(520, `${stage}<h1>${close.screen}</h1><div class="sub">สีมงคลตามวันเกิดคุณ →<br><span class="gold">duangdeedee.me</span></div>`), tts: close.tts }
].map((s) => ({ ...s, seek: true, loop: 3.0, hold: 0.45 }));

// ---------- 生成 ----------
const outDir = join(ROOT, "out", iso + "-pick3");
mkdirSync(outDir, { recursive: true });
console.log(`[pick3] ${iso} — テーマ: ${themes.map((t) => t.key).join(" / ")} | hook#${HOOKS.indexOf(hook)} pal#${PALETTES.indexOf(pal)}`);
const outMp4 = await renderAnimated({
  out: join(outDir, "pick3.mp4"), size: [1080, 1920], fps: 30, padSec: 0.35, fade: 0.25,
  voice: "th-TH-PremwadeeNeural", rate: "+2%",            // edge-tts 用(ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID があれば自動で elevenlabs)
  ttsTempo: process.env.ELEVENLABS_API_KEY ? 1.18 : 1.0,   // ElevenLabs v3 はタイ語がゆっくり(実測 edge比 +20%)→ピッチ不変で1.18倍速。edge は素のまま
  music: join(ROOT, "assets", "bgm-warm.mp3"), musicVol: 0.10,
  slides
}, ROOT);

const caption = `${hook.screen.split("\n")[0].replace(/[🐾✨👀]/g, "").trim()} เลือกลูกแก้ว 1 ลูก แล้วดูว่าแม่หมอดีดีเห็นอะไร 🔮 คุณเลือกลูกไหน? บอกแม่ในคอมเมนต์นะ 🐾 สีมงคลตามวันเกิดของคุณ → duangdeedee.me (ลิงก์ในไบโอ)
#สายมู #ดูดวง #เสริมดวง #ดวงรายวัน #มูเตลู #แม่หมอดีดี #fyp`;
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: "pick3", themes: themes.map((t) => t.key), hook: hook.screen, palette: pal }, null, 2));
console.log(`[pick3] ✅ ${outMp4}`);
