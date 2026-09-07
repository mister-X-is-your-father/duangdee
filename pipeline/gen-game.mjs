#!/usr/bin/env node
// DuangDee TikTok ゲーム型ジェネレータ — 「最後まで見る理由」を構造で作る (2026-09-08, ユーザー案)
// 使い方: node gen-game.mjs <find|zoom|quiz> [YYYY-MM-DD]
//  find : หาของซ่อน — 10秒で5つ探す → 答え合わせ → 「最初に見つけた物 = 今日のラッキーアイテム」 → 「いくつ見つけた?」(1語コメント)
//  zoom : ทายสิ ส่วนไหนของแม่ — 猫の一部を超拡大から引いていく(ベクタなので鮮明) → 正体+意味 → 「何秒で分かった?」
//  quiz : ทายสี — 「〇曜日生まれが避ける色は?」3択+カウントダウン → 正解+理由 → 「当たった?」
// 共通: 答えは必ず最後(完走の理由)。画面の情報量を多めにして一時停止/巻き戻し(視聴時間)を誘う。数字(เลขเด็ด)は出さない
// 環境: GAME_DRY=1(文字数だけ) GAME_SUFFIX=-x(出力フォルダ接尾) TTS_ENGINE/BOTNOI_SPEAKER は他と同じ
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAnimated } from "../../kamishibai/anim.mjs";
import { loadEnv, cyrb53, bkkIso, thDate, dowOf, DAYS, PALETTES, MOTIFS, STAGE, makePage } from "./lib/scene.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
loadEnv(ROOT);
const TYPES = ["find", "zoom", "quiz"];
const type = TYPES.includes(process.argv[2]) ? process.argv[2] : "find";
const iso = bkkIso(TYPES.includes(process.argv[2]) ? process.argv[3] : process.argv[2]);
const seed = (salt) => cyrb53(iso + "|" + type + "|" + salt);
const pick = (pool, salt) => pool[seed(salt) % pool.length];
const rnd = (salt) => (seed(salt) % 10000) / 10000;
const pal = pick(PALETTES, "pal"), motif = pick(MOTIFS, "motif");
const page = makePage(pal, motif);
const SPEED = { fast: 1.12, warm: 1.0 };

// __seek(t) に自前アニメを合成する(CAT_SCRIPT が body 末尾で __seek を定義するので DOMContentLoaded 後にラップ)
const ANIM = (fnBody) => `<script>document.addEventListener('DOMContentLoaded',function(){var base=window.__seek;window.__seek=function(t){base(t);(function(t){${fnBody}})(t);};window.__seek(0);});</script>`;
const ease = "var e=1-Math.pow(1-t,3);";   // ease-out

// ---------- 小道具(絵文字=Noto Color Emoji で即グラフィカル) ----------
const ITEMS = [
  { e: "🪙", th: "เหรียญ", lucky: "เหรียญในกระเป๋า", line: "เงินก้อนเล็กกำลังหาทางมา" },
  { e: "🦋", th: "ผีเสื้อ", lucky: "ของสีฟ้า", line: "มีคนคิดถึงลูกอยู่เงียบ ๆ" },
  { e: "🔑", th: "กุญแจ", lucky: "พวงกุญแจ", line: "ประตูที่คิดว่าปิด กำลังจะเปิด" },
  { e: "🌸", th: "ดอกไม้", lucky: "ของสีชมพู", line: "เสน่ห์ขึ้นแบบไม่ต้องพยายาม" },
  { e: "🐟", th: "ปลา", lucky: "ของสีเงิน", line: "งานที่รอ ว่ายเข้ามาหาเอง" },
  { e: "🍀", th: "ใบโคลเวอร์", lucky: "ของสีเขียว", line: "วันนี้ดวงดีทั้งวัน ใช้ให้คุ้ม" },
  { e: "🕯️", th: "เทียน", lucky: "แสงอุ่น ๆ", line: "คำตอบที่รอ จะชัดขึ้นคืนนี้" },
  { e: "🎀", th: "โบว์", lucky: "ริบบิ้น", line: "ของขวัญเล็ก ๆ กำลังมาถึง" },
  { e: "🌙", th: "พระจันทร์", lucky: "ของสีเงิน", line: "พักบ้าง แล้วเรื่องจะคลี่เอง" },
  { e: "🧧", th: "ซองแดง", lucky: "ของสีแดง", line: "โชคลาภจากคนใกล้ตัว" }
];
const CLUTTER = ["✨", "⭐", "🌙", "🍃", "💫", "🫧", "☁️", "🌿"];

// ---------- 表紙(1フレーム目=サムネ) ----------
const cover = (title, sub) => ({ html: page(420, `${STAGE}<div class="chip" style="--c:#f4c95d;margin-top:4px">ดวงวันนี้ · ${thDate(iso)}</div><h1 style="font-size:110px;margin-top:18px">${title}</h1><div class="sub" style="font-size:54px;color:#fff">${sub}</div>`), dur: 0.45, noFadeIn: true });

let slides, caption, meta;

// =====================================================================
if (type === "find") {
  // 今日の5つ + 配置(猫の周りを避ける)
  const items = ITEMS.map((it, i) => ({ it, k: seed("i" + i) })).sort((a, b) => a.k - b.k).slice(0, 5).map((x) => x.it);
  const W = 1080, TOP = 470, H = 1180;          // シーン領域(ヘッダの下)
  const cat = { x: 340, y: 380, s: 400 };        // 猫の位置/サイズ(シーン内座標)
  const placed = [];
  const okPos = (x, y) => {
    if (x > cat.x - 60 && x < cat.x + cat.s + 20 && y > cat.y - 60 && y < cat.y + cat.s + 20) return false;
    return placed.every((p) => Math.hypot(p.x - x, p.y - y) > 170);
  };
  items.forEach((it, i) => {
    let x, y, tries = 0;
    do { x = 40 + rnd("x" + i + tries) * (W - 160); y = 20 + rnd("y" + i + tries) * (H - 160); tries++; } while (!okPos(x, y) && tries < 60);
    placed.push({ x, y, it, rot: Math.round((rnd("r" + i) - 0.5) * 50), size: 62 + Math.round(rnd("s" + i) * 20), op: 0.72 + rnd("o" + i) * 0.2 });
  });
  const clutter = Array.from({ length: 40 }, (_, i) => ({ e: CLUTTER[seed("c" + i) % CLUTTER.length], x: rnd("cx" + i) * (W - 80), y: rnd("cy" + i) * (H - 80), size: 34 + Math.round(rnd("cs" + i) * 50), op: 0.14 + rnd("co" + i) * 0.16, rot: Math.round((rnd("cr" + i) - 0.5) * 60) }));
  const sceneCss = `.scene{position:absolute;left:0;top:${TOP}px;width:${W}px;height:${H}px;overflow:hidden}
    .scene .stage{position:absolute;left:${cat.x}px;top:${cat.y}px;width:${cat.s}px;height:${cat.s}px;margin:0}
    .it{position:absolute;line-height:1;font-family:'Noto Color Emoji';}
    .ring{position:absolute;width:150px;height:150px;border:8px solid #f4c95d;border-radius:50%;box-shadow:0 0 30px #f4c95d99;display:flex;align-items:flex-end;justify-content:center}
    .ring b{position:absolute;right:-30px;bottom:-30px;background:#f4c95d;color:#33260a;border-radius:999px;padding:2px 22px;font-size:40px;box-shadow:0 0 16px #0008}
    .bar{position:absolute;left:90px;right:90px;top:400px;height:22px;border-radius:999px;background:#ffffff22;overflow:hidden}
    .bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#f4c95d,#ff9a5c);border-radius:999px}
    #cd{position:absolute;right:90px;top:322px;font-size:64px;font-weight:800;color:#f4c95d}
    .list{position:absolute;left:70px;right:70px;top:560px;text-align:left}
    .row{display:flex;align-items:center;gap:26px;margin:0 0 30px;font-family:'Sarabun';font-size:40px;line-height:1.35}
    .row .e{font-size:84px;line-height:1;font-family:'Noto Color Emoji'} .row b{color:#f4c95d;font-family:'Prompt';font-size:44px}`;
  const sceneHtml = (withRings) => `<div class="scene">${clutter.map((c) => `<span class="it" style="left:${c.x}px;top:${c.y}px;font-size:${c.size}px;opacity:${c.op.toFixed(2)};transform:rotate(${c.rot}deg)">${c.e}</span>`).join("")}${STAGE}${placed.map((p) => `<span class="it" style="left:${p.x}px;top:${p.y}px;font-size:${p.size}px;opacity:${p.op.toFixed(2)};transform:rotate(${p.rot}deg)">${p.it.e}</span>`).join("")}${withRings ? placed.map((p, i) => `<div class="ring" style="left:${p.x + p.size / 2 - 75}px;top:${p.y + p.size / 2 - 75}px"><b>${i + 1}</b></div>`).join("") : ""}</div>`;
  const header = (t1, t2 = "") => `<h1 style="font-size:70px;margin-top:60px">${t1}</h1>${t2 ? `<div class="sub" style="font-size:40px;margin-top:8px">${t2}</div>` : ""}`;
  slides = [
    cover("หาให้เจอ 5 อย่าง 👀", "ของที่เห็นก่อน = ของนำโชควันนี้"),
    { html: page(1, `${header("ของที่ลูกเห็นก่อน 👀\n= ของนำโชคของลูกวันนี้", "มี 5 อย่างซ่อนอยู่ในห้องแม่")}${sceneHtml(false)}`, sceneCss), tts: "ของที่ลูกเห็นก่อน คือของนำโชคของลูกวันนี้… มีห้าอย่างซ่อนอยู่ในห้องแม่ หาให้เจอนะ", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(1, `${header("หาให้เจอ 5 อย่าง ⏳", "หยุดวิดีโอได้นะ แม่ไม่ว่า")}<div id="cd">10</div><div class="bar"><i id="barfill"></i></div>${sceneHtml(false)}${ANIM("document.getElementById('barfill').style.width=((1-t)*100).toFixed(1)+'%';document.getElementById('cd').textContent=Math.max(0,Math.ceil(10*(1-t)));")}`, sceneCss), dur: 10, seek: true, animSec: 10 },
    { html: page(1, `${header("เฉลย ✨", "อยู่ตรงนี้ทั้ง 5 อย่าง")}${sceneHtml(true)}`, sceneCss), tts: "เฉลย… อยู่ตรงนี้ทั้งห้าอย่าง… เจอกี่อย่างลูก", seek: true, loop: 3, hold: 0.3 },
    { html: page(1, `${header("เจออะไรก่อน? 🐾", "นั่นคือของนำโชคของลูกวันนี้")}<div class="list">${placed.map((p, i) => `<div class="row"><span class="e">${p.it.e}</span><div><b>${i + 1}. ${p.it.th}</b> · ${p.it.lucky}<br>${p.it.line}</div></div>`).join("")}</div>`, sceneCss), tts: "เจอครบห้า… วันนี้ตาแหลม อย่าปล่อยโอกาสหลุดมือนะ… เจอสามสี่… ดวงดี แต่ใจลูกยังวอกแวกอยู่… เจอแค่หนึ่งสอง… ไม่ใช่ตาไม่ดี แต่ใจลูกอยู่ที่อื่น… พักบ้างนะ", seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>เจอกี่อย่าง? 😼\nบอกแม่หน่อย</h1><div class="sub">ส่งให้เพื่อนลองหาดู 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "เจอกี่อย่าง บอกแม่… แล้วส่งให้เพื่อนลองหาดูนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `หาให้เจอ 5 อย่างใน 10 วิ 👀 ของที่ลูกเห็นก่อน = ของนำโชคของลูกวันนี้ (${items.map((i) => i.e).join("")}) เจอกี่อย่าง? บอกแม่ในคอมเมนต์ แล้วส่งให้เพื่อนลองหา 🐾 สีมงคลตามวันเกิด → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #หาของ #เกมทายใจ`;
  meta = { items: items.map((i) => i.th) };
}

// =====================================================================
if (type === "zoom") {
  // 猫の一部(viewBox 200x200 の座標)。ベクタなので何倍に拡大しても鮮明
  const PARTS = [
    { key: "ตา", x: 80, y: 92, th: "ตาของแม่ 👀", line: "แม่เห็นทุกอย่างนะลูก… วันนี้ระวังคนพูดไม่ตรงกับใจ", lucky: "ของสีน้ำเงิน" },
    { key: "จมูก", x: 100, y: 106, th: "จมูกของแม่ 🐽", line: "ลูกสัมผัสได้ก่อนคนอื่น… วันนี้เชื่อสัญชาตญาณตัวเอง", lucky: "กลิ่นหอมที่ชอบ" },
    { key: "หู", x: 68, y: 40, th: "หูของแม่ 👂", line: "วันนี้ฟังให้มาก พูดให้น้อย… แล้วจะได้ยินสิ่งที่ใช่", lucky: "เพลงโปรด 1 เพลง" },
    { key: "ลูกแก้ว", x: 100, y: 168, th: "ลูกแก้วของแม่ 🔮", line: "โชคก้อนใหญ่กำลังเรืองแสง… อย่าเพิ่งยอมแพ้", lucky: "ของสีทอง" },
    { key: "หนวด", x: 50, y: 106, th: "หนวดของแม่ 〰️", line: "ลูกไวกว่าที่คิด… โอกาสมาแบบเงียบ ๆ จับให้ทัน", lucky: "ของสีขาว" },
    { key: "อุ้งเท้า", x: 78, y: 160, th: "อุ้งเท้าของแม่ 🐾", line: "เดินเบา ๆ แต่ไปถึงแน่… วันนี้ไม่ต้องรีบ", lucky: "รองเท้าคู่โปรด" }
  ];
  const part = pick(PARTS, "part");
  const S = 900;                                   // 猫の表示サイズ
  const zoomCss = `.zoomwrap{position:absolute;left:${(1080 - S) / 2}px;top:520px;width:${S}px;height:${S}px}
    .zoomwrap .stage{margin:0;width:${S}px;height:${S}px;transform-origin:${(part.x / 200 * S).toFixed(0)}px ${(part.y / 200 * S).toFixed(0)}px}
    #cd{position:absolute;right:90px;top:440px;font-size:64px;font-weight:800;color:#f4c95d}
    .qmark{position:absolute;left:0;right:0;top:1500px;font-size:120px}`;
  const zoomAnim = ANIM(`${ease}var s=16-15*e;document.querySelector('.zoomwrap .stage').style.transform='scale('+s.toFixed(3)+')';document.getElementById('cd').textContent=Math.max(0,Math.ceil(8*(1-t)));`);
  slides = [
    cover("ทายสิ นี่คืออะไร 👀", "ส่วนไหนของแม่หมอดีดี?"),
    { html: page(1, `<h1 style="font-size:78px;margin-top:70px">ทายสิ… นี่คืออะไร 👀</h1><div class="sub" style="font-size:40px">ส่วนไหนของแม่ · ทายถูกตอนกี่วิ?</div><div id="cd">8</div><div class="zoomwrap">${STAGE}</div><div class="qmark">❓</div>${zoomAnim}`, zoomCss), tts: "ทายสิ… นี่คือส่วนไหนของแม่… ใครทายถูกก่อน แม่ให้ดาว", seek: true, animSec: 8, dur: 9, hold: 0, botnoiSpeed: SPEED.fast },
    { html: page(560, `${STAGE}<h1 style="font-size:84px">${part.th}</h1><div class="msg">${part.line}</div><div class="act">🐾 ของนำโชควันนี้: ${part.lucky}</div>`), tts: `เฉลย… ${part.th.replace(/[^฀-๿\s]/g, "").trim()}… ${part.line}… ของนำโชคของลูกวันนี้ คือ ${part.lucky}`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>ทายถูกตอนกี่วิ? 😼\nบอกแม่หน่อย</h1><div class="sub">พรุ่งนี้แม่ซ่อนส่วนใหม่ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ทายถูกตอนกี่วิ บอกแม่หน่อย… พรุ่งนี้แม่ซ่อนส่วนใหม่นะ", seek: true, loop: 3, hold: 0.3 }
  ];
  // zoom スライドは TTS 付きだが尺は動きの 8 秒に合わせたい → tts があると dur は音声長+hold になる仕様。音声が短ければ animSec で動きが前倒し
  caption = `ทายสิ… นี่คือส่วนไหนของแม่หมอดีดี 👀 ทายถูกตอนกี่วิ? บอกแม่ในคอมเมนต์ 🐾 เฉลยท้ายคลิป + ของนำโชคของลูกวันนี้ · duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #ทายสิ #เกมทายใจ`;
  meta = { part: part.key };
}

// =====================================================================
if (type === "quiz") {
  const day = DAYS[seed("day") % 7];
  const wrong = DAYS.filter((d) => d.avoid[0] !== day.avoid[0] && d.lucky[0] !== day.avoid[0]).map((d) => d.lucky).filter((c, i, a) => a.findIndex((x) => x[0] === c[0]) === i);
  const choices = [day.avoid, wrong[seed("w1") % wrong.length], wrong[(seed("w2") % (wrong.length - 1)) + 1]].filter((c, i, a) => a.findIndex((x) => x[0] === c[0]) === i).slice(0, 3);
  while (choices.length < 3) choices.push(wrong[choices.length]);
  const order = [0, 1, 2].sort((a, b) => seed("o" + a) - seed("o" + b));
  const shown = order.map((i) => choices[i]);
  const ansIdx = shown.findIndex((c) => c[0] === day.avoid[0]);
  const quizCss = `.opts{position:absolute;left:80px;right:80px;top:1010px}
    .opt{display:flex;align-items:center;gap:30px;margin:0 0 26px;padding:18px 30px;border-radius:28px;background:#ffffff14;border:3px solid #ffffff22;font-size:54px;font-weight:700}
    .opt .sw{width:84px;height:84px;border-radius:50%;flex:none;box-shadow:0 0 30px #0006}
    .opt.ok{background:#f4c95d22;border-color:#f4c95d;box-shadow:0 0 40px #f4c95d66}
    .opt.ng{opacity:.35}
    .bar{position:absolute;left:90px;right:90px;top:960px;height:22px;border-radius:999px;background:#ffffff22;overflow:hidden}
    .bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#f4c95d,#ff9a5c)}
    #cd{position:absolute;right:90px;top:880px;font-size:64px;font-weight:800;color:#f4c95d}`;
  const optsHtml = (reveal) => `<div class="opts">${shown.map((c, i) => `<div class="opt ${reveal ? (i === ansIdx ? "ok" : "ng") : ""}"><span class="sw" style="background:${c[1]}"></span><span>${i + 1}. ${c[0]}</span>${reveal && i === ansIdx ? "<span style='margin-left:auto'>✅</span>" : ""}</div>`).join("")}</div>`;
  const q = `คน${day.name}\nห้ามใส่สีอะไร? 🚫`;
  slides = [
    cover(`ทายสี 🎨`, `คน${day.name} ห้ามใส่สีอะไร?`),
    { html: page(420, `${STAGE}<h1 style="font-size:74px">${q}</h1>${optsHtml(false)}`, quizCss), tts: `ทายสิ… คน${day.name} ห้ามใส่สีอะไร… หนึ่ง ${shown[0][0]}… สอง ${shown[1][0]}… สาม ${shown[2][0]}`, seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(420, `${STAGE}<h1 style="font-size:74px">${q}</h1><div id="cd">5</div><div class="bar"><i id="barfill"></i></div>${optsHtml(false)}${ANIM("document.getElementById('barfill').style.width=((1-t)*100).toFixed(1)+'%';document.getElementById('cd').textContent=Math.max(0,Math.ceil(5*(1-t)));")}`, quizCss), dur: 5, seek: true, animSec: 5 },
    { html: page(420, `${STAGE}<h1 style="font-size:74px">เฉลย ✨ ${day.avoid[0]}</h1>${optsHtml(true)}<div class="act" style="position:absolute;left:0;right:0;top:1480px">${day.avoid[0]} คือสีกาลกิณีของคน${day.name} · ใส่${day.lucky[0]}แทน จะเสริม${day.power}</div>`, quizCss), tts: `เฉลย… ${day.avoid[0]}… คือสีกาลกิณีของคน${day.name}… ใส่${day.lucky[0]}แทนนะลูก จะเสริม${day.power}`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>ตอบถูกไหม? 😼\nบอกแม่ + วันเกิดลูก</h1><div class="sub">สีครบทุกวันเกิด 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ตอบถูกไหมลูก… บอกแม่ พร้อมวันเกิดของลูก… แม่จะดูสีให้", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `ทายสี 🎨 คน${day.name} ห้ามใส่สีอะไร? เฉลยท้ายคลิป ✨ ตอบถูกไหม? บอกแม่ในคอมเมนต์พร้อมวันเกิดของลูก 🐾 สีครบทุกวันเกิด → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #สีมงคล #แม่หมอดีดี #คนเกิดวัน${day.short} #เกมทายใจ`;
  meta = { day: day.name, answer: day.avoid[0], shown: shown.map((c) => c[0]) };
}

// ---------- 生成 ----------
const ttsEngine = process.env.TTS_ENGINE || undefined;
const ttsChars = slides.reduce((a, s) => a + (s.tts || "").length, 0);
const outDir = join(ROOT, "out", `${iso}-${type}${process.env.GAME_SUFFIX || ""}`);
if (process.env.GAME_DRY) { console.log(`[game:${type}] DRY ${iso} tts chars=${ttsChars} (botnoi ≈ ${ttsChars * 2} pt) slides=${slides.length} meta=${JSON.stringify(meta)}`); process.exit(0); }
mkdirSync(outDir, { recursive: true });
console.log(`[game:${type}] ${iso} pal#${PALETTES.indexOf(pal)} motif=${motif} tts=${ttsChars}字 meta=${JSON.stringify(meta)}`);
const out = await renderAnimated({
  out: join(outDir, `${type}.mp4`), size: [1080, 1920], fps: 30, padSec: 0.3, fade: 0.25,
  ttsEngine, botnoiSpeaker: process.env.BOTNOI_SPEAKER, ttsCache: join(ROOT, ".tts-cache"),
  voice: "th-TH-PremwadeeNeural", rate: "+2%", ttsTempo: 1.0,
  music: join(ROOT, "assets", "bgm-warm.mp3"), musicVol: 0.10,
  slides
}, ROOT);
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: type, ...meta }, null, 2));
console.log(`[game:${type}] ✅ ${out}`);
