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
  { name: "magenta", bg: "radial-gradient(circle at 50% 30%, #ff9f43 0%, #e84393 38%, #3d0f5e 75%, #12042a 100%)", ink: "#fff", stroke: "#4a0a3a", glow: "#ff5d8f", accent: "#ffd54a", accentInk: "#3a1a00", fx: ["✨","⭐","💫","✦"], rays: true },
  { name: "thaigold", bg: "radial-gradient(circle at 50% 28%, #ffd166 0%, #e0453a 36%, #7a0f1f 72%, #1a0306 100%)", ink: "#fff7d6", stroke: "#4a0000", glow: "#ffb703", accent: "#ffd54a", accentInk: "#3a1a00", fx: ["✨","🌟","💛","✦"], rays: true },
  { name: "emerald", bg: "radial-gradient(circle at 50% 30%, #b8f2c9 0%, #2e9e5b 38%, #0b3d2e 74%, #041a12 100%)", ink: "#fff", stroke: "#06301f", glow: "#7ee8a2", accent: "#f4c95d", accentInk: "#2b2000", fx: ["🍀","✨","·","✦"], rays: false },
  { name: "sunrise", bg: "radial-gradient(circle at 50% 30%, #fff1c1 0%, #ffb4a2 36%, #b56576 70%, #3b2a4a 100%)", ink: "#3b1f3f", stroke: "#fff", glow: "#ffb4a2", accent: "#ff6f91", accentInk: "#fff", fx: ["🌸","✨","·","✦"], rays: false },
  { name: "ocean", bg: "radial-gradient(circle at 50% 30%, #9be7ff 0%, #2f6fd0 40%, #0b2a5b 74%, #050f24 100%)", ink: "#fff", stroke: "#08204a", glow: "#7cc7ff", accent: "#ffd54a", accentInk: "#3a1a00", fx: ["🫧","✨","·","✦"], rays: false },
  { name: "midnight", bg: null, ink: "#f5f2ff", stroke: "", glow: "#f4c95d", accent: "#f4c95d", accentInk: "#33260a", fx: ["✨","⭐","·","✦","·","✧"], rays: false }
];
export const themeFor = (seedNum) => THEMES[Math.abs(seedNum) % THEMES.length];

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
  <path id="tail" d="M128 172 q30 -6 26 -40" stroke="#5b4636" stroke-width="9" fill="none" stroke-linecap="round"/>
  <g id="orb"><circle cx="100" cy="168" r="24" fill="url(#orbg)"/><circle cx="93" cy="161" r="6" fill="rgba(255,255,255,0.75)"/></g>
  <defs><radialGradient id="orbg" cx="0.4" cy="0.35" r="1"><stop offset="0%" stop-color="#ffe9a8"/><stop offset="55%" stop-color="#f4c95d"/><stop offset="100%" stop-color="#c78f2d"/></radialGradient></defs>
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
// 締めカード用 QR (2026-09-08): コメント/キャプションの URL はリンクにならないので、スクショ→LINE/カメラで読める QR を最後の画面に置く(タイは QR 文化)
// 猫仕様 (ユーザー指示「おもろい QR」): 丸ドット + 丸角ファインダー + 中央に แม่หมอ の顔 + 枠に猫耳。誤り訂正 H(30%) で中央ロゴ分を吸収
// 生成: python3 (segno) → assets/qr-cat.svg (URL: https://duangdeedee.me/?s=qr)
const QR_SVG = (() => { try { return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "qr-cat.svg"), "utf8"); } catch { return ""; } })();
const CAT_STATIC = () => CAT_SVG.replace(/ id="/g, ' data-id="').replace('id="orbg"', 'id="orbg2"').replace('url(#orbg)', 'url(#orbg2)');   // id 重複回避(アイドル動作の対象にしない)
export const QR_BLOCK = QR_SVG ? `<div class="qrbox"><div class="qrframe">${QR_SVG}<div class="qrcat">${CAT_STATIC()}</div></div><div>สแกนไปหาแม่ 🐾</div></div>` : "";
export const withQR = (html) => QR_BLOCK ? html.replace('<div class="brand">', QR_BLOCK + '<div class="brand">') : html;
export const FONT = `<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700;800&family=Sarabun:wght@500;600&display=block" rel="stylesheet">`;
export const STAGE = `<div class="stage"><div id="glow"></div>${CAT_SVG}</div>`;

// パレット固定のページ関数を返す。page(catPx, bodyHtml, extraCss?)
export const makePage = (pal, motif = "none", theme = null) => (cat, body, extraCss = "") => { const T = theme || THEMES[THEMES.length - 1]; const vivid = !!T.bg; return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT}<style>
  ${motifCss(motif)}
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
  body{font-family:'Prompt',sans-serif;color:#f5f2ff;text-align:center;position:relative;display:flex;flex-direction:column;align-items:center;
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
  ${extraCss}
</style></head><body><script>window.__fxset=${JSON.stringify(T.fx)};</script>${body}<div class="brand">🐱 ดวงดี๊ดี · duangdeedee.me · เพื่อความบันเทิง</div>${CAT_SCRIPT}</body></html>`; };
