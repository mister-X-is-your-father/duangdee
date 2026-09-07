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
import { STAGE, makePage } from "./lib/scene.mjs";   // 猫・ページ骨格は gen-short.mjs と共通 (lib/scene.mjs)

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

// ---------- キャラ(SVG)・アイドル動作・ページ骨格は lib/scene.mjs に共通化 (2026-09-06) ----------
const page = makePage(pal);
const stage = STAGE;

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

// 表紙カット(0.45秒・無音・フェードイン無し) = TikTok/IG の既定サムネ(1フレーム目)。FYPでは自動再生で見えないが、
// プロフィール一覧・検索・フォロー中タブで効く。引き文句「เลือก 1 ใน 3」+日付+3つの玉+猫、パレットは日替わり
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const [, cm, cd] = iso.split("-").map(Number);
const coverHtml = page(460, `${stage}<div class="chip" style="--c:#f4c95d;margin-top:4px">ดวงวันนี้ · ${cd} ${TH_MONTHS[cm - 1]}</div><h1 style="font-size:124px;margin-top:18px">เลือก <span class="gold">1 ใน 3</span> 🔮</h1><div class="sub" style="font-size:56px;color:#fff">แม่หมอดีดีเห็นอะไร<br>ในดวงคุณ?</div><div class="orbs" style="margin-top:40px"><div class="orb">1</div><div class="orb">2</div><div class="orb">3</div></div>`);
const coverSlide = { html: coverHtml, dur: 0.45, noFadeIn: true };
if (!process.env.PICK3_NO_COVER) slides.unshift(coverSlide);

// ---------- 生成 ----------
// TTS エンジン: $TTS_ENGINE = botnoi | elevenlabs | edge。未指定は anim.mjs の自動判定(ELEVENLABS鍵+声IDがあれば elevenlabs、無ければ edge)
//  botnoi(タイ企業ネイティブ声) は $BOTNOI_API_KEY + $BOTNOI_SPEAKER(話者ID。候補: 32=น้าเกรซ warm / 50=ครูดีดี๊ slow・trust / 60=เหมียว)。V2声=2 point/文字
const ttsEngine = process.env.TTS_ENGINE || undefined;
const engineEff = ttsEngine || ((process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) ? "elevenlabs" : "edge");
const ttsChars = slides.reduce((a, s) => a + (s.tts || "").length, 0);
const outDir = join(ROOT, "out", iso + "-pick3" + (process.env.PICK3_SUFFIX || ""));   // PICK3_SUFFIX=-botnoi 等で別フォルダに出し比較できる
if (process.env.PICK3_DRY) {   // 生成せず文字数だけ(Botnoi の point 見積り用)
  console.log(`[pick3] DRY ${iso} engine=${engineEff} tts chars=${ttsChars} (botnoi V2 ≈ ${ttsChars * 2} point)`);
  process.exit(0);
}
mkdirSync(outDir, { recursive: true });
console.log(`[pick3] ${iso} — テーマ: ${themes.map((t) => t.key).join(" / ")} | hook#${HOOKS.indexOf(hook)} pal#${PALETTES.indexOf(pal)} | tts=${engineEff} ${ttsChars}字`);
const coverOnly = !!process.env.PICK3_COVER_ONLY;   // PICK3_COVER_ONLY=1: 表紙カットだけ cover.mp4 に描画(既存動画へ後付けする用、TTS消費ゼロ)
const outMp4 = process.env.PICK3_CAPTION_ONLY ? join(outDir, "pick3.mp4") : await renderAnimated({   // PICK3_CAPTION_ONLY=1: 動画は作らず caption/meta だけ更新
  out: join(outDir, coverOnly ? "cover.mp4" : "pick3.mp4"), size: [1080, 1920], fps: 30, padSec: 0.35, fade: 0.25,
  ttsEngine, botnoiSpeaker: process.env.BOTNOI_SPEAKER,
  ttsCache: join(ROOT, ".tts-cache"),                     // 同じ声×同じ文は再合成しない(再レンダ無料)。gitignore 済み
  voice: "th-TH-PremwadeeNeural", rate: "+2%",            // edge-tts 用
  ttsTempo: engineEff === "elevenlabs" ? 1.18 : 1.0,      // ElevenLabs v3 はタイ語がゆっくり(実測 edge比 +20%)→ピッチ不変で1.18倍速。botnoi/edge は素のまま
  music: coverOnly ? undefined : join(ROOT, "assets", "bgm-warm.mp3"), musicVol: 0.10,
  slides: coverOnly ? [coverSlide] : slides
}, ROOT);

// キャプションも日替わり(同一文の連投=テンプレ反復シグナルを避ける)。テーマ名を織り込み、CTA文とタグ末尾を seed で回す
const CTAS = [
  (th) => `เลือกลูกแก้ว 1 ลูก แล้วดูว่าแม่หมอดีดีเห็นอะไร 🔮 วันนี้มี ${th.join(" · ")} คุณเลือกลูกไหน? บอกแม่ในคอมเมนต์นะ 🐾`,
  (th) => `3 ลูกแก้ว 3 เรื่อง (${th.join(" / ")}) ใจคุณเรียกลูกไหน… แตะค้างไว้แล้วมาดูกัน 🔮 คอมเมนต์เลขลูกที่เลือกให้แม่หน่อยนะ 🐾`,
  (th) => `แม่หมอดีดีมีของขวัญ 3 อย่าง ${th.join(" · ")} เลือกได้แค่ 1 นะลูก 🔮 เลือกแล้วบอกแม่ในคอมเมนต์ แม่รออ่านอยู่ 🐾`,
  (th) => `หยุดก่อน… เลือกลูกแก้วที่ใจเรียก 1 ลูก 🔮 (${th.join(" · ")}) แล้วดูว่าแม่เห็นอะไรในดวงคุณ บอกแม่หน่อยว่าเลือกลูกไหน 🐾`
];
const TAIL_TAGS = ["#เสริมดวง", "#ดวงวันนี้", "#fyp", "#ดวงรายวัน"];   // ハッシュタグは5個まで(ユーザー指示 2026-09-07): 固定4 + 日替わり1
const caption = `${hook.screen.split("\n")[0].replace(/[🐾✨👀]/g, "").trim()} ${pick(CTAS, "cta")(themes.map((t) => t.key))} สีมงคลตามวันเกิดของคุณ → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #มูเตลู #แม่หมอดีดี ${pick(TAIL_TAGS, "tag")}`;
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: "pick3", themes: themes.map((t) => t.key), hook: hook.screen, palette: pal }, null, 2));
console.log(`[pick3] ✅ ${outMp4}`);
