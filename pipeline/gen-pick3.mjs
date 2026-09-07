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
import { STAGE, makePage, PALETTES as SCENE_PALETTES, MOTIFS } from "./lib/scene.mjs";   // 猫・ページ骨格は gen-short.mjs と共通 (lib/scene.mjs)

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
// キャラ方針 (2026-09-07 ユーザー決定, PERSONA.md): ปากร้ายใจดี = 「代弁で刺す(痛快) → 例え話で腑に落とす → 背中を押す」の3段。
//  刺す相手は「状況・行動・本人の言い訳」だけ(第三者・属性は攻撃しない)。毒は1テーマ1回、直後に必ず優しさで回収。決断の代行はしない
// フック = 冒頭0〜2秒で「代弁の刺し」をいきなり出す(実測: #1/#2 は 0:01 で離脱・平均5.6秒/42秒。「หยุดก่อน」型の前置きは効かなかった)
const HOOKS = [
  { screen: "ยิ้มทั้งที่อยากร้องไห้ 😼\nแม่เห็นนะ", tts: "ยิ้มทั้งที่อยากร้องไห้… แม่เห็นนะลูก… วันนี้แม่พูดแทนให้เอง" },
  { screen: "'ไม่เป็นไร' 😼\nพูดมากี่รอบแล้วลูก", tts: "ไม่เป็นไร… ประโยคนี้ลูกพูดมากี่รอบแล้ว… วันนี้แม่พูดความจริงแทนให้" },
  { screen: "ใจดีจนคนอื่นลืม 😼\nว่าลูกก็เหนื่อยเป็น", tts: "ใจดีจนคนอื่นลืมไปแล้ว ว่าลูกก็เหนื่อยเป็น… มานี่ แม่พูดแทนให้" },
  { screen: "ทนมาพอแล้วลูก 😼\nวันนี้แม่พูดเอง", tts: "ทนมาพอแล้วนะลูก… วันนี้แม่จะพูดสิ่งที่ลูกไม่กล้าพูดให้เอง" }
];
const CHOOSE = { screen: "เลือก 1 ลูก 🔮\nที่ใจเรียก… แตะค้างไว้", tts: "เลือกลูกแก้ว 1 ลูก ที่ใจเรียกนะ… แตะค้างไว้ อย่าเปลี่ยนใจ" };
// 各テーマ: sting=代弁(痛快・速め) / insight=見抜き+腑に落ちる例え(日常の物) / push=背中押し(温かく・ゆっくり)
const THEMES = [
  { key: "พลังใจ", color: "สีเหลือง", hex: "#f5c518", lines: [
    { sting: "เหนื่อยจะแย่อยู่แล้ว ยังยิ้มให้ทุกคนอีก… แม่เห็นหมดนะ อย่าทำเป็นไหว",
      insight: "ลูกเหมือนมือถือแบตสิบเปอร์เซ็นต์ ที่ยังเปิดไฟฉายส่องทางให้คนอื่นอยู่… ไม่แปลกเลยที่จะดับ",
      push: "วันนี้ชาร์จตัวเองก่อน ไม่ต้องขออนุญาตใคร… ใส่สีเหลืองไว้ แล้วค่อยไปต่อพรุ่งนี้" },
    { sting: "ทำให้ทุกคนหมดแล้ว… แล้วใครทำให้ลูกบ้าง ไม่มีใช่ไหม",
      insight: "ต้นไม้ที่ให้ร่มเงาคนทั้งหมู่บ้าน ก็ต้องการฝนเหมือนกันนะลูก",
      push: "ปฏิเสธสัก 1 เรื่องวันนี้ แม่อนุญาต… โลกไม่พังหรอก ลูกต่างหากที่จะพัง" } ] },
  { key: "การเงิน", color: "สีเขียว", hex: "#2e9e5b", lines: [
    { sting: "เงินไม่ได้หายไปไหนหรอก… มันอยู่ในตะกร้าที่ลูกกดสั่งตอนตีสองนั่นแหละ",
      insight: "แม่ไม่ได้ว่านะ… แต่กระเป๋าเงินก็เหมือนกระถางต้นไม้ รดน้ำทุกวันแต่ก้นรั่ว ยังไงก็ไม่โต",
      push: "วันนี้อุดรูรั่วแค่ 1 รู… เอาใบเสร็จเก่าออกจากกระเป๋าตังค์ก็เริ่มแล้ว เงินชอบคนที่ดูแลมันเป็น" },
    { sting: "'เดือนหน้าค่อยเก็บ'… ประโยคนี้ลูกพูดมากี่เดือนแล้ว แม่นับไม่ไหวแล้วนะ",
      insight: "เงินเก็บก็เหมือนหุงข้าว… ไม่ต้องรอหม้อใหญ่ หุงถ้วยเดียวก่อน ยังได้กินก่อนคนที่มัวรอหม้อใหญ่",
      push: "ใส่สีเขียว แล้วเก็บวันนี้ร้อยเดียวก็พอ… แค่เริ่ม แม่ก็ปรบมือให้แล้ว" } ] },
  { key: "ความรัก", color: "สีชมพู", hex: "#ff5d8f", lines: [
    { sting: "รอเขาทักมาทั้งคืน… โทรศัพท์ไม่ได้พังนะลูก ลูกก็รู้",
      insight: "คนที่อยากคุยกับลูกจริง ๆ จะเหมือนแมวหิว… หาทางมาถึงลูกเองโดยไม่ต้องเรียก",
      push: "เลิกเดาใจคนที่ไม่แน่ใจ… แล้วไปเจอคนที่แน่ใจในตัวลูก มีจริงนะ แม่เห็น" },
    { sting: "คนที่ทำให้ลูกร้องไห้บ่อยกว่าหัวเราะ… ถ้าลูกเดินออกมาแล้ว แม่บอกเลย ถูกแล้ว",
      insight: "ที่เจ็บไม่ใช่เพราะเขาดี… แต่เพราะลูกดีเกินไป เหมือนเอาผ้าไหมไปเช็ดรองเท้าให้เขา",
      push: "ใส่สีชมพู แล้วกลับมารักตัวเองก่อนนะ… รอบหน้าแม่จะเปิดตาดูให้ดีกว่านี้" } ] },
  { key: "โอกาส", color: "สีน้ำเงิน", hex: "#2f6fd0", lines: [
    { sting: "ไม่ใช่ไม่มีโอกาสนะลูก… ลูกแค่ปฏิเสธมัน เร็วกว่าที่มันเคาะประตูเสียอีก",
      insight: "โอกาสก็เหมือนรถเมล์… ไม่มาตอนที่เราพร้อม แต่มาตอนที่เรายืนอยู่ที่ป้าย",
      push: "วันนี้ตอบว่า 'ได้' กับเรื่องที่เกือบปฏิเสธ 1 เรื่อง… ไปยืนที่ป้ายก่อน แม่หนุนหลังอยู่" },
    { sting: "รอให้พร้อมก่อนค่อยทำ… แม่รอลูกพร้อมมาเก้าชีวิตแล้วนะ",
      insight: "คนที่ได้ไป ไม่ใช่คนที่เก่งที่สุด… แต่คือคนที่ยกมือก่อน ตอนที่คนเก่งยังลังเล",
      push: "ใส่สีน้ำเงิน แล้วยกมือวันนี้… พลาดก็ยังได้เรื่องเล่า ดีกว่าไม่มีอะไรเลย" } ] },
  { key: "ความสงบ", color: "สีม่วง", hex: "#9d4edd", lines: [
    { sting: "คิดเรื่องเดิมรอบที่ร้อยแล้วลูก… คำตอบมันไม่เปลี่ยนหรอก คนคิดต่างหากที่จะพัง",
      insight: "หัวที่คิดวนทั้งคืน ก็เหมือนมือถือที่เปิดค้างไว้ยี่สิบแอป… เครื่องไม่ได้เสีย แค่ต้องปิดบ้าง",
      push: "คืนนี้วางมือถือ วางเรื่องนั้นไว้กับแม่… ใส่สีม่วง หลับให้ได้ก่อน พรุ่งนี้ค่อยหยิบใหม่" },
    { sting: "ที่เขาพูดมา ลูกเก็บมาคิดสามวัน… เขาลืมไปตั้งแต่นาทีที่สองแล้วนะ",
      insight: "คำพูดของคนที่ไม่รู้จักลูกจริง ก็เหมือนฝนตกบนหลังคา… เสียงดัง แต่ไม่เข้าบ้านสักหยด ถ้าลูกไม่เปิดประตูรับ",
      push: "หายใจลึก ๆ… แล้วปล่อยเขาไปกับลม ลูกมีเรื่องดีกว่านี้ต้องทำ" } ] },
  { key: "เสน่ห์", color: "สีส้ม", hex: "#f77f00", lines: [
    { sting: "ส่องกระจกแล้วบ่นตัวเองอีกแล้ว… แม่ได้ยินนะ",
      insight: "ลูกเห็นตัวเองแค่ในกระจกตอนเช้า… แต่คนอื่นเห็นลูกตอนหัวเราะ ตอนตั้งใจฟัง มันคนละคนกันเลย",
      push: "ใส่สีส้มสักจุด แล้วออกไปให้โลกเห็นคนนั้น… ลูกดูดีกว่าที่คิดเยอะ" },
    { sting: "ลดตัวเองให้เล็กลง เพื่อให้คนอื่นสบายใจ… พอได้แล้วลูก",
      insight: "เทียนไม่ต้องหรี่แสงตัวเอง เพื่อให้เทียนเล่มอื่นดูสว่างขึ้นหรอกนะ",
      push: "วันนี้พูดสิ่งที่คิดออกมา 1 เรื่อง… แม่ยืนอยู่ข้างหลังนี่แหละ" } ] }
];
const CLOSES = [
  // クローズは短く(完了率優先)。URLは画面に出すので読みは軽く
  { screen: "คุณเลือกลูกไหน? 🐾\nบอกแม่หน่อย", tts: "เลือกลูกไหนนะ… บอกแม่หน่อย แม่รออ่านอยู่… สีมงคลเฉพาะคุณ ที่ ดวงดี๊ดี ดอท เอ็มอี" },
  { screen: "โดนไหม? 😼\nบอกแม่ว่าเลือกลูกไหน", tts: "โดนไหมลูก… บอกแม่หน่อยว่าเลือกลูกไหน… สีมงคลตามวันเกิด อยู่ที่ ดวงดี๊ดี ดอท เอ็มอี นะ" }
];
// 話速(botnoi speed): 刺す文は速く・畳みかける、抱く文はゆっくり。同一テンポ=AI感の主因なので文ごとに変える
const SPEED = { sting: Number(process.env.PICK3_SPEED_STING || 1.15), warm: Number(process.env.PICK3_SPEED_WARM || 0.95) };
const PALETTES = SCENE_PALETTES;   // 背景は lib/scene.mjs の10色を共用
const ORDINAL = ["ลูกที่หนึ่ง", "ลูกที่สอง", "ลูกที่สาม"];

// 今日の3テーマ: 決定論的シャッフルの先頭3つ(重複なし)
const themes = THEMES.map((t, i) => ({ t, k: cyrb53(iso + "#t" + i) })).sort((a, b) => a.k - b.k).slice(0, 3).map((x) => x.t);
const hook = pick(HOOKS, "hook"), close = pick(CLOSES, "close"), pal = pick(PALETTES, "pal");

// ---------- キャラ(SVG)・アイドル動作・ページ骨格は lib/scene.mjs に共通化 (2026-09-06) ----------
const motif = pick(MOTIFS, "motif");
const page = makePage(pal, motif);
const stage = STAGE;

// ---------- スライド ----------
const slides = [
  { html: page(560, `${stage}<h1>${hook.screen}</h1>`), tts: hook.tts, botnoiSpeed: SPEED.sting },   // フックも刺し=速め
  { html: page(520, `${stage}<h1>${CHOOSE.screen}</h1><div class="orbs"><div class="orb" data-pulse>1</div><div class="orb" data-pulse>2</div><div class="orb" data-pulse>3</div></div>`), tts: CHOOSE.tts },
  ...themes.flatMap((th, i) => {
    const L = pick(th.lines, "m" + i);
    const head = `${stage}<h1 style="font-size:64px">ลูกที่ ${i + 1} · <span class="gold">${th.key}</span></h1><div class="big" data-pulse style="--c:${th.hex}"></div><div class="chip" style="--c:${th.hex}">${th.color}</div>`;
    return [
      // A: 代弁で刺す(痛快)。速め。画面は刺し文だけ大きく
      { html: page(420, `${head}<div class="msg">😼 ${L.sting}</div>`), tts: `ถ้าเลือก${ORDINAL[i]}… ${L.sting}`, botnoiSpeed: SPEED.sting },
      // B: 例えで腑に落とす → 背中を押す。ゆっくり温かく。刺しから3秒以内に回収する規約
      { html: page(420, `${head}<div class="msg">${L.insight}</div><div class="act">🐾 ${L.push}</div>`), tts: `${L.insight}… ${L.push}`, botnoiSpeed: SPEED.warm }
    ];
  }),
  { html: page(520, `${stage}<h1>${close.screen}</h1><div class="sub">สีมงคลตามวันเกิดคุณ →<br><span class="gold">duangdeedee.me</span></div>`), tts: close.tts }
].map((s) => ({ ...s, seek: true, loop: 3.0, hold: 0.45 }));

// 表紙カット(0.45秒・無音・フェードイン無し) = TikTok/IG の既定サムネ(1フレーム目)。FYPでは自動再生で見えないが、
// プロフィール一覧・検索・フォロー中タブで効く。引き文句「เลือก 1 ใน 3」+日付+3つの玉+猫、パレットは日替わり
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const [, cm, cd] = iso.split("-").map(Number);
const coverHtml = page(460, `${stage}<div class="chip" style="--c:#f4c95d;margin-top:4px">ดวงวันนี้ · ${cd} ${TH_MONTHS[cm - 1]}</div><h1 style="font-size:124px;margin-top:18px">เลือก <span class="gold">1 ใน 3</span> 🔮</h1><div class="sub" style="font-size:56px;color:#fff">วันนี้แม่พูดแทนลูกเอง 😼<br>แรงหน่อย แต่รักนะ</div><div class="orbs" style="margin-top:40px"><div class="orb">1</div><div class="orb">2</div><div class="orb">3</div></div>`);
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
  (th) => `วันนี้แม่ปากร้ายนิดนึง แต่เพื่อลูก 😼 เลือกลูกแก้ว 1 ลูก (${th.join(" · ")}) แล้วดูว่าแม่พูดแทนลูกว่าอะไร คุณเลือกลูกไหน? บอกแม่ในคอมเมนต์นะ 🐾`,
  (th) => `3 ลูกแก้ว 3 เรื่อง (${th.join(" / ")}) สิ่งที่ลูกอยากพูดแต่ไม่กล้า วันนี้แม่พูดให้ 😼 โดนลูกไหน… คอมเมนต์เลขลูกให้แม่หน่อยนะ 🐾`,
  (th) => `แม่หมอดีดีเห็นแล้วว่าลูกทนอะไรอยู่ ${th.join(" · ")} เลือกได้แค่ 1 นะลูก 🔮 โดนไหม? บอกแม่ในคอมเมนต์ แม่รออ่านอยู่ 🐾`,
  (th) => `หยุดก่อน… เลือกลูกแก้วที่ใจเรียก 1 ลูก 🔮 (${th.join(" · ")}) วันนี้แม่พูดแทนลูกเอง แรงหน่อยแต่รักนะ 😼 บอกแม่หน่อยว่าเลือกลูกไหน 🐾`
];
const TAIL_TAGS = ["#เสริมดวง", "#ดวงวันนี้", "#fyp", "#ดวงรายวัน"];   // ハッシュタグは5個まで(ユーザー指示 2026-09-07): 固定4 + 日替わり1
const caption = `${hook.screen.split("\n")[0].replace(/[🐾✨👀]/g, "").trim()} ${pick(CTAS, "cta")(themes.map((t) => t.key))} สีมงคลตามวันเกิดของคุณ → duangdeedee.me (พิมพ์ในเบราว์เซอร์ได้เลย)
#สายมู #ดูดวง #มูเตลู #แม่หมอดีดี ${pick(TAIL_TAGS, "tag")}`;
writeFileSync(join(outDir, "caption.txt"), caption);
writeFileSync(join(outDir, "meta.json"), JSON.stringify({ iso, format: "pick3", themes: themes.map((t) => t.key), hook: hook.screen, palette: pal }, null, 2));
console.log(`[pick3] ✅ ${outMp4}`);
