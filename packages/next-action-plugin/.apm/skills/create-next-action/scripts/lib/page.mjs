// 全リポジトリ・全セッションの未処理を1枚にした HTML のページ

import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { diffLines, NEED_LABEL, OK_LABEL } from "./model.mjs";
import { DATA_DIR, listPending } from "./store.mjs";

export const PAGE_PATH = join(DATA_DIR, "index.html");

// ページが自分で読み直す間隔（秒）
const REFRESH_SECONDS = 5;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 本文の中の URL は、生の URL を文字のまま見せてリンクにする
const richText = (s) =>
  escapeHtml(s).replace(/https?:\/\/[^\s<>"']+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

function renderDiff(d) {
  const lines = diffLines(d.diff)
    .map((l) => {
      const cls = l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : "ctx";
      return `<span class="${cls}">${escapeHtml(l) || " "}</span>`;
    })
    // 行は span の display: block で分ける。改行も入れると pre の中で行が空く
    .join("");
  return `<figure class="diff"><figcaption>${escapeHtml(d.file)}</figcaption><pre>${lines}</pre></figure>`;
}

function renderAction(a) {
  const rows = [];
  if (a.replaces_seq) rows.push(["", `A${a.replaces_seq} の出し直し`]);
  if (a.risk_note) rows.push(["懸念", richText(a.risk_note)]);
  rows.push(["ok なら", richText(a.on_ok)], ["ng なら", richText(a.on_ng)]);
  return `<article class="item">
  <h4><span class="seq">A${a.seq}</span><span class="title">${richText(a.title)}</span></h4>
  <p class="badges"><span class="badge">${OK_LABEL[a.ok_forecast]}</span><span class="badge">${NEED_LABEL[a.need_forecast]}</span></p>
  <dl>${rows.map(([k, v]) => (k ? `<dt>${k}</dt><dd>${v}</dd>` : `<dd class="note">${v}</dd>`)).join("")}</dl>
  ${a.diffs.map(renderDiff).join("\n")}
</article>`;
}

function renderRequest(q) {
  const rows = [];
  if (q.replaces_seq) rows.push(["", `R${q.replaces_seq} の出し直し`]);
  if (q.steps) rows.push(["手順", richText(q.steps)]);
  if (q.hand_back) rows.push(["返してほしいもの", richText(q.hand_back)]);
  return `<article class="item">
  <h4><span class="seq">R${q.seq}</span><span class="title">${richText(q.title)}</span></h4>
  ${rows.length ? `<dl>${rows.map(([k, v]) => (k ? `<dt>${k}</dt><dd>${v}</dd>` : `<dd class="note">${v}</dd>`)).join("")}</dl>` : ""}
</article>`;
}

// 全リポジトリ・全セッションの未処理のアクションと未完了の依頼を1枚に出す。後回しは出さない
function renderPage(db) {
  const { actions, requests } = listPending(db);
  const sessions = new Map();
  for (const s of db.prepare("SELECT id, repository FROM sessions").all()) {
    sessions.set(s.id, { ...s, actions: [], requests: [], latest: "" });
  }
  for (const a of actions) sessions.get(a.session_id).actions.push(a);
  for (const q of requests) sessions.get(q.session_id).requests.push(q);
  const shown = [...sessions.values()].filter((s) => s.actions.length || s.requests.length);
  for (const s of shown) s.latest = [...s.actions, ...s.requests].map((x) => x.created_at).sort().at(-1);
  // 新しく出たものがあるセッションを上に
  shown.sort((x, y) => (x.latest < y.latest ? 1 : x.latest > y.latest ? -1 : 0));
  const body = shown.length
    ? shown
        .map(
          (s) => `<section class="session">
  <h2>${escapeHtml(s.repository)}</h2>
  <p class="meta">セッション ${escapeHtml(s.id)}</p>
  ${s.requests.length ? `<h3>お願いしている作業（未完了）</h3>\n${s.requests.map(renderRequest).join("\n")}` : ""}
  ${s.actions.length ? `<h3>ネクストアクション（未処理）</h3>\n${s.actions.map(renderAction).join("\n")}` : ""}
</section>`,
        )
        .join("\n")
    : `<p class="empty">未処理のネクストアクション・お願いしている作業はありません</p>`;
  const updated = new Date().toLocaleString("ja-JP");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="${REFRESH_SECONDS}">
<title>ネクストアクション</title>
<style>
:root { --bg: #fafaf9; --fg: #1c1917; --muted: #78716c; --card: #ffffff; --line: #e7e5e4; --accent: #2563eb;
  --add-bg: #dcfce7; --add-fg: #14532d; --del-bg: #fee2e2; --del-fg: #7f1d1d; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #1c1917; --fg: #f5f5f4; --muted: #a8a29e; --card: #292524; --line: #44403c; --accent: #60a5fa;
    --add-bg: #14532d; --add-fg: #dcfce7; --del-bg: #7f1d1d; --del-fg: #fee2e2; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.6 system-ui, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 16px; }
h1 { font-size: 1.4rem; margin: 0 0 4px; }
h2 { font-size: 1.15rem; margin: 0; }
h3 { font-size: 1rem; margin: 16px 0 8px; color: var(--muted); }
h4 { font-size: 1rem; margin: 0 0 6px; display: flex; gap: 8px; }
.meta { color: var(--muted); font-size: 0.85rem; margin: 0 0 8px; overflow-wrap: anywhere; }
.session { border-top: 1px solid var(--line); padding: 16px 0; }
.item { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin: 0 0 12px; }
.seq { font-weight: 700; white-space: nowrap; }
.title, dd { white-space: pre-wrap; overflow-wrap: anywhere; }
.badges { margin: 0 0 6px; display: flex; gap: 6px; }
.badge { border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; font-size: 0.8rem; }
dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; }
dt { color: var(--muted); }
dd { margin: 0; }
dd.note { grid-column: 1 / -1; color: var(--muted); }
a { color: var(--accent); }
.diff { margin: 10px 0 0; }
.diff figcaption { font: 0.8rem ui-monospace, monospace; color: var(--muted); }
.diff pre { margin: 4px 0 0; padding: 8px; border: 1px solid var(--line); border-radius: 6px; overflow-x: auto; font: 0.8rem/1.5 ui-monospace, monospace; }
.diff span { display: block; }
.diff .add { background: var(--add-bg); color: var(--add-fg); }
.diff .del { background: var(--del-bg); color: var(--del-fg); }
.empty { color: var(--muted); }
</style>
</head>
<body>
<main>
<h1>ネクストアクション</h1>
<p class="meta">更新 ${escapeHtml(updated)}（${REFRESH_SECONDS} 秒ごとに読み直す）</p>
${body}
</main>
</body>
</html>
`;
}

// 書きかけのページを読ませないよう、一時ファイルに書いてから置き換える。呼び出しは重なるので一時ファイルはプロセスごとに分ける
export function writePage(db) {
  const tmp = `${PAGE_PATH}.tmp.${process.pid}`;
  writeFileSync(tmp, renderPage(db));
  renameSync(tmp, PAGE_PATH);
}
