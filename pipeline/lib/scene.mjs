// DuangDee 動画の共通部品: 猫キャラ(SVG+アイドル動作)・ページ骨格・パレット・曜日データ・小道具
// gen-pick3.mjs(3択リビール) / gen-short.mjs(15秒ループ) から import する。
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
// 投稿枠: 夜(タイ19時)に出す動画は「明日の占い」。POST_SLOT=morning|evening で明示、未指定はバンコク時刻 14時以降を evening とみなす
//  targetDate(dateArg) → { iso, label } : dateArg 明示ならその日、無ければ evening=明日 / morning=今日。label は表紙チップ用
export function postSlot() {
  const env = (process.env.POST_SLOT || "").toLowerCase();
  if (env === "morning" || env === "evening") return env;
  const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })).getHours();
  return h >= 14 ? "evening" : "morning";
}
export function targetDate(dateArg) {
  const slot = postSlot();
  let iso = bkkIso(dateArg);
  if (!dateArg && slot === "evening") { const d = new Date(iso + "T12:00:00+07:00"); d.setUTCDate(d.getUTCDate() + 1); iso = d.toISOString().slice(0, 10); }
  return { iso, slot, label: slot === "evening" ? "ดวงพรุ่งนี้" : "ดวงวันนี้" };
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
// ---------- 見た目テーマ (2026-09-08 ユーザー指示「ランダムで見た目を変える」「絵面が地味」) ----------
// 動画ごとに seed で 1 つ選ぶ。midnight(従来の暗色) は 6 分の 1 に落とし、派手なテーマを主体にする
export const THEMES = [
  // noble (2026-09-08 ユーザー指定「神秘的で洗練されていて温かい、気品」): 深い紫紺/藍/ワイン + 古金 + クリーム、暖光、粒子・ボケ・ビネットの質感。絵文字なし
  { name: "noble-plum", noble: true, bg: "radial-gradient(120% 80% at 50% 20%, #3a1d5c 0%, #1c1030 45%, #0a0716 100%)", lights: ["#7a3bd8", "#c2497a"], ink: "#fff7ea", stroke: "", glow: "#b98a2f", accent: "#e0b34d", accentInk: "#2b1a00", fx: ["·", "✦", "·", "·", "✧", "·"], rays: false },
  { name: "noble-indigo", noble: true, bg: "radial-gradient(120% 80% at 50% 20%, #1f2b62 0%, #0f183a 45%, #05091a 100%)", lights: ["#3b5bd8", "#7a3bd8"], ink: "#fff7ea", stroke: "", glow: "#b98a2f", accent: "#e0b34d", accentInk: "#2b1a00", fx: ["·", "✦", "·", "·", "✧", "·"], rays: false },
  { name: "noble-wine", noble: true, bg: "radial-gradient(120% 80% at 50% 20%, #5a1c3a 0%, #2a0f22 45%, #12050e 100%)", lights: ["#c2497a", "#d8873b"], ink: "#fff7ea", stroke: "", glow: "#b98a2f", accent: "#e0b34d", accentInk: "#2b1a00", fx: ["·", "✦", "·", "·", "✧", "·"], rays: false },
  { name: "magenta", bg: "radial-gradient(circle at 50% 30%, #ff9f43 0%, #e84393 38%, #3d0f5e 75%, #12042a 100%)", ink: "#fff", stroke: "#4a0a3a", glow: "#ff5d8f", accent: "#ffd54a", accentInk: "#3a1a00", fx: ["✨","⭐","💫","✦"], rays: true },
  { name: "thaigold", bg: "radial-gradient(circle at 50% 28%, #ffd166 0%, #e0453a 36%, #7a0f1f 72%, #1a0306 100%)", ink: "#fff7d6", stroke: "#4a0000", glow: "#ffb703", accent: "#ffd54a", accentInk: "#3a1a00", fx: ["✨","🌟","💛","✦"], rays: true },
  { name: "emerald", bg: "radial-gradient(circle at 50% 30%, #b8f2c9 0%, #2e9e5b 38%, #0b3d2e 74%, #041a12 100%)", ink: "#fff", stroke: "#06301f", glow: "#7ee8a2", accent: "#f4c95d", accentInk: "#2b2000", fx: ["🍀","✨","·","✦"], rays: false },
  { name: "sunrise", bg: "radial-gradient(circle at 50% 30%, #fff1c1 0%, #ffb4a2 36%, #b56576 70%, #3b2a4a 100%)", ink: "#3b1f3f", stroke: "#fff", glow: "#ffb4a2", accent: "#ff6f91", accentInk: "#fff", fx: ["🌸","✨","·","✦"], rays: false },
  { name: "ocean", bg: "radial-gradient(circle at 50% 30%, #9be7ff 0%, #2f6fd0 40%, #0b2a5b 74%, #050f24 100%)", ink: "#fff", stroke: "#08204a", glow: "#7cc7ff", accent: "#ffd54a", accentInk: "#3a1a00", fx: ["🫧","✨","·","✦"], rays: false },
  { name: "midnight", bg: null, ink: "#f5f2ff", stroke: "", glow: "#f4c95d", accent: "#f4c95d", accentInk: "#33260a", fx: ["✨","⭐","·","✦","·","✧"], rays: false }
];
export const THEMES_ACTIVE = () => (process.env.DD_THEMES === "all" ? THEMES : THEMES.filter((t) => t.noble));   // 既定は noble 3種だけ(派手系は封印。DD_THEMES=all で復活)
export const themeFor = (seedNum) => { const A = THEMES_ACTIVE(); return A[Math.abs(seedNum) % A.length]; };

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
    <g id="earL"><polygon points="55,70 68,28 92,62" fill="#5b4636"/><polygon points="62,64 70,40 84,60" fill="#8a6f57"/></g>
    <g id="earR"><polygon points="145,70 132,28 108,62" fill="#5b4636"/><polygon points="138,64 130,40 116,60" fill="#8a6f57"/></g>
    <defs><radialGradient id="fur" cx="0.42" cy="0.35" r="0.75"><stop offset="0" stop-color="#fff7ea"/><stop offset="0.7" stop-color="#efdcc2"/><stop offset="1" stop-color="#d9c0a0"/></radialGradient><radialGradient id="muzzle" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#f6e7d2"/><stop offset="1" stop-color="#e2c9a8"/></radialGradient></defs><ellipse cx="100" cy="95" rx="52" ry="46" fill="url(#fur)"/><ellipse cx="82" cy="104" rx="9" ry="5" fill="#f2b8b8" opacity="0.5"/><ellipse cx="118" cy="104" rx="9" ry="5" fill="#f2b8b8" opacity="0.5"/><ellipse cx="100" cy="112" rx="24" ry="17" fill="url(#muzzle)"/>
    <g id="eyesOpen"><ellipse cx="80" cy="92" rx="6" ry="6.8" fill="#3b2a20"/><ellipse cx="120" cy="92" rx="6" ry="6.8" fill="#3b2a20"/>
      <circle cx="82.4" cy="89.6" r="2.2" fill="#fff"/><circle cx="122.4" cy="89.6" r="2.2" fill="#fff"/><circle cx="78.6" cy="94.6" r="1" fill="#fff" opacity="0.7"/><circle cx="118.6" cy="94.6" r="1" fill="#fff" opacity="0.7"/></g>
    <g id="eyesClosed" style="display:none"><path d="M72 92 q8 6 16 0" stroke="#5b4636" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M112 92 q8 6 16 0" stroke="#5b4636" stroke-width="4" fill="none" stroke-linecap="round"/></g>
    <path d="M97 106 q3 3 6 0" stroke="#c98b8b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M100 109 q0 6 -7 8 M100 109 q0 6 7 8" stroke="#5b4636" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <g stroke="#cbb79b" stroke-width="2.4" stroke-linecap="round"><line x1="42" y1="100" x2="66" y2="103"/><line x1="42" y1="112" x2="66" y2="110"/>
      <line x1="158" y1="100" x2="134" y2="103"/><line x1="158" y1="112" x2="134" y2="110"/></g>
  </g>
  <path id="tail" d="M128 172 q30 -6 26 -40" stroke="#5b4636" stroke-width="9" fill="none" stroke-linecap="round"/>
  <g id="orb"><circle cx="100" cy="168" r="30" fill="url(#orbGlow)"/><circle cx="100" cy="168" r="24" fill="url(#orbg)" stroke="#ffffff55" stroke-width="0.8"/><ellipse cx="92" cy="159" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 92 159)"/><circle cx="108" cy="178" r="2" fill="#fff" opacity="0.5"/></g>
  <defs><radialGradient id="orbg" cx="0.38" cy="0.32" r="0.9"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="18%" stop-color="#dcd0ff" stop-opacity="0.55"/><stop offset="55%" stop-color="#8a6ad8" stop-opacity="0.55"/><stop offset="100%" stop-color="#1d1040" stop-opacity="0.95"/></radialGradient><radialGradient id="orbGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="60%" stop-color="#b79cff" stop-opacity="0"/><stop offset="100%" stop-color="#b79cff" stop-opacity="0.55"/></radialGradient></defs>
  <ellipse cx="78" cy="160" rx="10" ry="8" fill="#f3e5cf"/><ellipse cx="122" cy="160" rx="10" ry="8" fill="#f3e5cf"/>
</svg>`;
export const CAT_SCRIPT = `<script>
window.__seek=function(t){var TWO=Math.PI*2,br=Math.sin(t*TWO*2),sw=Math.sin(t*TWO);
 var head=document.getElementById('head'); if(head) head.setAttribute('transform','translate(0 '+(br*3.2).toFixed(2)+') rotate('+(sw*3.0).toFixed(2)+' 100 95)');
 var bl=(Math.abs(t-0.30)<0.028)||(Math.abs(t-0.76)<0.028);
 var eo=document.getElementById('eyesOpen'),ec=document.getElementById('eyesClosed'); if(eo){eo.style.display=bl?'none':'block';ec.style.display=bl?'block':'none';}
 var g=document.getElementById('glow'); if(g) g.style.opacity=(0.72+0.28*Math.sin(t*TWO*2)).toFixed(3);
 var orb=document.getElementById('orb'); if(orb) orb.setAttribute('transform','translate(100 168) scale('+(1+0.06*Math.sin(t*TWO*2+1)).toFixed(3)+') translate(-100 -168)');
 var eL=document.getElementById('earL'),eR=document.getElementById('earR'); var tw=(t>0.52&&t<0.60)?Math.sin((t-0.52)/0.08*Math.PI)*14:0;
 if(eL) eL.setAttribute('transform','rotate('+(-tw).toFixed(1)+' 70 60)'); if(eR) eR.setAttribute('transform','rotate('+(tw*0.6).toFixed(1)+' 130 60)');
 var tail=document.getElementById('tail'); if(tail) tail.setAttribute('transform','rotate('+(Math.sin(t*TWO*1.5)*16).toFixed(1)+' 128 172)');
 document.querySelectorAll('[data-pulse]').forEach(function(el,i){el.style.transform='scale('+(1+0.05*Math.sin(t*TWO*2+i*1.3)).toFixed(3)+')';});
 // 文字の呼吸(見出し)・浮遊(サブ/チップ)・ケンバーンズ(舞台)
 document.querySelectorAll('h1').forEach(function(el){el.style.transform='scale('+(1+0.025*Math.sin(t*TWO)).toFixed(3)+') rotate('+(0.5*Math.sin(t*TWO+1)).toFixed(2)+'deg)';});
 document.querySelectorAll('.sub,.chip,.act,.tag').forEach(function(el,i){el.style.transform='translateY('+(6*Math.sin(t*TWO+i)).toFixed(1)+'px)';});
 var st=document.querySelector('.stage'); if(st&&!st.dataset.nokb) st.style.transform='scale('+(1+0.035*Math.sin(t*TWO)).toFixed(3)+')';
 // 光の粒: 上へ漂い、横に揺れ、瞬く(周期関数なのでループの継ぎ目が出ない)
 var fx=document.getElementById('fx'); if(!fx){fx=document.createElement('div');fx.id='fx';for(var k=0;k<26;k++){var sp=document.createElement('span');sp.className='fxp';var set=window.__fxset||['✨','⭐','·','✦','·','✧'];sp.textContent=set[k%set.length];fx.appendChild(sp);}document.body.appendChild(fx);}
 var ps=fx.children; for(var k=0;k<ps.length;k++){var ph=(k*0.618)%1;var y=((ph - t*0.35)%1+1)%1;var x=(k*137.5)%1080;var sz=18+(k*7)%30;var op=0.35+0.65*Math.abs(Math.sin((t+ph)*TWO));
  ps[k].style.left=(x+28*Math.sin((t+ph)*TWO)).toFixed(1)+'px';ps[k].style.top=(y*1920).toFixed(1)+'px';ps[k].style.fontSize=sz+'px';ps[k].style.opacity=op.toFixed(2);}
};window.__seek(0);</script>`;
// ---------- 実物写真の水晶玉 (2026-09-08 ユーザー「めっちゃリアルな水晶玉」) : assets/crystal-a.webp / crystal-b.webp (CC0, assets/CREDITS.md) ----------
const CRYSTAL = (n) => { try { return "data:image/webp;base64," + readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "assets", `crystal-${n}.webp`)).toString("base64"); } catch { return ""; } };
export const CRYSTAL_A = CRYSTAL("a"), CRYSTAL_B = CRYSTAL("b");
// 締めカード用 QR (2026-09-08): コメント/キャプションの URL はリンクにならないので、スクショ→LINE/カメラで読める QR を最後の画面に置く(タイは QR 文化)
// 猫仕様 (ユーザー指示「おもろい QR」): 丸ドット + 丸角ファインダー + 中央に แม่หมอ の顔 + 枠に猫耳。誤り訂正 H(30%) で中央ロゴ分を吸収
// 生成: python3 (segno) → assets/qr-cat.svg (URL: https://duangdeedee.me/?s=qr)
const QR_SVG = (() => { try { return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "qr-cat.svg"), "utf8"); } catch { return ""; } })();
const CAT_STATIC = () => CAT_SVG.replace(/ id="/g, ' data-id="').replace('id="orbg"', 'id="orbg2"').replace('url(#orbg)', 'url(#orbg2)');   // id 重複回避(アイドル動作の対象にしない)
export const QR_BLOCK = QR_SVG ? `<div class="qrbox"><div class="qrframe">${QR_SVG}<div class="qrcat">${CAT_STATIC()}</div></div><div>สแกนไปหาแม่ 🐾</div></div>` : "";
export const withQR = (html) => QR_BLOCK ? html.replace('<div class="brand">', QR_BLOCK + '<div class="brand">') : html;
// ---------- コールドオープン (2026-09-08 ユーザー「最初の1秒に命をかけているか」「最初にドーン！え！？」) ----------
// 最初のスライドの HTML をそのまま使い、0.9秒だけ「入り」を一度きり再生する短いカットを前置する:
//  白いフラッシュ → 画面いっぱいの一言(bang: 例「คุณนั่นแหละ!」)が3倍から叩き込まれて揺れる → 舞台のパンチイン → 猫の目が見開く
//  → 最後の15%で bang が消え、見出し(刺し文)が着地。続くループ・スライドの t=0 と同じ姿勢で終わるので継ぎ目が見えない
export const coldOpen = (slide, bang = "", sec = 0.9, soft = false) => {
  const big = bang ? `<div id="bang" style="position:absolute;left:40px;right:40px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;padding-bottom:0;box-sizing:border-box;text-align:center;z-index:8;pointer-events:none;font-family:'Prompt';font-weight:800;line-height:1.05;font-size:${[...bang].length <= 6 ? 210 : [...bang].length <= 12 ? 150 : 112}px;color:#fff;-webkit-text-stroke:5px #3a0a2a;text-shadow:0 0 30px #ffd54a,0 10px 0 #3a0a2a,0 18px 40px #0008">${bang}</div>` : "";
  const intro = `<div id="flash" style="position:absolute;inset:0;background:#fff;pointer-events:none;z-index:9"></div>${big}<script>document.addEventListener('DOMContentLoaded',function(){var base=window.__seek;window.__seek=function(t){base((t*${sec}/3)%1);
    var e=1-Math.pow(1-t,3);var hasBang=!!document.getElementById('bang');
    // 1コマ目 (t=0) = サムネ用ポスター: フラッシュ無し・一言は等倍・刺し文と装飾も表示。2コマ目からフラッシュ→叩き込み
    var poster=(t<0.02);
    var f=document.getElementById('flash'); if(f) f.style.opacity=poster?'0':Math.max(0,${soft ? 0.45 : 0.9}-(t-0.02)*5).toFixed(2);
    var st=document.querySelector('.stage'); if(st) st.style.transform='scale('+(poster?1:(${soft ? 1.14 : 1.3}-${soft ? 0.14 : 0.3}*e)).toFixed(3)+')';
    // 目の見開き(scale)は両目が離れて不気味だった(ユーザー指摘 2026-09-08) → 廃止。代わりに入り直後に一度だけ瞬き
    var eo=document.getElementById('eyesOpen'),ec=document.getElementById('eyesClosed'); if(eo&&ec){ var blink=(t>0.12&&t<0.2); eo.style.display=blink?'none':'block'; ec.style.display=blink?'block':'none'; eo.removeAttribute('transform'); }
    var b=document.getElementById('bang'); if(b){ var u=Math.min(1,(t-0.02)/0.22); var sc=3-2*(1-Math.pow(1-Math.max(0,u),3)); var sh=(t>0.24&&t<0.5)?Math.sin(t*90)*6:0; var out=t>0.82?Math.min(1,(t-0.82)/0.14):0;
      if(poster){ b.style.transform='scale(1) rotate(-6deg)'; b.style.opacity='1'; } else { b.style.transform='translate('+sh+'px,0) scale('+(sc*(1-0.6*out)).toFixed(3)+') rotate(-6deg)'; b.style.opacity=(u<1?Math.max(0,u):(1-out)).toFixed(2); } }
    document.querySelectorAll('h1').forEach(function(el){ if(poster){ el.style.opacity=hasBang?'0':'1'; el.style.transform='scale(1)'; return; } if(hasBang){ var v=Math.max(0,(t-0.8)/0.2); el.style.opacity=v.toFixed(2); el.style.transform='scale('+(1.35-0.35*v).toFixed(3)+')'; } else { el.style.transform='scale('+(t<0.55?(1.7-0.7*Math.min(1,t/0.55)):(0.98+0.02*Math.cos((t-0.55)/0.45*Math.PI)))+')'; el.style.opacity=Math.min(1,t/0.25).toFixed(2); } });
    document.querySelectorAll('.sub,.chip,.act,.tag,.orbs,.big').forEach(function(el){el.style.opacity=poster?'1':Math.min(1,Math.max(0,(t-0.7)/0.3)).toFixed(2);});
  };window.__seek(0);});</script>`;
  const html = slide.html.replace('<div class="brand">', intro + '<div class="brand">');
  return { html, seek: true, animSec: sec, dur: sec, noFadeIn: true, noFadeOut: true };
};
export const FONT = `<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700;800&family=Sarabun:wght@400;500;600&family=Mitr:wght@400;500;600&display=block" rel="stylesheet">`;
export const STAGE = `<div class="stage"><div id="glow"></div>${CAT_SVG}</div>`;

// パレット固定のページ関数を返す。page(catPx, bodyHtml, extraCss?)
export const makePage = (pal, motif = "none", theme = null) => (cat, body, extraCss = "") => { const T = theme || THEMES[THEMES.length - 1]; const vivid = !!T.bg && !T.noble; const noble = !!T.noble;
  const NOBLE_LAYERS = noble ? `<div class="nlight" style="left:-220px;top:80px;width:760px;height:760px;background:${T.lights[0]}"></div><div class="nlight" style="right:-260px;top:720px;width:820px;height:820px;background:${T.lights[1]}"></div><div class="nbokeh" style="left:110px;top:520px;width:90px;height:90px"></div><div class="nbokeh" style="left:870px;top:380px;width:60px;height:60px"></div><div class="nbokeh" style="left:760px;top:1520px;width:120px;height:120px;opacity:.6"></div><svg class="ngrain" xmlns="http://www.w3.org/2000/svg"><filter id="ng"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#ng)"/></svg><div class="nvignette"></div><div class="nframe"></div>` : "";
  if (noble) body = body.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/g, (m, at, inner) => `<h1${at}>${inner.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/gu, "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim()}</h1>`);   // noble: 見出しの絵文字を除く(気品)
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT}<style>
  ${motifCss(motif)}
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
  body{font-family:${noble ? "'Mitr'" : "'Prompt'"},sans-serif;color:#f5f2ff;text-align:center;position:relative;display:flex;flex-direction:column;align-items:center;
    background:${T.bg || `radial-gradient(circle at 50% 28%, ${pal[0]} 0%, ${pal[1]} 45%, ${pal[2]} 100%)`}}
  ${T.rays ? `body::after{content:"";position:absolute;inset:-40%;pointer-events:none;background:conic-gradient(from 0deg at 50% 32%,#ffffff14 0 6deg,transparent 6deg 22deg);opacity:.9}` : ""}
  .stage{position:relative;width:${cat}px;height:${cat}px;margin-top:140px;flex:none}
  #glow{position:absolute;inset:-8%;border-radius:50%;background:radial-gradient(circle, ${vivid ? "rgba(255,240,180,0.75)" : "rgba(244,201,93,0.30)"}, rgba(244,201,93,0) 62%)}
  ${vivid ? ".stage::after{content:\"\";position:absolute;inset:-4%;border-radius:50%;border:10px solid " + T.accent + ";box-shadow:0 0 50px " + T.accent + "aa;pointer-events:none}" : ""}
  #cat{position:relative;width:100%;height:100%;filter:drop-shadow(0 14px 44px rgba(244,201,93,0.35))}
  .brand{position:absolute;bottom:56px;left:0;right:0;font-size:32px;color:${vivid ? T.ink : "#ffffffbb"};font-weight:600;${vivid ? "text-shadow:0 2px 8px #0008" : ""}}
  #fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
  .fxp{position:absolute;color:#ffe9a8;text-shadow:0 0 12px #ffd54a;line-height:1;font-family:'Noto Color Emoji','Prompt'}
  h1,.sub,.chip,.act{position:relative;z-index:1;transform-origin:50% 50%}
  .stage{transform-origin:50% 60%;z-index:1}
  .qrbox{position:absolute;right:50px;bottom:126px;text-align:center;font-size:26px;color:#ffffffcc;font-weight:600}
  .qrframe{position:relative;width:300px;height:300px;margin:0 auto 8px;background:#fff;border-radius:22px;border:5px solid #f4c95d;box-shadow:0 0 40px #f4c95d55}
  .qrframe::before,.qrframe::after{content:"";position:absolute;top:-30px;width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:36px solid #f4c95d}
  .qrframe::before{left:18px;transform:rotate(-12deg)} .qrframe::after{right:18px;transform:rotate(12deg)}
  .qrframe>svg{position:absolute;inset:4px;width:calc(100% - 8px);height:calc(100% - 8px)}
  .qrcat{position:absolute;left:50%;top:50%;width:60px;height:60px;transform:translate(-50%,-52%)} .qrcat svg{width:100%;height:100%;display:block}
  h1{font-size:82px;font-weight:800;line-height:1.28;margin:36px 60px 0;white-space:pre-line;color:${T.ink};${vivid ? `-webkit-text-stroke:2.5px ${T.stroke};text-shadow:0 0 22px ${T.glow},0 5px 0 ${T.stroke},0 10px 26px #0007;` : ""}}
  .gold{color:${T.accent}${vivid ? `;-webkit-text-stroke:2.5px ${T.stroke}` : ""}}
  .sub{font-family:'Sarabun';font-size:46px;color:${vivid ? T.ink : "#f5f2ffd9"};line-height:1.55;margin:28px 90px 0;${vivid ? "font-weight:600;text-shadow:0 3px 12px #0009" : ""}}
  .orbs{display:flex;gap:56px;margin-top:64px}
  .orb{width:210px;height:210px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:800;color:#33260a;
    background:radial-gradient(circle at 38% 32%, #ffe9a8, #f4c95d 55%, #c78f2d);box-shadow:0 0 60px #f4c95d66}
  .big{width:300px;height:300px;border-radius:50%;margin-top:36px;box-shadow:0 0 90px color-mix(in srgb, var(--c) 55%, transparent);
    background:radial-gradient(circle at 38% 32%, #ffffffcc, var(--c) 58%, #00000055)}
  .chip{display:inline-block;margin-top:24px;padding:8px 36px;border-radius:999px;border:3px solid var(--c);color:var(--c);font-size:40px;font-weight:600;${vivid ? "background:#00000055;" : ""}}
  .msg{font-family:'Sarabun';font-size:46px;line-height:1.6;margin:30px 80px 0;color:${T.ink};${vivid ? "font-weight:600;text-shadow:0 3px 12px #0009" : ""}}
  .act{font-family:'Sarabun';font-size:38px;line-height:1.5;margin:26px 90px 0;color:${T.accent};${vivid ? "font-weight:700;text-shadow:0 2px 10px #0009" : ""}}
  ${noble ? `.nlight{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;pointer-events:none}
  .nbokeh{position:absolute;border-radius:50%;filter:blur(14px);background:radial-gradient(circle,#ffd98a 0%,#ffb84a55 60%,transparent 70%);pointer-events:none}
  .ngrain{position:absolute;inset:0;opacity:.10;mix-blend-mode:overlay;pointer-events:none}
  .nvignette{position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 45%, transparent 55%, #000 130%);pointer-events:none}
  .nframe{position:absolute;inset:44px;border:1px solid #d4af5e55;border-radius:28px;pointer-events:none}
  .stage::after{content:"";position:absolute;inset:-7%;border-radius:50%;background:conic-gradient(from 210deg,#7a5a1e,#f3d27a,#b98a2f,#fff1b8,#8a6420,#f3d27a,#7a5a1e);-webkit-mask:radial-gradient(circle,transparent 63%,#000 64%,#000 70%,transparent 71%);mask:radial-gradient(circle,transparent 63%,#000 64%,#000 70%,transparent 71%);filter:drop-shadow(0 0 16px #f3d27a66);pointer-events:none}
  #glow{background:radial-gradient(circle,#f3d27a44,transparent 60%)}
  #cat{filter:drop-shadow(0 24px 40px rgba(0,0,0,.55))}
  h1{font-family:'Mitr';font-weight:600;font-size:80px;line-height:1.3;color:#fff7ea;text-shadow:0 8px 30px rgba(0,0,0,.6)}
  .gold{background:linear-gradient(180deg,#fff1b8,#e0b34d 60%,#b98a2f);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{color:#e9dcc8;font-weight:400;text-shadow:0 3px 12px #0009}
  .msg{color:#fff3e0;font-weight:400;text-shadow:0 3px 12px #0009} .act{color:#e0b34d;font-weight:600;text-shadow:0 2px 10px #0009}
  .chip{border:1px solid #e0b34d99;color:#f3d27a;background:#00000044;font-family:'Sarabun';font-weight:500;letter-spacing:2px}
  .orb{background:url(${CRYSTAL_A}) center/cover;color:transparent;position:relative;box-shadow:0 0 70px #b79cff66,0 26px 50px rgba(0,0,0,.6),inset 0 0 0 1px #ffffff26}
  .orb::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.55) 0%, rgba(255,255,255,.12) 12%, transparent 26%)}
  .orb::after{content:attr(data-n);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Mitr';font-weight:500;font-size:96px;background:linear-gradient(180deg,#fff8e6,#f0d78a 55%,#c9a24a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(255,240,200,.95)) drop-shadow(0 4px 10px rgba(0,0,0,.7))}
  .orbs .orb:nth-child(2){filter:hue-rotate(200deg)} .orbs .orb:nth-child(3){filter:hue-rotate(300deg)}
  .big{background:url(${CRYSTAL_A}) center/cover;box-shadow:0 0 110px color-mix(in srgb, var(--c) 70%, transparent),0 30px 60px rgba(0,0,0,.6),inset 0 0 0 1px #ffffff26;position:relative}
  .big::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.6) 0%, rgba(255,255,255,.12) 12%, transparent 26%)}
  .brand{font-family:'Sarabun';font-size:26px;letter-spacing:3px;color:#d9c9a8aa;font-weight:500;text-shadow:none}
  .fxp{color:#f3d27a;text-shadow:0 0 10px #e0b34d;font-family:'Prompt'}
  .qrframe{border-color:#e0b34d;box-shadow:0 0 30px #e0b34d44} .qrframe::before,.qrframe::after{border-bottom-color:#e0b34d} .qrbox{color:#e9dcc8}` : ""}
  ${extraCss}
</style></head><body><script>window.__fxset=${JSON.stringify(T.fx)};</script>${NOBLE_LAYERS}${body}<div class="brand">🐱 ดวงดี๊ดี · duangdeedee.me · เพื่อความบันเทิง</div>${CAT_SCRIPT}</body></html>`; };
