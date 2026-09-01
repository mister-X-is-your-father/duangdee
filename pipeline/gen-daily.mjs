#!/usr/bin/env node
// DuangDee TikTok日次動画レシピ (動画化エンジンは ~/apps/kamishibai に分離)
// 使い方: node gen-daily.mjs [YYYY-MM-DD]  (省略時=バンコク時間の今日)
// 出力: out/YYYY-MM-DD/  daily.mp4 + caption.txt

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../../kamishibai/kamishibai.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));

// ---------- コンテンツ定義（サイト content.js と整合） ----------
const DAYS = [
  { name: "วันอาทิตย์", color: "สีแดง", hex: "#e63946", accent: "#ffb4a2" },
  { name: "วันจันทร์", color: "สีเหลือง", hex: "#f4a261", accent: "#ffe8b0" },
  { name: "วันอังคาร", color: "สีชมพู", hex: "#ff5d8f", accent: "#ffc2d4" },
  { name: "วันพุธ", color: "สีเขียว", hex: "#2a9d8f", accent: "#b7f0e3" },
  { name: "วันพฤหัสบดี", color: "สีส้ม", hex: "#f77f00", accent: "#ffd166" },
  { name: "วันศุกร์", color: "สีฟ้า", hex: "#4895ef", accent: "#bde0fe" },
  { name: "วันเสาร์", color: "สีม่วง", hex: "#9d4edd", accent: "#e0aaff" }
];

// ランク帯別のひとこと運勢（ポジティブ・クッション必須 / 不安を煽らない）
const TIER_TOP = [
  "ดวงพุ่งสุดในรอบเดือน! เรื่องที่รอคำตอบจะมาแบบเซอร์ไพรส์",
  "แม่เหล็กดูดโชคทำงานเต็มพิกัด มีข่าวดีเข้ามาไม่ทันตั้งตัว",
  "เสน่ห์แรงเกินต้าน ใครเห็นก็เอ็นดู งานรักปังพร้อมกัน",
  "จังหวะทองของคุณมาถึงแล้ว กล้าขอ กล้าเสนอ ได้แน่"
];
const TIER_MID = [
  "ดวงนิ่งแบบมีลุ้น ทำอะไรวันนี้ราบรื่นกว่าที่คิด",
  "มีคนคอยช่วยอยู่ข้าง ๆ แบบเงียบ ๆ งานเดินหน้าได้สวย",
  "โชคเล็ก ๆ กระจายทั้งวัน ของกินฟรีหรือส่วนลดกำลังมา",
  "พลังกำลังชาร์จขึ้นเรื่อย ๆ เย็นนี้มีเรื่องให้ยิ้ม"
];
const TIER_LOW = [
  "วันนี้ดวงขอพักเครื่อง ใจเย็น ๆ แล้วพรุ่งนี้จะกลับมาแรง",
  "ชิลล์ ๆ เข้าไว้ อย่าเพิ่งรีบตัดสินใจเรื่องใหญ่ เดี๋ยวดวงหนุนตามมา",
  "เก็บแรงไว้ก่อน วันนี้เหมาะกับพักผ่อนและตามใจตัวเอง",
  "ดวงเบา ๆ แต่ไม่แย่นะ ทำของโปรดกินอุ่น ๆ แล้วทุกอย่างจะดีเอง"
];

// ---------- エンジン ----------
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
const bkkNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
const target = dateArg ? new Date(dateArg + "T12:00:00") : bkkNow;
const iso = target.toISOString().slice(0, 10);
const thDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok"
}).format(target);

const seed = cyrb53("daily-" + iso);
// 決定論的シャッフルで7曜日のランキングを作る
const order = DAYS.map((d, i) => ({ d, k: cyrb53(iso + "#" + i) })).sort((a, b) => a.k - b.k).map(x => x.d);
const rank = order; // rank[0]=1位
const lucky = String(seed % 100).padStart(2, "0");
const pick = (pool, salt) => pool[cyrb53(iso + salt) % pool.length];

const blurb = (r) => r === 0 ? pick(TIER_TOP, "t" + r) : r <= 3 ? pick(TIER_MID, "m" + r) : pick(TIER_LOW, "l" + r);

// ---------- スライドHTML ----------
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700;800&family=Sarabun:wght@500;600&display=block" rel="stylesheet">`;
const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1920px; overflow:hidden; font-family:'Prompt',sans-serif; color:#f5f2ff;
    background: radial-gradient(circle at 50% -10%, #241b5e, #0d0b26 62%); display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; padding:70px; position:relative; }
  .stars { position:absolute; inset:0; background-image:
    radial-gradient(2px 2px at 12% 20%, #fff8, transparent 60%), radial-gradient(2px 2px at 78% 12%, #fff7, transparent 60%),
    radial-gradient(3px 3px at 88% 44%, #f4c95d99, transparent 60%), radial-gradient(2px 2px at 22% 70%, #fff6, transparent 60%),
    radial-gradient(2px 2px at 60% 85%, #f4c95d88, transparent 60%), radial-gradient(2px 2px at 40% 40%, #fff5, transparent 60%); }
  .brand { position:absolute; bottom:56px; left:0; right:0; font-size:34px; color:#ffffff88; font-weight:600; }
  .cat { font-size:120px; line-height:1; }
  h1 { font-size:88px; font-weight:800; line-height:1.3; }
  .gold { color:#f4c95d; }
  .chip { display:inline-block; border:3px solid #f4c95d; color:#f4c95d; border-radius:999px; padding:8px 42px; font-size:40px; font-weight:600; margin-top:28px; }
  .rankrow { display:flex; align-items:center; gap:36px; background:#ffffff12; border:2px solid #ffffff22; border-radius:28px;
    padding:34px 44px; margin-top:34px; width:100%; text-align:left; }
  .rankno { font-size:64px; font-weight:800; color:#f4c95d; min-width:110px; }
  .rankday { font-size:54px; font-weight:700; }
  .rankblurb { font-family:'Sarabun'; font-size:38px; color:#f5f2ffcc; line-height:1.55; margin-top:6px; }
  .dot { display:inline-block; width:40px; height:40px; border-radius:50%; vertical-align:middle; margin-right:16px; border:3px solid #fff5; }
  .big1 { font-size:150px; font-weight:800; line-height:1.2; }
  .lucky { font-size:230px; font-weight:800; color:#f4c95d; text-shadow:0 0 80px #f4c95d66; }
`;
const page = (inner) => `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT}<style>${BASE_CSS}</style></head>
<body><div class="stars"></div>${inner}<div class="brand">🐱 ดวงดี DuangDee · เพื่อความบันเทิง</div></body></html>`;

const rowHtml = (i) => {
  const d = rank[i];
  return `<div class="rankrow"><div class="rankno">${i + 1}</div>
    <div><div class="rankday"><span class="dot" style="background:${d.hex}"></span>${d.name}</div>
    <div class="rankblurb">${blurb(i)}</div></div></div>`;
};

const slides = [
  { // S1 hook
    html: page(`<div class="cat">🐱🔮</div><h1>ดวงประจำวัน<br><span class="gold">${thDate}</span><br>เกิดวันไหน<span class="gold">ปังสุด?</span></h1><div class="chip">น้องดวงดีจัดอันดับให้แล้ว!</div>`),
    tts: `สวัสดีค่ะ น้องดวงดีมาแล้ว ดวงประจำวันที่ ${thDate} วันเกิดไหนจะปังที่สุด มาดูกันเลยค่ะ`
  },
  { // S2 อันดับ 7-6
    html: page(`<h1>อันดับ <span class="gold">7 – 6</span></h1>${rowHtml(6)}${rowHtml(5)}`),
    tts: `อันดับเจ็ด คนเกิด${rank[6].name} ${blurb(6)} อันดับหก คนเกิด${rank[5].name} ${blurb(5)}`
  },
  { // S3 อันดับ 5-4
    html: page(`<h1>อันดับ <span class="gold">5 – 4</span></h1>${rowHtml(4)}${rowHtml(3)}`),
    tts: `อันดับห้า คนเกิด${rank[4].name} ${blurb(4)} อันดับสี่ คนเกิด${rank[3].name} ${blurb(3)}`
  },
  { // S4 อันดับ 3-2
    html: page(`<h1>อันดับ <span class="gold">3 – 2</span></h1>${rowHtml(2)}${rowHtml(1)}`),
    tts: `อันดับสาม คนเกิด${rank[2].name} ${blurb(2)} และอันดับสอง คนเกิด${rank[1].name} ${blurb(1)}`
  },
  { // S5 อันดับ 1 + เลข
    html: page(`<h1>อันดับ <span class="gold">1</span> วันนี้คือ...</h1>
      <div class="big1" style="color:${rank[0].hex}">${rank[0].name}!</div>
      <div class="rankblurb" style="font-size:44px; margin-top:20px">${blurb(0)}</div>
      <div class="chip" style="margin-top:60px">เลขนำโชควันนี้</div><div class="lucky">${lucky}</div>`),
    tts: `และอันดับหนึ่งวันนี้ คือคนเกิด${rank[0].name} ค่ะ ${blurb(0)} เลขนำโชควันนี้คือ ${lucky.split("").join(" ")} ค่ะ`
  },
  { // S6 CTA
    html: page(`<div class="cat">🐱✨</div><h1>อยากรู้ดวง<span class="gold">เจาะลึก</span><br>ของคุณ?</h1>
      <div class="rankblurb" style="font-size:46px; margin-top:30px">ความรัก การงาน การเงิน<br>เลขนำโชคเฉพาะคุณ + วอลเปเปอร์เสริมดวง</div>
      <div class="chip" style="margin-top:56px; font-size:48px; padding:18px 56px">ดูฟรี! ลิงก์ในไบโอ</div>`),
    tts: `อยากรู้ดวงเจาะลึกของคุณ ทั้งความรัก การงาน การเงิน กดลิงก์ในไบโอ ดูฟรีเลยค่ะ เมี๊ยว`
  }
];

// ---------- 生成 (kamishibaiに委譲) ----------
const outDir = join(ROOT, "out", iso);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log(`[gen-daily] ${iso} (${thDate}) — 1位:${rank[0].name} 運番:${lucky}`);
const outMp4 = render({
  out: join(outDir, "daily.mp4"),
  size: [1080, 1920],
  voice: "th-TH-PremwadeeNeural",
  rate: "+8%",
  slides
});

const caption = `ดวงประจำวันที่ ${thDate} 🔮 เกิดวันไหนปังสุด? เลขนำโชควันนี้ ${lucky} ✨ ดูดวงเจาะลึกของคุณฟรีที่ลิงก์ในไบโอ 🐱
#ดูดวง #สายมู #ดวงรายวัน #ดวงประจำวัน #เลขนำโชค #มูเตลู #ดูดวงฟรี #fyp`;
writeFileSync(join(outDir, "caption.txt"), caption);
console.log(`[gen-daily] ✅ ${outMp4}`);
