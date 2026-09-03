// วอลเปเปอร์เสริมดวง generator (canvas 1080x1920)
// จุดขาย: "3 สีเสริมดวงเฉพาะคุณ" (สีมงคล/สีเรียกเงิน/สีกาลกิณี ตามวันเกิด) + ความรู้สึก "แม่หมอเลือกให้คุณคนเดียว"
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawWallpaper(canvas, opts) {
  // opts: { hex, accent, name, lucky2, lucky3, dayName, seed, luckyName, moneyName, moneyHex, avoidName, avoidHex, golden }
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const rnd = mulberry32(opts.seed >>> 0);
  const cx = W / 2;

  // พื้นหลัง: ท้องฟ้ากลางคืน → ไล่เฉดสีมงคลของคุณ
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b0a1f");
  g.addColorStop(0.5, shade(opts.hex, -72));
  g.addColorStop(1, shade(opts.hex, -34));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ดาว
  for (let i = 0; i < 150; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = rnd() * 2.1 + 0.4;
    ctx.globalAlpha = 0.2 + rnd() * 0.6;
    ctx.fillStyle = i % 6 === 0 ? opts.accent : "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";

  // หัวเรื่อง
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "500 34px Prompt, sans-serif";
  ctx.fillText("🐱 วอลเปเปอร์เสริมดวงเฉพาะคุณ", cx, 98);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 62px Prompt, sans-serif";
  ctx.fillText(opts.name ? "ของคุณ " + clip(opts.name, 12) : "ของคุณ", cx, 172);

  // ---- ลูกแก้วพลัง (เรขาคณิต ไม่มีสัญลักษณ์ศาสนา) ----
  const oy = 470;
  for (let ring = 0; ring < 4; ring++) {
    ctx.strokeStyle = ring % 2 === 0 ? opts.accent : "#ffffff";
    ctx.globalAlpha = 0.14 + ring * 0.05;
    ctx.lineWidth = 2 + ring;
    ctx.beginPath(); ctx.arc(cx, oy, 150 + ring * 46, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 + rnd() * 0.08;
    ctx.strokeStyle = opts.accent; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 150, oy + Math.sin(a) * 150);
    ctx.lineTo(cx + Math.cos(a) * 288, oy + Math.sin(a) * 288);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(cx, oy, 8, cx, oy, 150);
  glow.addColorStop(0, "#fff7e0");
  glow.addColorStop(0.4, opts.accent);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, oy, 150, 0, Math.PI * 2); ctx.fill();
  // เลขนำโชคในลูกแก้ว
  ctx.fillStyle = "#2a1f0e";
  ctx.font = "600 40px Prompt, sans-serif";
  ctx.fillText("เลขนำโชค", cx, oy - 40);
  ctx.font = "700 128px Prompt, sans-serif";
  ctx.fillText(opts.lucky2, cx, oy + 52);
  ctx.font = "600 46px Prompt, sans-serif";
  ctx.fillText("· " + opts.lucky3, cx, oy + 112);

  // ---- 3 สีเสริมดวงเฉพาะคุณ ----
  const ty = 838;
  ctx.fillStyle = opts.accent;
  ctx.font = "600 42px Prompt, sans-serif";
  ctx.fillText("✨ 3 สีเสริมดวงเฉพาะคุณ", cx, ty);

  const cols = [
    { hex: opts.hex, name: opts.luckyName, cap: "มงคล" },
    { hex: opts.moneyHex, name: opts.moneyName, cap: "เรียกเงิน 💰" },
    { hex: opts.avoidHex, name: opts.avoidName, cap: "ควรเลี่ยง ⚠️", dim: true }
  ];
  const boxW = 236, gap = 44;
  const startX = cx - (boxW * 3 + gap * 2) / 2;
  const boxY = ty + 62;
  cols.forEach((c, i) => {
    const x = startX + i * (boxW + gap);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "500 30px Prompt, sans-serif";
    ctx.fillText(c.cap, x + boxW / 2, boxY - 20);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.globalAlpha = c.dim ? 0.72 : 1;
    ctx.fillStyle = c.hex;
    rr(ctx, x, boxY, boxW, boxW, 34); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = c.dim ? "rgba(255,150,150,0.7)" : "rgba(255,255,255,0.38)";
    ctx.lineWidth = 3;
    rr(ctx, x, boxY, boxW, boxW, 34); ctx.stroke();

    ctx.fillStyle = c.dim ? "#ffb3b3" : "#ffffff";
    ctx.font = "600 36px Prompt, sans-serif";
    ctx.fillText(c.name, x + boxW / 2, boxY + boxW + 46);
  });

  // ---- ข้อความอบอุ่น (ความรู้สึกพิเศษเฉพาะคุณ) ----
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "400 37px Prompt, sans-serif";
  wrapText(ctx, "แม่หมอเลือก 3 สีนี้ให้ลูกคนเดียว พกไว้แล้วโชคดีจะเดินเข้าหาคุณเอง 🐾", cx, boxY + boxW + 132, W - 150, 52);

  // วันทอง
  ctx.fillStyle = opts.accent;
  ctx.font = "500 36px Prompt, sans-serif";
  wrapText(ctx, "⏰ วันทองของคุณ " + (opts.golden || ""), cx, H - 196, W - 140, 46);

  // ลายเซ็นแบรนด์
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "500 34px Prompt, sans-serif";
  ctx.fillText("🐱 ดวงดี๊ดี · duangdeedee.me", cx, H - 90);
}

// ---- helpers ----
function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + "…" : s; }

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy); line = w; yy += lh;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
