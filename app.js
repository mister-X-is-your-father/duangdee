// DuangDee app — ประมวลผลบนเครื่องผู้ใช้ทั้งหมด (ไม่ส่งวันเกิดไปเซิร์ฟเวอร์)

// ---------- telemetry (Google Forms, ไม่ระบุตัวตน) ----------
const TELEMETRY_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdJf52TO3xGXXzlZk-rMIesCkf5xFGIjvmbz8vH0cbsGHOBUQ/formResponse";
const T_ENTRY = { event: "entry.1196665791", detail: "entry.578995236", contact: "entry.1352463319" };

function track(event, detail, contact) {
  try {
    const body = new URLSearchParams();
    body.set(T_ENTRY.event, event);
    body.set(T_ENTRY.detail, detail || "");
    body.set(T_ENTRY.contact, contact || "");
    navigator.sendBeacon
      ? navigator.sendBeacon(TELEMETRY_URL, body)
      : fetch(TELEMETRY_URL, { method: "POST", mode: "no-cors", body });
  } catch (e) { /* telemetry ต้องไม่ทำให้แอปพัง */ }
}

// ---------- engine ----------
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

function currentWeek() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return now.getFullYear() * 100 + Math.ceil((((now - jan1) / 86400000) + jan1.getDay() + 1) / 7);
}

function weekRangeLabel() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const f = (d) => d.getDate() + " " + THAI_MONTHS_ABBR[d.getMonth()];
  return f(mon) + " – " + f(sun);
}

function computeReading(name, d, m, yearInput) {
  // รองรับทั้ง พ.ศ. และ ค.ศ.
  const ce = yearInput > 2200 ? yearInput - 543 : yearInput;
  const date = new Date(ce, m - 1, d);
  if (date.getFullYear() !== ce || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  if (ce < 1900 || ce > new Date().getFullYear()) return null;

  const week = currentWeek();
  const seed = cyrb53(d + "-" + m + "-" + ce + "-w" + week);
  const dayIdx = date.getDay();
  const zIdx = (((ce - 4) % 12) + 12) % 12;
  const day = DAYS[dayIdx];

  const tip = SECRET_TIPS[(seed >>> 7) % SECRET_TIPS.length]
    .replaceAll("{color}", day.color).replaceAll("{day}", day.name);

  return {
    name: name.trim(), ce, dayIdx, zIdx, week, seed,
    day, zodiac: ZODIAC[zIdx],
    twists: [TWISTS[seed % TWISTS.length], TWISTS[(seed >>> 3) % TWISTS.length], TWISTS[(seed >>> 5) % TWISTS.length]],
    lucky2: String(seed % 100).padStart(2, "0"),
    lucky3: String(Math.floor(seed / 100) % 1000).padStart(3, "0"),
    goldenDay: WEEKDAY_NAMES[(seed >>> 9) % 7],
    goldenSlot: GOLDEN_SLOTS[(seed >>> 11) % GOLDEN_SLOTS.length],
    tip
  };
}

// ---------- UI ----------
let READING = null;
const $ = (id) => document.getElementById(id);
const unlockKey = () => "dd_unlock_" + currentWeek();
const isUnlocked = () => { try { return localStorage.getItem(unlockKey()) === "1"; } catch (e) { return false; } };
function setUnlocked() { try { localStorage.setItem(unlockKey(), "1"); } catch (e) { } }

function init() {
  const daySel = $("f-day"), monSel = $("f-month");
  for (let i = 1; i <= 31; i++) daySel.add(new Option(i, i));
  THAI_MONTHS.forEach((mn, i) => monSel.add(new Option(mn, i + 1)));
  $("week-label").textContent = "ดวงประจำสัปดาห์ " + weekRangeLabel();
  $("f-go").addEventListener("click", onSubmit);
  $("btn-pay").addEventListener("click", onPayClick);
  $("btn-share").addEventListener("click", onShareClick);
  $("modal-close").addEventListener("click", () => $("modal").classList.add("hidden"));
  $("modal-send").addEventListener("click", onWaitlistSend);
  $("btn-wallpaper").addEventListener("click", onWallpaperDl);
  $("m-go").addEventListener("click", onMaemorClick);
  $("m-voice").addEventListener("click", onMaemorVoice);
  const src = new URLSearchParams(location.search).get("s") || "";
  track("visit", (src ? "src:" + src + " " : "") + "ref:" + (document.referrer || "direct"));
}

function onSubmit() {
  const name = $("f-name").value || "";
  const d = +$("f-day").value, m = +$("f-month").value, y = +$("f-year").value;
  if (!y) { toast("กรอกปีเกิดด้วยนะ 🐾"); return; }
  const r = computeReading(name, d, m, y);
  if (!r) { toast("วันเกิดไม่ถูกต้อง ลองเช็กอีกทีนะ"); return; }
  READING = r;
  renderReading(r);
  track("reading_done", r.day.name + "/" + r.zodiac.name);
  $("screen-form").classList.add("hidden");
  $("screen-result").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (isUnlocked()) revealSecret();
}

function renderReading(r) {
  $("r-title").textContent = (r.name ? "คุณ" + r.name : "คุณ") + " · " + r.zodiac.emoji + " " + r.zodiac.name;
  $("r-sub").textContent = "เกิด" + r.day.name + " " + r.day.color + " · " + r.day.power;
  $("r-week").textContent = "ดวงประจำสัปดาห์ " + weekRangeLabel();
  $("r-trait").textContent = r.day.trait;
  document.documentElement.style.setProperty("--day-color", r.day.hex);
  document.documentElement.style.setProperty("--day-accent", r.day.accent);
  renderLuckyItem(r);
  $("r-love").textContent = r.zodiac.love + " " + r.twists[0];
  $("r-work").textContent = r.zodiac.work + " " + r.twists[1];
  $("r-money").textContent = r.zodiac.money + " " + r.twists[2];
}

// アフィリエイト: 承認後に Involve Asia のディープリンクベースへ差替える
const AFFILIATE_BASE = null; // 例: "https://invol.co/aff_m?offer_id=...&url="
function shopeeUrl(q) {
  const raw = "https://shopee.co.th/search?keyword=" + encodeURIComponent(q);
  return AFFILIATE_BASE ? AFFILIATE_BASE + encodeURIComponent(raw) : raw;
}

function renderLuckyItem(r) {
  const li = LUCKY_ITEMS[r.dayIdx];
  $("r-item").textContent = li.item + " — " + li.why;
  $("btn-item").onclick = () => {
    track("affil_click", li.q);
    window.open(shopeeUrl(li.q), "_blank", "noopener");
  };
}

function revealSecret() {
  const r = READING; if (!r) return;
  $("locked-view").classList.add("hidden");
  $("secret-view").classList.remove("hidden");
  $("s-lucky").textContent = r.lucky2 + " · " + r.lucky3;
  $("s-golden").textContent = r.goldenDay + " " + r.goldenSlot;
  $("s-tip").textContent = r.tip;
  drawWallpaper($("wp-canvas"), {
    hex: r.day.hex, accent: r.day.accent, name: r.name,
    lucky2: r.lucky2, lucky3: r.lucky3, dayName: r.day.name, seed: r.seed
  });
}

// ---------- แม่หมอ (美輪明宏式AI鑑定) ----------
const MAEMOR_API = "https://leo.tail65add4.ts.net:10000/reading";

async function onMaemorClick() {
  const r = READING; if (!r) return;
  const btn = $("m-go");
  const worry = $("m-worry").value.trim();
  btn.disabled = true;
  btn.textContent = "แม่หมอกำลังเพ่งดวงของคุณ... 🔮";
  track("maemor_request", worry ? "with_worry" : "no_worry");
  try {
    const res = await fetch(MAEMOR_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: r.name, dayIdx: r.dayIdx, worry })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "ลองใหม่อีกครั้งนะ"); return; }
    $("m-out").classList.remove("hidden");
    typewrite($("m-text"), data.reading);
    $("m-go").classList.add("hidden");
    track("maemor_done", "");
  } catch (e) {
    toast("แม่หมอขอพักแป๊บนึง ลองใหม่อีกครั้งนะ 🐾");
  } finally {
    btn.disabled = false;
    btn.textContent = "ขอคำทำนายจากแม่หมอ ✨";
  }
}

let twTimer;
function typewrite(el, text) {
  clearInterval(twTimer);
  el.textContent = "";
  let i = 0;
  twTimer = setInterval(() => {
    i = Math.min(text.length, i + 3);
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(twTimer);
  }, 33);
}

function onMaemorVoice() {
  const text = $("m-text").textContent;
  if (!text || !window.speechSynthesis) { toast("อุปกรณ์นี้ไม่รองรับเสียงพูด"); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "th-TH";
  u.rate = 0.95;
  const th = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("th"));
  if (th) u.voice = th;
  speechSynthesis.speak(u);
  track("maemor_voice", "");
}

function onPayClick() {
  track("unlock_click", "price_thb29");
  $("modal").classList.remove("hidden");
}

function onWaitlistSend() {
  const c = $("modal-contact").value.trim();
  if (!c) { toast("กรอกอีเมลหรือ LINE ID ก่อนนะ"); return; }
  track("email_submit", "discount50", c);
  $("modal").classList.add("hidden");
  setUnlocked(); revealSecret();
  toast("ขอบคุณค่ะ 🎁 ปลดล็อกให้ฟรีรอบนี้เลย!");
}

async function onShareClick() {
  const data = {
    title: "ดวงดี DuangDee",
    text: "ลองดูดวงฟรีกับน้องดวงดี 🐱🔮 บอกแค่วันเกิดก็รู้ดวงทั้งสัปดาห์!",
    url: location.origin + location.pathname + "?s=sh"
  };
  try {
    if (navigator.share) { await navigator.share(data); track("share_unlock", "webshare"); }
    else {
      await navigator.clipboard.writeText(data.text + " " + data.url);
      toast("คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย!");
      track("share_unlock", "clipboard");
    }
    setUnlocked(); revealSecret();
  } catch (e) { /* ผู้ใช้ยกเลิกการแชร์ */ }
}

function onWallpaperDl() {
  track("wallpaper_dl", READING ? READING.day.name : "");
  const canvas = $("wp-canvas");
  canvas.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "duangdee-wallpaper.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
  toast("กำลังบันทึกวอลเปเปอร์... ถ้าไม่ขึ้น ให้กดค้างที่รูปแล้วเลือกบันทึก");
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
}

document.addEventListener("DOMContentLoaded", init);
