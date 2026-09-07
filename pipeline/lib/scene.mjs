// DuangDee 動画の共通部品: 猫キャラ(SVG+アイドル動作)・ページ骨格・パレット・曜日データ・小道具
// gen-pick3.mjs(3択リビール) / gen-short.mjs(15秒ループ) から import する。
import { readFileSync } from "node:fs";
import { join } from "node:path";

// pipeline/.env.local (TTS鍵等) を process.env に読む。gitignore済み。無ければ何もしない
export function loadEnv(root) {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* なし */ }
}

export function cyrb53(str, seed = 0) {
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

// バンコクの壁時計の日付 (toISOString は UTC に戻るので深夜〜朝7時に前日になるバグを避ける)
export function bkkIso(dateArg) {
  if (dateArg) return dateArg;
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const thDate = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${TH_MONTHS[m - 1]}`; };
export const dowOf = (iso) => new Date(iso + "T12:00:00+07:00").getDay();   // 0=日 … 6=土

// 生まれ曜日の色体系② สีมงคลประจำวันเกิด (lucky=สีมงคล / money=สีเรียกเงิน / avoid=สีกาลกิณี)
// ⚠ サイト content.js の DAYS と同期必須 (2026-09-04 に体系②へ修正済み)
export const DAYS = [
  { key: 0, name: "วันอาทิตย์", short: "อาทิตย์", power: "พลังผู้นำ", lucky: ["สีชมพู", "#ff5d8f"], money: ["สีเขียว", "#2e9e5b"], avoid: ["สีน้ำเงิน", "#2f6fd0"] },
  { key: 1, name: "วันจันทร์", short: "จันทร์", power: "พลังเสน่ห์นุ่มลึก", lucky: ["สีเขียว", "#2e9e5b"], money: ["สีม่วง", "#9d4edd"], avoid: ["สีแดง", "#e63946"] },
  { key: 2, name: "วันอังคาร", short: "อังคาร", power: "พลังนักสู้", lucky: ["สีม่วง", "#9d4edd"], money: ["สีส้ม", "#f77f00"], avoid: ["สีขาว/ครีม", "#efe7d3"] },
  { key: 3, name: "วันพุธ", short: "พุธ", power: "พลังการสื่อสาร", lucky: ["สีส้ม", "#f77f00"], money: ["สีน้ำตาล", "#9c6b3f"], avoid: ["สีชมพู", "#ff5d8f"] },
  { key: 4, name: "วันพฤหัสบดี", short: "พฤหัส", power: "พลังปัญญา", lucky: ["สีน้ำเงิน", "#2f6fd0"], money: ["สีแดง", "#e63946"], avoid: ["สีดำ", "#2b2f38"] },
  { key: 5, name: "วันศุกร์", short: "ศุกร์", power: "พลังเสน่ห์สังคม", lucky: ["สีเหลือง", "#f5c518"], money: ["สีชมพู", "#ff5d8f"], avoid: ["สีเทา", "#7d8894"] },
  { key: 6, name: "วันเสาร์", short: "เสาร์", power: "พลังความอึด", lucky: ["สีน้ำตาล", "#9c6b3f"], money: ["สีน้ำเงิน", "#2f6fd0"], avoid: ["สีเขียว", "#2e9e5b"] }
];

// 背景パレット(中心→外周の3色)。2026-09-07 に 4→10 へ拡張(ユーザー「背景も色々変えたい」)。暖色・寒色・深緑・ワイン等
export const PALETTES = [
  ["#2f2470", "#1a1440", "#0d0b26"], ["#1e3a5f", "#132a45", "#0a1626"],
  ["#4a1f5e", "#2a1240", "#120a24"], ["#2b2b60", "#1a1a3f", "#0c0c22"],
  ["#5a2a1a", "#331507", "#160903"], ["#1f4d3a", "#0f2e22", "#061710"],
  ["#5c1f3a", "#331021", "#170710"], ["#3a3a1f", "#22220f", "#101006"],
  ["#1f3f5c", "#0f2438", "#06121d"], ["#4a2f1a", "#2b1a0c", "#130b04"]
];
// 背景の飾り(CSS だけ。seed で選ぶ)。none / stars(星屑) / bokeh(光の玉) / rings(同心円) / rays(放射)
export const MOTIFS = ["none", "stars", "bokeh", "rings", "rays"];
export const motifCss = (m) => ({
  none: "",
  stars: `body::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,#fff9 1.5px,transparent 2px),radial-gradient(circle,#fff6 1px,transparent 1.6px),radial-gradient(circle,#f4c95d88 2px,transparent 2.6px);background-size:260px 340px,180px 220px,420px 520px;background-position:20px 40px,90px 160px,200px 80px;opacity:.55}`,
  bokeh: `body::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 15% 20%,#f4c95d22 0 90px,transparent 120px),radial-gradient(circle at 85% 35%,#ffffff18 0 70px,transparent 100px),radial-gradient(circle at 25% 78%,#ffffff14 0 110px,transparent 150px),radial-gradient(circle at 80% 85%,#f4c95d1c 0 80px,transparent 110px)}`,
  rings: `body::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-radial-gradient(circle at 50% 30%,#ffffff10 0 2px,transparent 2px 120px);opacity:.7}`,
  rays: `body::before{content:"";position:absolute;inset:-40%;pointer-events:none;background:conic-gradient(from 0deg at 50% 32%,#ffffff0d 0 6deg,transparent 6deg 24deg);opacity:.8}`
}[m] || "");

// ---------- キャラ(SVG) + アイドル動作(__seek は周期関数 = anim.mjs の loop モード用) ----------
export const CAT_SVG = `<svg id="cat" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
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
export const CAT_SCRIPT = `<script>
window.__seek=function(t){var TWO=Math.PI*2,br=Math.sin(t*TWO*2),sw=Math.sin(t*TWO);
 document.getElementById('head').setAttribute('transform','translate(0 '+(br*1.6).toFixed(2)+') rotate('+(sw*1.4).toFixed(2)+' 100 95)');
 var bl=(Math.abs(t-0.30)<0.028)||(Math.abs(t-0.76)<0.028);
 document.getElementById('eyesOpen').style.display=bl?'none':'block';document.getElementById('eyesClosed').style.display=bl?'block':'none';
 var g=document.getElementById('glow'); if(g) g.style.opacity=(0.72+0.28*Math.sin(t*TWO*2)).toFixed(3);
 document.getElementById('orb').setAttribute('transform','translate(100 168) scale('+(1+0.035*Math.sin(t*TWO*2+1)).toFixed(3)+') translate(-100 -168)');
 document.querySelectorAll('[data-pulse]').forEach(function(el,i){el.style.transform='scale('+(1+0.035*Math.sin(t*TWO*2+i*1.3)).toFixed(3)+')';});
};window.__seek(0);</script>`;
export const FONT = `<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700;800&family=Sarabun:wght@500;600&display=block" rel="stylesheet">`;
export const STAGE = `<div class="stage"><div id="glow"></div>${CAT_SVG}</div>`;

// パレット固定のページ関数を返す。page(catPx, bodyHtml, extraCss?)
export const makePage = (pal, motif = "none") => (cat, body, extraCss = "") => `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT}<style>
  ${motifCss(motif)}
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
  ${extraCss}
</style></head><body>${body}<div class="brand">🐱 ดวงดี๊ดี · duangdeedee.me · เพื่อความบันเทิง</div>${CAT_SCRIPT}</body></html>`;
