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
import { loadEnv, cyrb53, bkkIso, thDate, dowOf, DAYS, PALETTES, MOTIFS, STAGE, makePage, targetDate, withQR, themeFor, THEMES, coldOpen } from "./lib/scene.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
loadEnv(ROOT);
const TYPES = ["find", "zoom", "quiz", "screenshot", "flash", "lucky", "stop", "wake", "choose5", "target", "elim", "face", "breath", "zoomin", "shell", "daystop"];   // wake は保留(ユーザー判断 2026-09-08)
const type = TYPES.includes(process.argv[2]) ? process.argv[2] : "find";
const TD = targetDate(TYPES.includes(process.argv[2]) ? process.argv[3] : process.argv[2]);
const iso = TD.iso;   // ゲーム型は日付非依存(ユーザー決定 2026-09-08): 表紙に日付を出さない=使い回し可。iso は seed(出題の日替わり)と出力フォルダ名にだけ使う
const seed = (salt) => cyrb53(iso + "|" + type + "|" + salt);
const pick = (pool, salt) => pool[seed(salt) % pool.length];
const rnd = (salt) => (seed(salt) % 10000) / 10000;
const pal = pick(PALETTES, "pal"), motif = pick(MOTIFS, "motif");
const theme = process.env.GAME_THEME ? (THEMES.find((t) => t.name === process.env.GAME_THEME) || themeFor(0)) : themeFor(seed("theme"));   // 動画ごとにテーマをランダム(seed)。GAME_THEME=名前 で固定
const page = makePage(pal, motif, theme);
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
const cover = (title, sub) => ({ html: page(420, `${STAGE}<div class="chip" style="--c:#f4c95d;margin-top:4px">เกมของแม่ 🐾 แม่หมอดีดี</div><h1 style="font-size:110px;margin-top:18px">${title}</h1><div class="sub" style="font-size:54px;color:#fff">${sub}</div>`), dur: 0.45, noFadeIn: true });

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
    { html: page(1, `${header("หาให้เจอ 5 อย่าง ⏳", "แตะหน้าจอเพื่อหยุดภาพได้นะ แม่ไม่ว่า")}<div id="cd">10</div><div class="bar"><i id="barfill"></i></div>${sceneHtml(false)}${ANIM("document.getElementById('barfill').style.width=((1-t)*100).toFixed(1)+'%';document.getElementById('cd').textContent=Math.max(0,Math.ceil(10*(1-t)));")}`, sceneCss), dur: 10, seek: true, animSec: 10 },
    { html: page(1, `${header("เฉลย ✨", "อยู่ตรงนี้ทั้ง 5 อย่าง")}${sceneHtml(true)}`, sceneCss), tts: "เฉลย… อยู่ตรงนี้ทั้งห้าอย่าง… เจอกี่อย่างลูก", seek: true, loop: 3, hold: 0.3 },
    { html: page(1, `${header("เจออะไรก่อน? 🐾", "นั่นคือของนำโชคของลูกวันนี้")}<div class="list">${placed.map((p, i) => `<div class="row"><span class="e">${p.it.e}</span><div><b>${i + 1}. ${p.it.th}</b> · ${p.it.lucky}<br>${p.it.line}</div></div>`).join("")}</div>`, sceneCss), tts: "เจอครบห้า… วันนี้ตาแหลม อย่าปล่อยโอกาสหลุดมือนะ… เจอสามสี่… ดวงดี แต่ใจลูกยังวอกแวกอยู่… เจอแค่หนึ่งสอง… ไม่ใช่ตาไม่ดี แต่ใจลูกอยู่ที่อื่น… พักบ้างนะ", seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>เจอกี่อย่าง? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้าเจอครบ 5 💛 · ส่งให้เพื่อนลองหาดู 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "เจอกี่อย่าง บอกแม่… เจอครบห้าก็แตะสองครั้งให้แม่รู้… แล้วส่งให้เพื่อนลองหาดูนะ", seek: true, loop: 3, hold: 0.3 }
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
    // フック: 16倍のまま静止(何か分からない絵)で問いかけ
    { html: page(1, `<h1 style="font-size:78px;margin-top:70px">ทายสิ… นี่คืออะไร 👀</h1><div class="sub" style="font-size:40px">ส่วนไหนของแม่ · ทายถูกตอนกี่วิ?</div><div class="zoomwrap">${STAGE}</div><div class="qmark">❓</div>${ANIM("document.querySelector('.zoomwrap .stage').style.transform='scale(16)';")}`, zoomCss), tts: "ทายสิ… นี่คือส่วนไหนของแม่… ใครทายถูกก่อน แม่ให้ดาว", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    // 引き: 無音8秒。ease-in = 長く拡大のまま → 最後に一気に引く(答えは最後)
    { html: page(1, `<h1 style="font-size:78px;margin-top:70px">ทายสิ… นี่คืออะไร 👀</h1><div class="sub" style="font-size:40px">เห็นแล้วพิมพ์เลย · ก่อนเฉลย</div><div id="cd">8</div><div class="zoomwrap">${STAGE}</div>${ANIM("var e=Math.pow(t,2.4);var s=16-15*e;document.querySelector('.zoomwrap .stage').style.transform='scale('+s.toFixed(3)+')';document.getElementById('cd').textContent=Math.max(0,Math.ceil(8*(1-t)));")}`, zoomCss), dur: 8, seek: true, animSec: 8 },
    { html: page(560, `${STAGE}<h1 style="font-size:84px">${part.th}</h1><div class="msg">${part.line}</div><div class="act">🐾 ของนำโชควันนี้: ${part.lucky}</div>`), tts: `เฉลย… ${part.th.replace(/[^฀-๿\s]/g, "").trim()}… ${part.line}… ของนำโชคของลูกวันนี้ คือ ${part.lucky}`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>ทายถูกตอนกี่วิ? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้าทายถูก 💛 · พรุ่งนี้แม่ซ่อนส่วนใหม่ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ทายถูกตอนกี่วิ บอกแม่หน่อย… ทายถูกก็แตะสองครั้ง… พรุ่งนี้แม่ซ่อนส่วนใหม่นะ", seek: true, loop: 3, hold: 0.3 }
  ];
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
    { html: page(520, `${STAGE}<h1>ตอบถูกไหม? 😼\nบอกแม่ + วันเกิดลูก</h1><div class="sub">แตะสองครั้งถ้าตอบถูก 💛 · สีครบทุกวันเกิด 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ตอบถูกไหมลูก… ถูกก็แตะสองครั้ง… แล้วบอกแม่พร้อมวันเกิดของลูก แม่จะดูสีให้", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `ทายสี 🎨 คน${day.name} ห้ามใส่สีอะไร? เฉลยท้ายคลิป ✨ ตอบถูกไหม? บอกแม่ในคอมเมนต์พร้อมวันเกิดของลูก 🐾 สีครบทุกวันเกิด → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #สีมงคล #แม่หมอดีดี #คนเกิดวัน${day.short} #เกมทายใจ`;
  meta = { day: day.name, answer: day.avoid[0], shown: shown.map((c) => c[0]) };
}

// =====================================================================
if (type === "screenshot") {
  // แคปหน้าจอ: 結果カードが 0.1 秒ごとに切り替わる → 「今スクショ!」→ 何が出たかコメント(TikTok 定番の参加型・巻き戻し誘発)
  const CARDS = [
    ["💰", "เงินเข้าแบบไม่คาดคิด"], ["💌", "คนเก่าทักมา"], ["🌈", "งานใหม่ที่ใช่"], ["🛏️", "ได้พักจริง ๆ สักที"],
    ["🍀", "โชคดีทั้งสัปดาห์"], ["💘", "มีคนแอบชอบ"], ["✈️", "ได้ไปที่ที่อยากไป"], ["🧧", "ผู้ใหญ่เอ็นดู"],
    ["🔑", "ปัญหาเก่าคลี่คลาย"], ["🌙", "นอนหลับสบายทุกคืน"], ["🎁", "ของขวัญจากคนไม่คาดคิด"], ["🐾", "แม่อยู่ข้างลูกทั้งเดือน"]
  ];
  const order = CARDS.map((c, i) => ({ c, k: seed("card" + i) })).sort((a, b) => a.k - b.k).map((x) => x.c);
  const cardsHtml = order.map((c, i) => `<div class="card" data-i="${i}"><div class="ce">${c[0]}</div><div class="ct">${c[1]}</div></div>`).join("");
  const css = `.deck{position:absolute;left:90px;right:90px;top:640px;height:760px}
    .card{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;border-radius:48px;background:#ffffff14;border:4px solid #f4c95d88;box-shadow:0 0 60px #f4c95d33}
    .card.on{display:flex}
    .ce{font-size:220px;line-height:1;font-family:'Noto Color Emoji'} .ct{font-size:60px;font-weight:800;margin-top:40px;padding:0 40px;line-height:1.3}
    .now{position:absolute;left:0;right:0;top:1460px;font-size:74px;font-weight:800;color:#f4c95d;animation:none}`;
  const N = order.length, CYCLES = 7;   // 8秒で 7周 ≈ 0.095秒/枚
  slides = [
    cover("แคปหน้าจอ 📸", "แล้วดูว่าแม่ให้อะไรลูกเดือนนี้"),
    { html: page(1, `<h1 style="font-size:78px;margin-top:70px">แคปหน้าจอตอนนี้ 📸</h1><div class="sub" style="font-size:40px">ได้อะไร = แม่ให้สิ่งนั้นเดือนนี้</div><div class="deck">${cardsHtml}</div><div class="now">พร้อม… แคป!</div>${ANIM(`var n=${N},cy=${CYCLES};var i=Math.floor(t*n*cy)%n;document.querySelectorAll('.card').forEach(function(c,k){c.classList.toggle('on',k===i);});`)}`, css), tts: "แคปหน้าจอตอนนี้… ได้อะไร แม่ให้สิ่งนั้นกับลูกทั้งเดือน… พร้อมนะ… แคป!", seek: true, animSec: 8, hold: 3.5, botnoiSpeed: SPEED.fast },
    { html: page(520, `${STAGE}<h1>ได้อะไร? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้าได้อันที่ชอบ 💛 · ไม่ทัน? ดูซ้ำได้ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ได้อะไร บอกแม่หน่อย… ได้อันที่ชอบก็แตะสองครั้ง… ไม่ทันก็ดูซ้ำได้นะ แม่ไม่ว่า", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `แคปหน้าจอตอนนี้ 📸 ได้อะไร = แม่ให้สิ่งนั้นกับลูกทั้งเดือน ได้อะไรบอกแม่ในคอมเมนต์ 🐾 ไม่ทันดูซ้ำได้ · duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #แคปหน้าจอ #เกมทายใจ`;
  meta = { cards: order.length };
}

// =====================================================================
if (type === "flash") {
  // 謎を提起 → 答えは 2 フレーム(≈0.07秒)だけ表示 → 「止められた?」(一時停止・巻き戻し = 視聴時間)
  const day = DAYS[seed("day") % 7];
  const RIDDLES = [
    { q: `สีที่จะพาคน${day.name}\nเจอเงินสัปดาห์นี้คือ…`, a: day.money[0], hex: day.money[1] },
    { q: `สีที่คน${day.name}\nควรเลี่ยงวันนี้คือ…`, a: day.avoid[0], hex: day.avoid[1] },
    { q: `สีเสริมเสน่ห์ของคน${day.name}\nสัปดาห์นี้คือ…`, a: day.lucky[0], hex: day.lucky[1] }
  ];
  const r = pick(RIDDLES, "riddle");
  const css = `.ans{position:absolute;left:0;right:0;top:600px;display:none;flex-direction:column;align-items:center}
    .ans.on{display:flex} .ans .sw{width:420px;height:420px;border-radius:50%;box-shadow:0 0 120px #fff8} .ans .t{font-size:110px;font-weight:800;margin-top:30px}
    .hint{position:absolute;left:0;right:0;top:1440px;font-size:46px;color:#f4c95d}`;
  const FLASH_AT = 0.58, FLASH_LEN = 2 / (9 * 30);   // 9秒スライドの 58% 地点で 2 フレーム
  slides = [
    cover("จับให้ทัน ⚡", `คำตอบโผล่แค่ 1 กะพริบ`),
    { html: page(420, `${STAGE}<h1 style="font-size:74px">${r.q}</h1><div class="hint">คำตอบโผล่แค่กะพริบเดียว… แตะหน้าจอให้ทันนะ ⚡</div>`), tts: `${r.q.replace("\n", " ")}… แม่จะโชว์คำตอบแค่กะพริบเดียว… แตะหน้าจอหยุดให้ทันนะลูก`, seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(420, `${STAGE}<h1 style="font-size:74px">${r.q}</h1><div class="ans"><div class="sw" style="background:${r.hex}"></div><div class="t">${r.a}</div></div><div class="hint">👀 อย่ากะพริบตา</div>${ANIM(`var on=(t>=${FLASH_AT}&&t<${FLASH_AT}+${FLASH_LEN.toFixed(5)});document.querySelector('.ans').classList.toggle('on',on);document.getElementById('cat').style.opacity=on?0.15:1;`)}`, css), dur: 9, seek: true, animSec: 9 },
    { html: page(520, `${STAGE}<h1>หยุดทันไหม? 😼\nบอกแม่ว่าสีอะไร</h1><div class="sub">ทันก็แตะสองครั้ง 💛 · ไม่ทัน? ดูซ้ำสิ แม่รอ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "หยุดทันไหมลูก… บอกแม่ว่าสีอะไร… ไม่ทันก็ดูซ้ำสิ แม่รอ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `จับให้ทัน ⚡ ${r.q.replace("\n", " ")} คำตอบโผล่แค่กะพริบเดียว หยุดทันไหม? บอกแม่ในคอมเมนต์ 🐾 สีครบทุกวันเกิด → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #สีมงคล #แม่หมอดีดี #คนเกิดวัน${day.short} #จับให้ทัน`;
  meta = { day: day.name, answer: r.a };
}

// =====================================================================
if (type === "lucky") {
  // 「このクリップが流れてきた人 = 運が開く」型。受け取りは「พิมพ์ รับ」= 1語コメント。保証はしない(娯楽・祝福の言い方)
  const BLESS = [
    { t: "ถ้าคลิปนี้โผล่มา\nแปลว่าดวงลูกกำลังเปิด ✨", l: "แม่ส่งคลิปนี้ให้เฉพาะคนที่ทนมานาน… เดือนนี้ถึงตาลูกได้รับบ้าง" },
    { t: "คลิปนี้ไม่ได้มาบังเอิญ 🐾\nแม่ตั้งใจส่งมาให้ลูก", l: "ที่ลูกยังไม่ได้ ไม่ใช่ไม่คู่ควร… แค่ยังไม่ถึงคิว และคิวลูกใกล้แล้ว" },
    { t: "ใครเห็นคลิปนี้ก่อนนอน 🌙\nแม่ให้โชคติดตัวไปเลย", l: "คืนนี้หลับให้สบาย… เรื่องที่กังวลอยู่ แม่ช่วยถือไว้ให้ก่อน" }
  ];
  const b = pick(BLESS, "bless");
  const css = `.seal{position:absolute;left:0;right:0;top:1300px;display:flex;justify-content:center}
    .seal div{width:260px;height:260px;border-radius:50%;border:10px solid #f4c95d;display:flex;align-items:center;justify-content:center;font-size:110px;box-shadow:0 0 80px #f4c95d66;transform:scale(0)}`;
  slides = [
    cover("ถ้าคลิปนี้โผล่มา ✨", "แปลว่าดวงลูกกำลังเปิด"),
    { html: page(520, `${STAGE}<h1 style="font-size:78px">${b.t}</h1><div class="msg">${b.l}</div><div class="seal"><div id="seal">🐾</div></div>${ANIM("var e=Math.min(1,Math.max(0,(t-0.55)/0.25));var s=1.4*e-0.4*e*e;document.getElementById('seal').style.transform='scale('+Math.max(0,s).toFixed(3)+')';")}`, css), tts: `${b.t.replace("\n", " ")}… ${b.l}`, seek: true, animSec: 6, hold: 0.6, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>รับไว้นะลูก 💛\nแตะสองครั้ง + พิมพ์ "รับ"</h1><div class="sub">ส่งต่อให้คนที่ลูกอยากให้ดวงเปิด 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "รับไว้นะลูก… แตะสองครั้ง แล้วพิมพ์ว่า รับ… แล้วส่งต่อให้คนที่ลูกอยากให้ดวงเปิด", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `${b.t.replace("\n", " ")} 🐾 รับไว้พิมพ์ "รับ" แล้วส่งต่อให้คนที่อยากให้ดวงเปิด · เพื่อความบันเทิงและกำลังใจ · duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #ดวงเปิด #รับโชค`;
  meta = { bless: BLESS.indexOf(b) };
}

// =====================================================================
if (type === "stop") {
  // タイミングで止める: 矢印が7色ゾーンを往復(加速) → 1回タップ=一時停止 → 止まったコマがそのまま結果(各コマが自己完結)
  const ZONES = [
    ["สีเขียว", "#2e9e5b", "การเงิน", "เงินที่รอ กำลังหาทางเข้ามา"], ["สีชมพู", "#ff5d8f", "ความรัก", "มีคนคิดถึงลูกอยู่จริง ๆ"],
    ["สีม่วง", "#9d4edd", "ความสงบ", "คืนนี้ได้นอนสบายสักที"], ["สีเหลือง", "#f5c518", "พลังใจ", "ลูกแกร่งกว่าที่คิดเยอะ"],
    ["สีน้ำเงิน", "#2f6fd0", "โอกาส", "ประตูที่ปิดอยู่ กำลังจะเปิด"], ["สีส้ม", "#f77f00", "เสน่ห์", "วันนี้ใครเห็นก็อยากคุย"],
    ["สีขาว", "#f2efe6", "โชค", "เรื่องเล็ก ๆ ที่ดี จะมาทั้งวัน"]
  ];
  const css = `.track{position:absolute;left:60px;right:60px;top:1040px;height:150px;display:flex;gap:10px}
    .zone{flex:1;border-radius:22px;opacity:.55;transition:none} .zone.hit{opacity:1;box-shadow:0 0 50px #fff9;transform:scaleY(1.12)}
    #arrow{position:absolute;top:960px;left:0;font-size:80px;line-height:1;transform:translateX(-50%)}
    .res{position:absolute;left:0;right:0;top:1230px;text-align:center}
    .res .n{font-size:88px;font-weight:800} .res .k{font-size:54px;color:#f4c95d;margin-top:8px} .res .l{font-family:'Sarabun';font-size:44px;margin-top:14px;padding:0 80px;line-height:1.5}`;
  const zonesHtml = ZONES.map((z, i) => `<div class="zone" id="z${i}" style="background:${z[1]}"></div>`).join("");
  const zonesJson = JSON.stringify(ZONES.map((z) => [z[0], z[2], z[3]]));
  // 往復(ping-pong)。後半ほど速い。位置 p∈[0,1) → zone index。各コマで結果テキストも更新(=止めたコマが答え)
  const anim = `var Z=${zonesJson};var W=1080-120;var sp=2.2+4.5*t;var ph=(t*sp*3.0)%2;var p=ph<1?ph:2-ph;var x=60+W*p;var i=Math.min(6,Math.floor(p*7));
    document.getElementById('arrow').style.left=x.toFixed(1)+'px';for(var k=0;k<7;k++){document.getElementById('z'+k).classList.toggle('hit',k===i);}
    document.getElementById('rn').textContent=Z[i][0];document.getElementById('rk').textContent=Z[i][1];document.getElementById('rl').textContent=Z[i][2];`;
  slides = [
    cover("แตะหยุดให้ทัน ✋", "ตรงไหนที่หยุด = สีของลูกวันนี้"),
    { html: page(380, `${STAGE}<h1 style="font-size:74px">แตะหน้าจอ 1 ครั้ง ✋\nตอนที่ลูกศรอยู่บนสีที่ใจเรียก</h1><div class="sub" style="font-size:40px">หยุดตรงไหน = สีและเรื่องดีของลูกวันนี้</div><div id="arrow">🔻</div><div class="track">${zonesHtml}</div><div class="res"><div class="n" id="rn"></div><div class="k" id="rk"></div><div class="l" id="rl"></div></div>${ANIM("var Z=" + zonesJson + ";var i=Math.floor(t*7)%7;document.getElementById('arrow').style.left=(60+960*((i+0.5)/7)).toFixed(1)+'px';for(var k=0;k<7;k++){document.getElementById('z'+k).classList.toggle('hit',k===i);}")}`, css), tts: "แตะหน้าจอหนึ่งครั้ง ตอนที่ลูกศรอยู่บนสีที่ใจเรียก… หยุดตรงไหน คือสีและเรื่องดีของลูกวันนี้… พร้อมนะ", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(380, `${STAGE}<h1 style="font-size:74px">แตะหยุด… ตอนนี้! ✋</h1><div class="sub" style="font-size:40px">ช้าลงได้ แต่แม่จะเร่งขึ้นเรื่อย ๆ นะ</div><div id="arrow">🔻</div><div class="track">${zonesHtml}</div><div class="res"><div class="n" id="rn"></div><div class="k" id="rk"></div><div class="l" id="rl"></div></div>${ANIM(anim)}`, css), dur: 10, seek: true, animSec: 10 },
    { html: page(520, `${STAGE}<h1>หยุดได้สีอะไร? 😼\nบอกแม่หน่อย</h1><div class="sub">แคปไว้แล้วส่งให้เพื่อนลองหยุด 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "หยุดได้สีอะไร บอกแม่หน่อย… แคปไว้ แล้วส่งให้เพื่อนลองหยุดดูนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `แตะหยุดให้ทัน ✋ ลูกศรวิ่งบน 7 สี แตะหน้าจอ 1 ครั้งตอนที่อยู่บนสีที่ใจเรียก หยุดตรงไหน = สีและเรื่องดีของลูกวันนี้ ได้สีอะไรบอกแม่ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #แตะหยุด #เกมทายใจ`;
  meta = { zones: 7 };
}

// =====================================================================
if (type === "wake") {
  // 連打: 眠る แม่ を「2回タップ連打」で起こす(2回タップ=いいね) → 最後に目を開けて一言(代弁→優しさ)
  const LINES = [
    { s: "ปลุกแม่ทำไมดึกป่านนี้… นอนไม่หลับอีกแล้วใช่ไหม", h: "ไม่เป็นไร แม่ตื่นแล้ว… วางเรื่องนั้นไว้กับแม่ แล้วไปนอนซะ ลูกทำดีพอแล้ววันนี้" },
    { s: "ตบแม่รัวขนาดนี้… ใจลูกร้อนเรื่องอะไรอยู่", h: "แม่รู้… รอคำตอบจากใครสักคนใช่ไหม… คนที่ใช่ไม่ทำให้ลูกต้องปลุกใครตอนตีสองหรอกนะ" },
    { s: "โอ๊ย ตื่นแล้ว ๆ… ลูกนี่ไม่ยอมแพ้จริง ๆ", h: "นั่นแหละจุดแข็งของลูก… คนที่ตบไม่หยุดจนแม่ตื่น คือคนที่จะทำเรื่องยากสำเร็จ แม่ให้พร" }
  ];
  const L = pick(LINES, "line");
  const css = `#zz{position:absolute;left:0;right:0;top:1180px;font-size:110px;opacity:.8} .cnt{position:absolute;left:0;right:0;top:1360px;font-size:70px;font-weight:800;color:#f4c95d}`;
  // 眠り: 目を閉じ続ける → t>0.85 で開く。"แตะไปแล้ว N ครั้ง" カウンタが進む(視聴者の連打と同期している錯覚)
  const sleepAnim = `var eo=document.getElementById('eyesOpen'),ec=document.getElementById('eyesClosed');var awake=t>0.85;eo.style.display=awake?'block':'none';ec.style.display=awake?'none':'block';
    document.getElementById('zz').style.opacity=awake?0:(0.5+0.5*Math.sin(t*40));document.getElementById('cnt').textContent=awake?'แม่ตื่นแล้ว!':('แตะไปแล้ว '+Math.floor(t*40)+' ครั้ง…');`;
  slides = [
    cover("ปลุกแม่ให้ตื่น 😴", "แตะสองครั้งรัว ๆ"),
    { html: page(560, `${STAGE}<h1 style="font-size:78px">แม่หลับอยู่ 😴\nแตะสองครั้งรัว ๆ ปลุกแม่</h1><div class="sub" style="font-size:40px">ตื่นแล้วแม่จะบอกเรื่องหนึ่งกับลูก</div><div id="zz">💤</div><div class="cnt" id="cnt"></div>${ANIM(sleepAnim)}`, css), dur: 8, seek: true, animSec: 8 },
    { html: page(560, `${STAGE}<h1 style="font-size:70px">😼 ${L.s}</h1><div class="msg">${L.h}</div>`), tts: `${L.s}… ${L.h}`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>ปลุกแม่ตื่นทันไหม? 😼\nบอกแม่ว่าตบไปกี่ที</h1><div class="sub">พรุ่งนี้แม่หลับใหม่ มาปลุกอีกนะ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ปลุกแม่ทันไหมลูก… บอกแม่ว่าตบไปกี่ที… พรุ่งนี้แม่หลับใหม่ มาปลุกอีกนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `แม่หลับอยู่ 😴 แตะสองครั้งรัว ๆ ปลุกแม่ ตื่นแล้วแม่จะบอกเรื่องหนึ่งกับลูก 😼 ตบไปกี่ทีบอกแม่ในคอมเมนต์ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #ปลุกแม่ #เกมทายใจ`;
  meta = { line: LINES.indexOf(L) };
}

// =====================================================================
if (type === "choose5") {
  // 左右選択×5問: 選んだ側を心の中で数える → 最後に「左3つ以上/右3つ以上」で分岐(選択の積み重ね=完走理由)
  const QS = [["งาน", "ความรัก"], ["วันนี้", "เดือนหน้า"], ["พูดออกไป", "เก็บไว้ก่อน"], ["เงิน", "เวลา"], ["คนเก่า", "คนใหม่"], ["ทะเล", "ภูเขา"], ["เช้า", "กลางคืน"], ["โทรหาเลย", "รอเขาโทร"]];
  const qs = QS.map((q, i) => ({ q, k: seed("q" + i) })).sort((a, b) => a.k - b.k).slice(0, 5).map((x) => x.q);
  const TH_N = ["หนึ่ง", "สอง", "สาม", "สี่", "ห้า"];
  const css = `.lr{position:absolute;left:60px;right:60px;top:820px;display:flex;gap:30px;height:520px}
    .lr div{flex:1;border-radius:40px;display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:800;padding:0 20px;text-align:center;line-height:1.25}
    .lr .l{background:#2f6fd0cc;box-shadow:0 0 50px #2f6fd066} .lr .r{background:#ff5d8fcc;box-shadow:0 0 50px #ff5d8f66}
    .num{position:absolute;left:0;right:0;top:1400px;font-size:52px;color:#f4c95d;font-weight:700} .tally{position:absolute;left:0;right:0;top:1480px;font-size:40px;color:#fff9}`;
  const qSlide = (q, i) => ({ html: page(380, `${STAGE}<h1 style="font-size:70px">ข้อ ${i + 1} / 5 · เลือกในใจ</h1><div class="lr"><div class="l">👈 ${q[0]}</div><div class="r">${q[1]} 👉</div></div><div class="num">ซ้าย หรือ ขวา?</div><div class="tally">นับไว้นะ ว่าเลือก "ซ้าย" กี่ครั้ง</div>`, css), tts: `ข้อ${TH_N[i]}… ${q[0]} หรือ ${q[1]}`, seek: true, loop: 3, hold: 1.0, botnoiSpeed: SPEED.fast });
  slides = [
    cover("ซ้าย หรือ ขวา? 👈👉", "แม่ถาม 5 ข้อ เลือกในใจ"),
    { html: page(520, `${STAGE}<h1 style="font-size:74px">แม่จะถาม 5 ข้อ\nเลือกซ้ายหรือขวาในใจ 👈👉</h1><div class="sub">นับว่าเลือก "ซ้าย" กี่ครั้ง… คำตอบอยู่ท้ายคลิป</div>`), tts: "แม่จะถามห้าข้อ… เลือกซ้ายหรือขวาในใจ… นับไว้ว่าเลือกซ้ายกี่ครั้ง คำตอบอยู่ท้ายคลิป", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    ...qs.map(qSlide),
    { html: page(380, `${STAGE}<h1 style="font-size:70px">เฉลย ✨</h1><div class="msg"><b class="gold">ซ้าย 3 ขึ้นไป</b> · คนคิดเยอะแต่ทำจริง… สัปดาห์นี้อย่ารอให้พร้อม ลงมือเลย</div><div class="msg"><b class="gold">ขวา 3 ขึ้นไป</b> · คนที่ใจนำ… สัปดาห์นี้ฟังหัวบ้าง เรื่องเงินโดยเฉพาะ</div>`), tts: "ซ้ายสามขึ้นไป… คนคิดเยอะแต่ทำจริง สัปดาห์นี้อย่ารอให้พร้อม ลงมือเลย… ขวาสามขึ้นไป… คนที่ใจนำ สัปดาห์นี้ฟังหัวบ้าง เรื่องเงินโดยเฉพาะ", seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>ซ้ายกี่ครั้ง? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้าโดน 💛<br><span class="gold">duangdeedee.me</span></div>`), tts: "ซ้ายกี่ครั้ง บอกแม่หน่อย… โดนก็แตะสองครั้งนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `ซ้าย หรือ ขวา? 👈👉 แม่ถาม 5 ข้อ เลือกในใจแล้วนับว่าซ้ายกี่ครั้ง เฉลยท้ายคลิป ซ้ายกี่ครั้งบอกแม่ในคอมเมนต์ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #ซ้ายหรือขวา #เกมทายใจ`;
  meta = { qs };
}

// =====================================================================
if (type === "target") {
  // 的当て: 光が円周を回る(加速) → 金の帯に入った瞬間に1回タップ → 止めたコマに「%」と評価が出ている
  const css = `.ringwrap{position:absolute;left:190px;top:820px;width:700px;height:700px}
    .ringwrap .base{position:absolute;inset:0;border-radius:50%;border:26px solid #ffffff22}
    .ringwrap .band{position:absolute;left:50%;top:-10px;width:140px;height:60px;margin-left:-70px;border-radius:30px;background:#f4c95d;box-shadow:0 0 40px #f4c95d}
    #dot{position:absolute;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;background:#fff;box-shadow:0 0 40px #fff}
    .pct{position:absolute;left:0;right:0;top:1560px;font-size:110px;font-weight:800;line-height:1} .tier{position:absolute;left:0;right:0;top:1690px;font-size:46px;color:#f4c95d}`;
  const ring = `<div class="ringwrap"><div class="base"></div><div class="band"></div><div id="dot"></div></div>`;
  const anim = `var R=337;var sp=1.0+2.4*t;var a=(t*sp*6.2832*2.0)%6.2832;var d=document.getElementById('dot');d.style.left=(350+R*Math.sin(a))+'px';d.style.top=(350-R*Math.cos(a))+'px';
    var dist=Math.min(a,6.2832-a)/3.1416;var pct=Math.max(0,Math.round(100*(1-dist*2.2)));document.getElementById('pct').textContent=pct+'%';
    document.getElementById('tier').textContent=pct>=90?'ตรงเป๊ะ! ดวงแรงทั้งสัปดาห์':pct>=60?'ใกล้มาก… โชคมาแบบเฉียด ๆ':pct>=30?'พอได้… ช้าลงหน่อยนะลูก':'พลาด… แต่หยุดใหม่ได้อีกรอบ';`;
  slides = [
    cover("แตะให้ตรงแถบทอง 🎯", "ยิ่งตรง = ดวงยิ่งแรง"),
    { html: page(360, `${STAGE}<h1 style="font-size:66px">แสงจะวิ่งรอบวง 🎯\nแตะหยุดตอนเข้าแถบทอง</h1>${ring}${ANIM("var R=337;var a=t*6.2832;var d=document.getElementById('dot');d.style.left=(350+R*Math.sin(a))+'px';d.style.top=(350-R*Math.cos(a))+'px';")}`, css), tts: "แสงจะวิ่งรอบวง… แตะหน้าจอหยุด ตอนที่แสงเข้าแถบทอง… ยิ่งตรง ดวงสัปดาห์นี้ยิ่งแรง… พร้อมนะ", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(360, `${STAGE}<h1 style="font-size:66px">แตะ… ตอนนี้! 🎯</h1>${ring}<div class="pct" id="pct">0%</div><div class="tier" id="tier"></div>${ANIM(anim)}`, css), dur: 10, seek: true, animSec: 10 },
    { html: page(520, `${STAGE}<h1>ได้กี่เปอร์เซ็นต์? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้าเกิน 90 💛 · ส่งให้เพื่อนลองแตะ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "ได้กี่เปอร์เซ็นต์ บอกแม่หน่อย… เกินเก้าสิบก็แตะสองครั้ง… แล้วส่งให้เพื่อนลองแตะดู", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `แตะให้ตรงแถบทอง 🎯 แสงวิ่งรอบวง แตะหน้าจอหยุดตอนเข้าแถบทอง ยิ่งตรง = ดวงสัปดาห์นี้ยิ่งแรง ได้กี่ % บอกแม่ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #แตะให้ตรง #เกมทายใจ`;
  meta = {};
}

// =====================================================================
if (type === "elim") {
  // 消去法(先に1色選ばせる): 7色が1つずつ消え、最後に残った色=今週守ってくれる色。自分の色が消える瞬間がコメントを生む
  const COLS = [["สีเขียว", "#2e9e5b", "เงิน"], ["สีชมพู", "#ff5d8f", "ความรัก"], ["สีม่วง", "#9d4edd", "ความสงบ"], ["สีเหลือง", "#f5c518", "พลังใจ"], ["สีน้ำเงิน", "#2f6fd0", "โอกาส"], ["สีส้ม", "#f77f00", "เสน่ห์"], ["สีขาว", "#f2efe6", "โชค"]];
  const order = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ i, k: seed("e" + i) })).sort((a, b) => a.k - b.k).map((x) => x.i);
  const sv = COLS[order[6]];
  const css = `.grid{position:absolute;left:60px;right:60px;top:820px;display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
    .c{height:210px;border-radius:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:40px;font-weight:700;color:#000c;position:relative}
    .c small{font-size:28px;font-weight:500} .c.out{filter:grayscale(1) brightness(.35)} .c.out::after{content:"✖";position:absolute;font-size:120px;color:#fff9}
    .c.win{box-shadow:0 0 70px #fff;transform:scale(1.08)} .left{position:absolute;left:0;right:0;top:1330px;font-size:56px;color:#f4c95d;font-weight:700}`;
  const grid = COLS.map((c, i) => `<div class="c" id="c${i}" style="background:${c[1]}">${c[0]}<small>${c[2]}</small></div>`).join("");
  const anim = `var ord=${JSON.stringify(order)};var n=Math.min(6,Math.floor(t*7.4));for(var k=0;k<7;k++){var el=document.getElementById('c'+k);el.classList.remove('out','win');}
    for(var j=0;j<n;j++){document.getElementById('c'+ord[j]).classList.add('out');}
    document.getElementById('left').textContent=(7-n)>1?('เหลือ '+(7-n)+' สี…'):'สีสุดท้าย!';if(t>0.92){document.getElementById('c'+ord[6]).classList.add('win');}`;
  slides = [
    cover("เลือก 1 สีก่อน 🎨", "แล้วดูว่าสีของลูกจะรอดไหม"),
    { html: page(360, `${STAGE}<h1 style="font-size:66px">เลือกสีที่ใจเรียก 1 สี 🎨\nจำไว้ในใจนะ</h1><div class="grid">${grid}</div><div class="left">เดี๋ยวแม่จะลบทีละสี…</div>`, css), tts: "เลือกสีที่ใจเรียกหนึ่งสีก่อน… จำไว้ในใจนะ… เดี๋ยวแม่จะลบทีละสี… สีของลูกจะรอดถึงสุดท้ายไหม", seek: true, loop: 3, hold: 0.6, botnoiSpeed: SPEED.fast },
    { html: page(360, `${STAGE}<h1 style="font-size:66px">หายไปทีละสี… 🎨\nสีที่รอด = สีที่คุ้มครองลูกสัปดาห์นี้</h1><div class="grid">${grid}</div><div class="left" id="left"></div>${ANIM(anim)}`, css), dur: 10, seek: true, animSec: 10 },
    { html: page(480, `${STAGE}<h1 style="font-size:78px">รอด: <span style="color:${sv[1]}">${sv[0]}</span> ✨</h1><div class="msg">สีที่คุ้มครองลูกสัปดาห์นี้ · เรื่อง${sv[2]}</div><div class="act">🐾 สีของลูกหายไปก่อน? ไม่ใช่โชคร้ายนะ… แค่สัปดาห์นี้ให้${sv[0]}ดูแลแทน</div>`), tts: `สีที่รอด… ${sv[0]}… สีที่คุ้มครองลูกสัปดาห์นี้ เรื่อง${sv[2]}… ถ้าสีของลูกหายไปก่อน ไม่ใช่โชคร้ายนะ… แค่สัปดาห์นี้ให้${sv[0]}ดูแลแทน`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>สีของลูกรอดไหม? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้ารอด 💛<br><span class="gold">duangdeedee.me</span></div>`), tts: "สีของลูกรอดไหม บอกแม่หน่อย… รอดก็แตะสองครั้งนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `เลือก 1 สีก่อน 🎨 แล้วแม่จะลบทีละสี สีที่รอดคือสีที่คุ้มครองลูกสัปดาห์นี้ สีของลูกรอดไหม? บอกแม่ในคอมเมนต์ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #สีมงคล #แม่หมอดีดี #สีไหนรอด #เกมทายใจ`;
  meta = { survivor: sv[0] };
}

// =====================================================================
if (type === "face") {
  // 一瞬の顔: 猫の表情が0.2秒だけ変わる(SVG差分をその場で注入) → どの顔を見たかで分岐 → 見直しを誘う
  const FACES = [
    { key: "โมโห", line: "แม่โมโหแทนลูก… เรื่องที่ลูกทนอยู่ แม่เห็นหมดนะ", svg: '<line x1="68" y1="78" x2="88" y2="86" stroke="#5b4636" stroke-width="4" stroke-linecap="round"/><line x1="132" y1="78" x2="112" y2="86" stroke="#5b4636" stroke-width="4" stroke-linecap="round"/><path d="M90 117 q10 -8 20 0" stroke="#5b4636" stroke-width="3.5" fill="none" stroke-linecap="round"/>' },
    { key: "ขำ", line: "แม่ขำ… เรื่องที่ลูกกังวลอยู่ จะจบแบบตลก ๆ กว่าที่คิด", svg: '<path d="M72 90 q8 -8 16 0" stroke="#5b4636" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M112 90 q8 -8 16 0" stroke="#5b4636" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="100" cy="114" rx="8" ry="6" fill="#7a3b3b"/>' },
    { key: "ซึ้ง", line: "แม่ซึ้ง… ลูกทำได้ดีกว่าที่ตัวเองคิดเยอะ แม่ภูมิใจ", svg: '<ellipse cx="80" cy="104" rx="3" ry="6" fill="#7fb3ff"/><ellipse cx="120" cy="104" rx="3" ry="6" fill="#7fb3ff"/><path d="M92 117 q8 -6 16 0" stroke="#5b4636" stroke-width="3.5" fill="none" stroke-linecap="round"/>' }
  ];
  const f = pick(FACES, "face");
  const AT = 0.45 + rnd("at") * 0.35, LEN = 6 / (8 * 30);   // 8秒中の 6 フレーム(0.2秒)
  const anim = `if(!window.__fx){var svg=document.getElementById('cat');var g=document.createElementNS('http://www.w3.org/2000/svg','g');g.innerHTML=${JSON.stringify(f.svg)};svg.appendChild(g);window.__fx=g;}
    var on=(t>=${AT.toFixed(4)}&&t<${(AT + LEN).toFixed(4)});window.__fx.style.display=on?'block':'none';
    if(on){document.getElementById('eyesOpen').style.display=${f.key === "ขำ" ? "'none'" : "'block'"};document.getElementById('eyesClosed').style.display='none';}`;
  const css = `.hint{position:absolute;left:0;right:0;top:1440px;font-size:46px;color:#f4c95d} .opts{position:absolute;left:80px;right:80px;top:1180px;display:flex;gap:20px} .opts div{flex:1;border-radius:30px;background:#ffffff14;padding:22px 0;font-size:44px;font-weight:700} .opts .ok{background:#f4c95d33;border:3px solid #f4c95d}`;
  slides = [
    cover("จับหน้าแม่ให้ทัน 👀", "แม่เปลี่ยนหน้าแค่กะพริบเดียว"),
    { html: page(720, `${STAGE}<h1 style="font-size:70px">แม่จะเปลี่ยนหน้า\nแค่กะพริบเดียว 👀</h1><div class="hint">โมโห · ขำ · ซึ้ง — เห็นหน้าไหน จำไว้</div>`, css), tts: "แม่จะเปลี่ยนหน้าแค่กะพริบเดียว… โมโห ขำ หรือซึ้ง… จับให้ทันนะว่าหน้าไหน", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(720, `${STAGE}<h1 style="font-size:70px">👀 อย่ากะพริบตา</h1><div class="hint">แตะหน้าจอหยุดถ้าเห็น</div>${ANIM(anim)}`, css), dur: 8, seek: true, animSec: 8 },
    { html: page(520, `${STAGE}<h1 style="font-size:74px">เฉลย: หน้า${f.key} ✨</h1><div class="opts">${FACES.map((x) => `<div class="${x.key === f.key ? "ok" : ""}">${x.key}</div>`).join("")}</div><div class="msg" style="margin-top:300px">${f.line}</div>`, css), tts: `เฉลย… หน้า${f.key}… ${f.line}`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>เห็นหน้าไหน? 😼\nบอกแม่หน่อย</h1><div class="sub">จับได้ก็แตะสองครั้ง 💛 · ไม่ทัน? ดูซ้ำสิ 🐾<br><span class="gold">duangdeedee.me</span></div>`), tts: "เห็นหน้าไหน บอกแม่หน่อย… จับได้ก็แตะสองครั้ง… ไม่ทันก็ดูซ้ำสิ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `แม่เปลี่ยนหน้าแค่กะพริบเดียว 👀 โมโห ขำ หรือซึ้ง? จับให้ทัน เฉลยท้ายคลิป เห็นหน้าไหนบอกแม่ในคอมเมนต์ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #จับให้ทัน #เกมทายใจ`;
  meta = { face: f.key };
}

// =====================================================================
if (type === "breath") {
  // 呼吸で止める: 吸う→止める→吐く。吐き切った瞬間にタップ → そのコマの「ปล่อย: …」が今週手放すもの。癒し・保存狙い
  const LETGO = ["ความคาดหวังของคนอื่น", "ข้อความที่ยังไม่ได้ตอบ", "คนที่ไม่เลือกลูก", "งานที่ไม่ใช่ของลูก", "ความผิดพลาดเมื่อวาน", "ความกลัวว่าจะไม่พอ"];
  const order = LETGO.map((w, i) => ({ w, k: seed("lg" + i) })).sort((a, b) => a.k - b.k).map((x) => x.w);
  const css = `.circ{position:absolute;left:190px;top:840px;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,#f4c95d66,#f4c95d14 60%,transparent 72%);display:flex;align-items:center;justify-content:center;text-align:center}
    .circ .w{font-size:50px;font-weight:700;padding:0 90px;line-height:1.35} .ph{position:absolute;left:0;right:0;top:1580px;font-size:58px;color:#f4c95d;font-weight:800}`;
  const anim = `var W=${JSON.stringify(order)};document.getElementById('ph').textContent=t<0.33?'หายใจเข้า…':t<0.42?'ค้างไว้…':'หายใจออกช้า ๆ… พอสุดให้แตะ';
    var s=t<0.33?0.55+0.45*(t/0.33):t<0.42?1:1-0.55*((t-0.42)/0.58);document.querySelector('.circ').style.transform='scale('+s.toFixed(3)+')';
    var w=document.getElementById('w');if(t<0.42){w.textContent='';}else{var i=Math.min(W.length-1,Math.floor((t-0.42)/0.58*W.length));w.textContent='ปล่อย: '+W[i];}`;
  slides = [
    cover("หายใจตามแม่ 🌬️", "พอหายใจออกสุด ให้แตะหยุด"),
    { html: page(420, `${STAGE}<h1 style="font-size:66px">หายใจเข้าตามวง 🌬️\nพอหายใจออกสุด ให้แตะหยุด</h1><div class="sub" style="font-size:40px">คำที่ค้างอยู่ = สิ่งที่ลูกต้องปล่อยสัปดาห์นี้</div>`), tts: "หายใจเข้าช้า ๆ ตามวง… ค้างไว้… แล้วหายใจออกยาว ๆ… พอหมดลมให้แตะหยุด… คำที่ค้างอยู่ คือสิ่งที่ลูกต้องปล่อยสัปดาห์นี้", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.warm },
    { html: page(420, `${STAGE}<h1 style="font-size:66px">ตามแม่นะ 🌬️</h1><div class="circ"><div class="w" id="w"></div></div><div class="ph" id="ph"></div>${ANIM(anim)}`, css), dur: 12, seek: true, animSec: 12 },
    { html: page(520, `${STAGE}<h1>ปล่อยอะไร? 💛\nบอกแม่หน่อย</h1><div class="sub">หายใจตามจริงก็แตะสองครั้ง 🐾 แล้วไปนอนนะ<br><span class="gold">duangdeedee.me</span></div>`), tts: "ปล่อยอะไร บอกแม่หน่อย… หายใจตามจริงก็แตะสองครั้ง… แล้วไปนอนนะลูก", seek: true, loop: 3, hold: 0.3, botnoiSpeed: SPEED.warm }
  ];
  caption = `หายใจตามแม่ 🌬️ เข้า… ค้าง… ออกยาว ๆ พอหมดลมให้แตะหยุด คำที่ค้างอยู่คือสิ่งที่ลูกต้องปล่อยสัปดาห์นี้ ปล่อยอะไรบอกแม่ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #หายใจ #ปล่อยวาง`;
  meta = { order };
}

// =====================================================================
if (type === "zoomin") {
  // 拡大で探す(ユーザー改: ズーム中に現れる猫をタップ): 全体→8倍まで寄る。途中3回、แม่が0.4秒だけ現れる → 見えたらタップ。最後に隠された物が読める
  const W = 1080, H = 1300;
  const target = { x: 300 + rnd("tx") * 480, y: 260 + rnd("ty") * 780 };
  const gift = pick(ITEMS, "gift");
  const appear = [0.2, 0.47, 0.74].map((t0, i) => ({ t0, len: 0.05, x: 100 + rnd("ax" + i) * (W - 420), y: 80 + rnd("ay" + i) * (H - 380) }));
  const clutter = Array.from({ length: 70 }, (_, i) => ({ e: CLUTTER[seed("zc" + i) % CLUTTER.length], x: rnd("zx" + i) * W, y: rnd("zy" + i) * H, size: 22 + Math.round(rnd("zs" + i) * 40), op: 0.18 + rnd("zo" + i) * 0.25 }));
  const css = `.world{position:absolute;left:0;top:420px;width:${W}px;height:${H}px;overflow:hidden}
    .world .inner{position:absolute;inset:0;transform-origin:${target.x.toFixed(0)}px ${target.y.toFixed(0)}px}
    .it{position:absolute;line-height:1;font-family:'Noto Color Emoji'}
    .world .stage{position:absolute;width:220px;height:220px;margin:0;display:none}
    .gift{position:absolute;left:${(target.x - 14).toFixed(0)}px;top:${(target.y - 14).toFixed(0)}px;font-size:28px;font-family:'Noto Color Emoji'}
    .word{position:absolute;left:${(target.x - 60).toFixed(0)}px;top:${(target.y + 18).toFixed(0)}px;width:120px;text-align:center;font-size:14px;font-weight:800;color:#f4c95d}
    .cnt{position:absolute;left:0;right:0;top:1760px;font-size:44px;color:#f4c95d}`;
  const worldHtml = (withCat) => `<div class="world"><div class="inner">${clutter.map((c) => `<span class="it" style="left:${c.x.toFixed(0)}px;top:${c.y.toFixed(0)}px;font-size:${c.size}px;opacity:${c.op.toFixed(2)}">${c.e}</span>`).join("")}<span class="gift">${gift.e}</span><div class="word">${gift.lucky}</div></div>${withCat ? STAGE : ""}</div>`;
  const anim = `var A=${JSON.stringify(appear)};var e=Math.pow(t,1.7);var s=1+7*e;document.querySelector('.inner').style.transform='scale('+s.toFixed(3)+')';
    var st=document.querySelector('.world .stage');var shown=false,seen=0;for(var i=0;i<A.length;i++){var a=A[i];if(t>=a.t0+a.len)seen++;if(t>=a.t0&&t<a.t0+a.len){shown=true;st.style.left=a.x+'px';st.style.top=a.y+'px';}}
    st.style.display=shown?'block':'none';document.getElementById('cnt').textContent=t<0.98?('แม่โผล่มาแล้ว '+seen+' ครั้ง…'):'ถึงแล้ว! ของนำโชคของลูก';`;
  slides = [
    cover("แตะทันทีที่เห็นแม่ 🐾", "แม่จะซูมเข้าไปเรื่อย ๆ"),
    { html: page(1, `<h1 style="font-size:66px;margin-top:70px">แม่จะซูมเข้าไปเรื่อย ๆ 🔍\nระหว่างทางแม่จะโผล่มา 3 ครั้ง</h1><div class="sub" style="font-size:40px">แตะหน้าจอทันทีที่เห็นแม่ · ปลายทางมีของนำโชครออยู่</div>${worldHtml(false)}`, css), tts: "แม่จะซูมเข้าไปเรื่อย ๆ… ระหว่างทางแม่จะโผล่มาสามครั้ง… แตะหน้าจอทันทีที่เห็นแม่… ปลายทางมีของนำโชครออยู่", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(1, `<h1 style="font-size:66px;margin-top:70px">ตาไว ๆ 🔍 แตะทันทีที่เห็นแม่</h1>${worldHtml(true)}<div class="cnt" id="cnt"></div>${ANIM(anim)}`, css), dur: 10, seek: true, animSec: 10 },
    { html: page(480, `${STAGE}<h1 style="font-size:78px">ปลายทาง: ${gift.e} ${gift.th}</h1><div class="msg">ของนำโชคของลูก: ${gift.lucky} · ${gift.line}</div><div class="act">🐾 จับแม่ได้ 3 ครั้ง = ตาไว ใจนิ่ง · 2 ครั้ง = ดี · 1 ครั้ง = ใจลอยอยู่นะ พักหน่อย</div>`), tts: `ปลายทางคือ ${gift.th}… ของนำโชคของลูก ${gift.lucky}… ${gift.line}… จับแม่ได้สามครั้ง ตาไว ใจนิ่ง… ครั้งเดียว ใจลอยอยู่นะ พักหน่อย`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>จับแม่ได้กี่ครั้ง? 😼\nบอกแม่หน่อย</h1><div class="sub">แตะสองครั้งถ้าครบ 3 💛<br><span class="gold">duangdeedee.me</span></div>`), tts: "จับแม่ได้กี่ครั้ง บอกแม่หน่อย… ครบสามก็แตะสองครั้งนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `แม่จะซูมเข้าไปเรื่อย ๆ 🔍 ระหว่างทางแม่โผล่มา 3 ครั้ง แตะทันทีที่เห็น ปลายทางมีของนำโชครออยู่ จับแม่ได้กี่ครั้งบอกแม่ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #หาแม่ #เกมทายใจ`;
  meta = { gift: gift.th };
}

// =====================================================================
if (type === "shell") {
  // 順番当て(シェルゲーム): 光る玉を覚える → 玉が入れ替わる(加速) → 最後に「どれ?」→ 答え
  const X = [180, 540, 900], N = 9;
  const swaps = Array.from({ length: N }, (_, i) => { const a = seed("sa" + i) % 3; const b = (a + 1 + (seed("sb" + i) % 2)) % 3; return [a, b]; });
  const pos = [0, 1, 2]; for (const [a, b] of swaps) { const oa = pos.indexOf(a), ob = pos.indexOf(b); pos[oa] = b; pos[ob] = a; }
  const answer = pos[0] + 1;
  const css = `.orbrow{position:absolute;left:0;top:980px;width:1080px;height:300px}
    .o{position:absolute;top:20px;width:220px;height:220px;margin-left:-110px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#ffe9a8,#f4c95d 55%,#c78f2d);box-shadow:0 0 40px #f4c95d55;display:flex;align-items:center;justify-content:center;font-size:90px;font-weight:800;color:#33260a}
    .o.glow{box-shadow:0 0 130px #fff,0 0 60px #f4c95d} .q{position:absolute;left:0;right:0;top:1330px;font-size:60px;color:#f4c95d;font-weight:800}`;
  const orbs = `<div class="orbrow"><div class="o" id="o0"></div><div class="o" id="o1"></div><div class="o" id="o2"></div></div>`;
  const anim = `var S=${JSON.stringify(swaps)},X=[180,540,900];var pos=[0,1,2];var T0=0.18,T1=0.88;var prog=(t-T0)/(T1-T0)*S.length;var k=t<T0?-1:(t>=T1?S.length:Math.floor(prog));var fr=(t<T0||t>=T1)?0:prog-Math.floor(prog);
    for(var i=0;i<Math.min(Math.max(k,0),S.length);i++){var a=S[i][0],b=S[i][1];var oa=pos.indexOf(a),ob=pos.indexOf(b);pos[oa]=b;pos[ob]=a;}
    for(var o=0;o<3;o++){var x=X[pos[o]],y=0;if(k>=0&&k<S.length){var a2=S[k][0],b2=S[k][1];if(pos[o]===a2||pos[o]===b2){var from=X[pos[o]],to=X[pos[o]===a2?b2:a2];var ee=fr<0.5?2*fr*fr:1-Math.pow(-2*fr+2,2)/2;x=from+(to-from)*ee;y=(pos[o]===a2?-1:1)*Math.sin(fr*3.1416)*110;}}
      var el=document.getElementById('o'+o);el.style.left=x+'px';el.style.top=(20+y)+'px';el.classList.toggle('glow',o===0&&t<T0);el.textContent=(t<T0||t>=T1)?String(pos[o]+1):'';}
    document.getElementById('q').textContent=t<T0?'จำลูกที่สว่างไว้นะ':t<T1?'ตามให้ทัน…':'ลูกไหน? 1 · 2 · 3';`;
  slides = [
    cover("ตามลูกแก้วให้ทัน 👀", "จำลูกที่สว่าง แล้วดูว่าไปอยู่ไหน"),
    { html: page(380, `${STAGE}<h1 style="font-size:66px">จำลูกที่สว่างไว้ ✨\nแล้วตามให้ทันว่าไปอยู่ไหน</h1>${orbs}<div class="q">แม่จะสลับเร็วขึ้นเรื่อย ๆ นะ</div>${ANIM("for(var o=0;o<3;o++){var el=document.getElementById('o'+o);el.style.left=[180,540,900][o]+'px';el.classList.toggle('glow',o===0);el.textContent=String(o+1);}")}`, css), tts: "จำลูกที่สว่างไว้… แล้วตามให้ทันว่าไปอยู่ไหน… แม่จะสลับเร็วขึ้นเรื่อย ๆ นะ", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(380, `${STAGE}<h1 style="font-size:66px">ตามให้ทัน 👀</h1>${orbs}<div class="q" id="q"></div>${ANIM(anim)}`, css), dur: 10, seek: true, animSec: 10 },
    { html: page(380, `${STAGE}<h1 style="font-size:74px">เฉลย: ลูกที่ ${answer} ✨</h1>${orbs}<div class="q">ตามทัน = สัปดาห์นี้ไม่มีใครหลอกลูกได้</div><div class="act" style="position:absolute;left:0;right:0;top:1420px">ตามไม่ทัน? ช้าลงหน่อยนะ… อย่ารีบตัดสินใจเรื่องเงินสัปดาห์นี้</div>${ANIM(`var pos=${JSON.stringify(pos)};for(var o=0;o<3;o++){var el=document.getElementById('o'+o);el.style.left=[180,540,900][pos[o]]+'px';el.classList.toggle('glow',o===0);el.textContent=String(pos[o]+1);}`)}`, css), tts: `เฉลย… ลูกที่ ${["", "หนึ่ง", "สอง", "สาม"][answer]}… ตามทัน สัปดาห์นี้ไม่มีใครหลอกลูกได้ ตาไว ใจนิ่ง… ตามไม่ทัน ช้าลงหน่อยนะ อย่ารีบตัดสินใจเรื่องเงิน`, seek: true, loop: 3, hold: 0.4, botnoiSpeed: SPEED.warm },
    { html: page(520, `${STAGE}<h1>ตามทันไหม? 😼\nบอกแม่ว่าลูกไหน</h1><div class="sub">ถูกก็แตะสองครั้ง 💛<br><span class="gold">duangdeedee.me</span></div>`), tts: "ตามทันไหมลูก… บอกแม่ว่าลูกไหน… ถูกก็แตะสองครั้งนะ", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `จำลูกแก้วที่สว่าง แล้วตามให้ทัน 👀 แม่สลับเร็วขึ้นเรื่อย ๆ สุดท้ายอยู่ลูกไหน? เฉลยท้ายคลิป ตอบในคอมเมนต์ 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #แม่หมอดีดี #ตามให้ทัน #เกมทายใจ`;
  meta = { answer };
}

// =====================================================================
if (type === "daystop") {
  // 曜日カードが流れる → 自分の誕生曜日でタップ → 止めたコマにその曜日の吉色/金運色/避ける色が出ている(サイトへの導線と相性◎)
  const css = `.rail{position:absolute;left:0;top:900px;width:1080px;height:560px;overflow:hidden}
    .card{position:absolute;top:30px;width:620px;height:480px;margin-left:-310px;border-radius:44px;background:#ffffff14;border:4px solid #f4c95d66;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
    .card .d{font-size:72px;font-weight:800} .card .row{display:flex;gap:18px;align-items:center;font-size:36px} .card .sw{width:46px;height:46px;border-radius:50%;border:2px solid #fff6}
    .hint{position:absolute;left:0;right:0;top:1500px;font-size:48px;color:#f4c95d;font-weight:700}`;
  const cards = DAYS.map((d, i) => `<div class="card" id="d${i}"><div class="d">${d.name}</div><div class="row"><span class="sw" style="background:${d.lucky[1]}"></span>มงคล ${d.lucky[0]}</div><div class="row"><span class="sw" style="background:${d.money[1]}"></span>เรียกเงิน ${d.money[0]}</div><div class="row"><span class="sw" style="background:${d.avoid[1]}"></span>เลี่ยง ${d.avoid[0]}</div></div>`).join("");
  const anim = `var off=7*(0.5*t+0.95*t*t);for(var i=0;i<7;i++){var rel=((i-off)%7+7+3.5)%7-3.5;var el=document.getElementById('d'+i);el.style.left=(540+rel*680)+'px';el.style.opacity=Math.abs(rel)<0.5?1:0.55;}`;
  slides = [
    cover("แตะหยุดที่วันเกิดลูก 📅", "สีมงคลอยู่ในการ์ดนั้นเลย"),
    { html: page(380, `${STAGE}<h1 style="font-size:66px">การ์ดวันเกิดจะเลื่อนผ่าน 📅\nแตะหยุดที่วันเกิดของลูก</h1><div class="rail">${cards}</div><div class="hint">สีมงคล · สีเรียกเงิน · สีที่ควรเลี่ยง อยู่ในการ์ด</div>${ANIM("for(var i=0;i<7;i++){var rel=((i-1.0)%7+7+3.5)%7-3.5;document.getElementById('d'+i).style.left=(540+rel*680)+'px';}")}`, css), tts: "การ์ดวันเกิดจะเลื่อนผ่านไปเรื่อย ๆ… แตะหน้าจอหยุด ที่วันเกิดของลูก… สีมงคล สีเรียกเงิน สีที่ควรเลี่ยง อยู่ในการ์ดนั้นเลย", seek: true, loop: 3, hold: 0.2, botnoiSpeed: SPEED.fast },
    { html: page(380, `${STAGE}<h1 style="font-size:66px">แตะหยุดที่วันเกิดลูก 📅</h1><div class="rail">${cards}</div><div class="hint">แม่จะเร่งขึ้นเรื่อย ๆ นะ</div>${ANIM(anim)}`, css), dur: 10, seek: true, animSec: 10 },
    { html: page(520, `${STAGE}<h1>ได้วันของลูกไหม? 😼\nบอกแม่ว่าเกิดวันอะไร</h1><div class="sub">หยุดทันก็แตะสองครั้ง 💛 · สีครบทุกวันที่<br><span class="gold">duangdeedee.me</span></div>`), tts: "ได้วันของลูกไหม… บอกแม่ว่าเกิดวันอะไร… หยุดทันก็แตะสองครั้ง… สีครบทุกวัน อยู่ที่ ดวงดี๊ดี ดอท เอ็มอี", seek: true, loop: 3, hold: 0.3 }
  ];
  caption = `การ์ดวันเกิดเลื่อนผ่าน 📅 แตะหยุดที่วันเกิดของลูก สีมงคล สีเรียกเงิน สีที่ควรเลี่ยง อยู่ในการ์ดนั้นเลย หยุดทันไหม? บอกแม่ว่าเกิดวันอะไร 🐾 duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #สีมงคล #แม่หมอดีดี #วันเกิด #เกมทายใจ`;
  meta = {};
}

// ---------- 冒頭0秒からゲームを動かす (2026-09-08 実測: 4本すべて 0:01 離脱 = 静止した表紙/説明カードが原因) ----------
// 既定で表紙を捨て、「説明の音声」を最初のアニメ・スライドに部品として載せる(音声は同じ文・同じ話速 = キャッシュ維持、0pt)。GAME_INTRO=1 で旧構成
if (!process.env.GAME_INTRO) {
  if (slides[0] && slides[0].noFadeIn && !slides[0].tts) slides.shift();   // 表紙(0.45秒静止)を除去
  const s0 = slides[0], s1 = slides[1];
  if (s0 && s0.tts && s0.loop && s1 && s1.seek && s1.animSec && !s1.tts) {
    // 説明スライド(ループ+音声) → ゲーム・スライド(無音アニメ) の組を 1 枚に統合: ゲーム画面を見せながら説明を読む
    const parts = Array.isArray(s0.tts) ? s0.tts : [{ text: s0.tts, botnoiSpeed: s0.botnoiSpeed }];
    s1.tts = parts.map((p) => (typeof p === "string" ? { text: p, botnoiSpeed: s0.botnoiSpeed } : { botnoiSpeed: s0.botnoiSpeed, ...p }));
    s1.minDur = s1.dur; s1.hold = 0.2; delete s1.dur;
    slides.splice(0, 1);
  }
  if (slides[0]) slides[0].noFadeIn = true;   // 1フレーム目=サムネ。黒から始めない
  // 冒頭の一言(bang): 型ごとに「え!?」を作る挑発・指差し・命令。画面いっぱいに叩き込む
  const BANG = { find: "หาไม่เจอหรอก!", stop: "แตะ!", zoom: "นี่อะไร!?", quiz: "ตอบผิดแน่!", screenshot: "แคป!", flash: "1 กะพริบ!", lucky: "คุณนั่นแหละ!", choose5: "ซ้าย? ขวา?", target: "ตรงไหม!?", elim: "สีคุณจะรอดไหม!?", face: "อย่ากะพริบ!", breath: "หายใจ…", zoomin: "แม่อยู่ไหน!?", shell: "ตามทันไหม!?", daystop: "วันเกิดคุณ!", wake: "ปลุกแม่!" };
  if (slides[0] && !process.env.GAME_NO_COLDOPEN) slides.unshift(coldOpen(slides[0], theme.noble ? "" : (process.env.GAME_BANG ?? (BANG[type] || "")), 0.9, !!theme.noble));   // noble: 叩き込み無し・柔らかい入り
}
// 締めカードに QR (サイト導線)。TTS は不変なのでキャッシュはそのまま
if (slides.length) slides[slides.length - 1].html = withQR(slides[slides.length - 1].html);

// ---------- 生成 ----------
const ttsEngine = process.env.TTS_ENGINE || undefined;
const ttsChars = slides.reduce((a, s) => a + (s.tts || "").length, 0);
const outDir = join(ROOT, "out", `${iso}-${type}${process.env.GAME_SUFFIX || ""}`);
if (process.env.GAME_DRY) { console.log(`[game:${type}] DRY ${iso} tts chars=${ttsChars} (botnoi ≈ ${ttsChars * 2} pt) slides=${slides.length} meta=${JSON.stringify(meta)}`); process.exit(0); }
mkdirSync(outDir, { recursive: true });
console.log(`[game:${type}] ${iso} theme=${theme.name} pal#${PALETTES.indexOf(pal)} motif=${motif} tts=${ttsChars}字 meta=${JSON.stringify(meta)}`);
const out = await renderAnimated({
  out: join(outDir, `${type}.mp4`), size: [1080, 1920], fps: 30, padSec: 0.3, fade: 0.25,
  ttsEngine, botnoiSpeaker: process.env.BOTNOI_SPEAKER, ttsCache: join(ROOT, ".tts-cache"),
  captions: process.env.DD_NO_CAPTIONS ? false : { font: "Prompt", size: 54, marginV: 300 },   // テロップ(無音視聴向け、声と同期。2026-09-08)
  voice: "th-TH-PremwadeeNeural", rate: "+2%", ttsTempo: 1.0,
  music: join(ROOT, "assets", process.env.GAME_NO_COLDOPEN ? "bgm-warm.mp3" : "bgm-warm-hit.mp3"), musicVol: 0.10,
  slides
}, ROOT);
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: type, ...meta }, null, 2));
console.log(`[game:${type}] ✅ ${out}`);
