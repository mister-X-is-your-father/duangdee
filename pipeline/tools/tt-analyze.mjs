#!/usr/bin/env node
// TikTok 日次スナップショットから率と前日差分の表を出す
// 使い方: node tools/tt-analyze.mjs [YYYY-MM-DD]   (省略=最新)  入力: pipeline/stats/tiktok-YYYY-MM-DD.json
// JSON 形式: { date, videos:[{ id, posted, caption, views, avgWatch, fullWatchPct, newFollowers, dropAt, traffic, headCounts:[views,likes,comments,shares,saves], durationSec, format }] }
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), "stats");
const files = readdirSync(DIR).filter((f) => /^tiktok-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!files.length) { console.error("stats がありません"); process.exit(1); }
const want = process.argv[2] ? `tiktok-${process.argv[2]}.json` : files[files.length - 1];
const cur = JSON.parse(readFileSync(join(DIR, want), "utf8"));
const prevFile = files[files.indexOf(want) - 1];
const prev = prevFile ? JSON.parse(readFileSync(join(DIR, prevFile), "utf8")) : null;
const n = (x) => (x == null ? null : Number(String(x).replace(/,/g, "")));
const pct = (a, b) => (a == null || !b ? "-" : ((100 * a) / b).toFixed(1) + "%");

console.log(`# ${cur.date}（前回: ${prev ? prev.date : "なし"}）\n`);
console.log("| 動画 | 型 | 尺 | 視聴 | Δ | 維持率 | フル視聴 | 離脱 | いいね率 | コメ率 | シェア率 | 保存率 | フォロー転換 | おすすめ% |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const v of cur.videos) {
  const [views, likes, comments, shares, saves] = (v.headCounts || []).map(n);
  const V = n(v.views) ?? views;
  const pv = prev?.videos?.find((x) => x.id === v.id);
  const dV = pv ? V - (n(pv.views) ?? n(pv.headCounts?.[0])) : null;
  const dur = v.durationSec ? Number(v.durationSec) : null;
  const keep = v.avgWatch && dur ? ((100 * Number(v.avgWatch)) / dur).toFixed(0) + "%" : "-";
  const fyp = (v.traffic || "").match(/おすすめ ([\d.]+)%/)?.[1];
  console.log(`| ${v.id.slice(-6)} ${v.posted || ""} | ${v.format || "?"} | ${dur ?? "?"}s | ${V ?? "-"} | ${dV == null ? "-" : (dV >= 0 ? "+" : "") + dV} | ${keep} | ${v.fullWatchPct ?? "-"}% | ${v.dropAt || "-"} | ${pct(likes, V)} | ${pct(comments, V)} | ${pct(shares, V)} | ${pct(saves, V)} | ${pct(n(v.newFollowers), V)} | ${fyp ?? "-"}% |`);
}
console.log("\n閾値: 維持率 短尺≥60%/40秒物≥35% · いいね≥5% · コメ≥0.5%(参加型1%) · シェア≥0.5%(自分事化1%) · 保存≥1%(資料型3%) · フォロー転換≥0.5%");
