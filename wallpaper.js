// วอลเปเปอร์เสริมดวง generator (canvas 1080x1920)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawWallpaper(canvas, opts) {
  // opts: { hex, accent, name, lucky2, lucky3, dayName, seed }
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const rnd = mulberry32(opts.seed);

  // พื้นหลัง: ไล่เฉดสีประจำวันเกิด → ท้องฟ้ากลางคืน
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0d0b26");
  g.addColorStop(0.55, shade(opts.hex, -60));
  g.addColorStop(1, shade(opts.hex, -25));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ดาว
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W, y = rnd() * H * 0.85;
    const r = rnd() * 2.2 + 0.4;
    ctx.globalAlpha = 0.25 + rnd() * 0.65;
    ctx.fillStyle = i % 7 === 0 ? opts.accent : "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // วงแหวนพลัง (เรขาคณิต ไม่มีสัญลักษณ์ศาสนา)
  const cx = W / 2, cy = H * 0.40;
  for (let ring = 0; ring < 4; ring++) {
    ctx.strokeStyle = ring % 2 === 0 ? opts.accent : "#ffffff";
    ctx.globalAlpha = 0.16 + ring * 0.05;
    ctx.lineWidth = 2 + ring;
    ctx.beginPath(); ctx.arc(cx, cy, 190 + ring * 55, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 + rnd() * 0.1;
    const r1 = 190, r2 = 355;
    ctx.strokeStyle = opts.accent; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ดวงกลางเรืองแสง
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 185);
  glow.addColorStop(0, "#fff7e0");
  glow.addColorStop(0.35, opts.accent);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, 185, 0, Math.PI * 2); ctx.fill();

  // ตัวเลขนำโชค
  ctx.textAlign = "center";
  ctx.fillStyle = "#2a1f0e";
  ctx.font = "700 150px Prompt, sans-serif";
  ctx.fillText(opts.lucky2, cx, cy + 55);

  // ข้อความ
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 64px Prompt, sans-serif";
  ctx.fillText(opts.name ? "ดวงดี๊ดีของ " + opts.name : "ดวงดี๊ดีของฉัน", cx, H * 0.62);
  ctx.fillStyle = opts.accent;
  ctx.font = "500 46px Prompt, sans-serif";
  ctx.fillText("เลขนำโชค " + opts.lucky2 + " · " + opts.lucky3, cx, H * 0.62 + 80);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "400 40px Prompt, sans-serif";
  ctx.fillText("พลัง" + opts.dayName + " คุ้มครองสัปดาห์นี้", cx, H * 0.62 + 150);

  // ลายเซ็นแบรนด์
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 34px Prompt, sans-serif";
  ctx.fillText("🐱 ดวงดี๊ดี · deedee.me", cx, H - 90);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
