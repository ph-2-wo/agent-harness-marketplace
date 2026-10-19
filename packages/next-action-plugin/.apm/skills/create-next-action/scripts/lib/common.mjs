// CLI と hook の両方が使うもの。標準入力・リポジトリ名・セッションの ID・出力の整形・番号の読み取り

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { isSeq, NEED_LABEL, OK_LABEL } from "./model.mjs";

export function readStdin() {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// origin の末尾の owner/repo だけを使う。取れなければディレクトリ名
export function repository(cwd) {
  try {
    const origin = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    })
      .trim()
      .replace(/\/+$/, "");
    const parts = origin.split(/[/:]/).filter(Boolean);
    if (parts.length >= 2) return `${parts.at(-2)}/${parts.at(-1).replace(/\.git$/, "")}`;
  } catch {
    // 下のディレクトリ名に落とす
  }
  return basename(cwd);
}

// --session が無いときのセッション。同じリポジトリの会話は全部これを共有する
export const repositorySessionId = (repo) => `repo:${repo}`;

const shellQuote = (s) => (/^[A-Za-z0-9_.:@%+=/-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

// このスクリプトを実パスとセッションで呼ぶ書き方。文脈に差し込んで、エージェントがそのまま使えるようにする
// 出すのは lib/ のこのファイルではなく、隣の入口 na.mjs の実パス
export function selfCommand(sid) {
  return `node "${fileURLToPath(new URL("../na.mjs", import.meta.url))}" --session ${shellQuote(sid)}`;
}

export function format(actions) {
  return actions
    .map((a) => {
      const lines = [
        `- **A${a.seq}** ${indent(a.title)}`,
        `  - 予想: ${OK_LABEL[a.ok_forecast] ?? a.ok_forecast}・${NEED_LABEL[a.need_forecast] ?? a.need_forecast}`,
      ];
      if (a.replaces_seq) lines.push(`  - A${a.replaces_seq} の出し直し`);
      if (a.risk_note) lines.push(`  - 懸念: ${indent(a.risk_note)}`);
      lines.push(`  - ok なら: ${indent(a.on_ok)}`, `  - ng なら: ${indent(a.on_ng)}`);
      // 差分はファイル名だけを、重複を除いて出す。本文はページで見る
      if (a.diffs.length) lines.push(`  - 差分あり（${[...new Set(a.diffs.map((d) => d.file))].join("、")}）`);
      return lines.join("\n");
    })
    .join("\n");
}

// 本文の改行は、箇条の中で改行として見せる（行末の空白2つで改行させる）
const indent = (s) => s.split("\n").join("  \n  ");

export function formatRequests(requests) {
  return requests
    .map((q) => {
      const lines = [`- **R${q.seq}** ${indent(q.title)}`];
      if (q.replaces_seq) lines.push(`  - R${q.replaces_seq} の出し直し`);
      if (q.steps) lines.push(`  - 手順: ${indent(q.steps)}`);
      if (q.hand_back) lines.push(`  - 返してほしいもの: ${indent(q.hand_back)}`);
      return lines.join("\n");
    })
    .join("\n");
}

export function formatDeferrals(deferrals) {
  return deferrals
    .map((f) => {
      const lines = [`- **D${f.seq}** ${indent(f.title)}`, `  - 戻す条件: ${indent(f.revisit_when)}`];
      if (f.from_action_seq) lines.push(`  - A${f.from_action_seq} から移した`);
      return lines.join("\n");
    })
    .join("\n");
}

// 数字だけと A 付きはアクション、R 付きは依頼、D 付きは後回し
export function parseRef(raw) {
  const m = /^([ARD]?)([1-9]\d*)$/i.exec(raw ?? "");
  if (!m) return undefined;
  const p = m[1].toUpperCase();
  const seq = Number(m[2]);
  if (!isSeq(seq)) return undefined;
  return { kind: p === "R" ? "request" : p === "D" ? "deferral" : "action", seq };
}

// turn が数えられていなければ（hook が動かない環境）、出力から turn を省く
export const turnNote = (turn, before) => {
  const parts = [before, turn === null || turn === undefined ? undefined : `turn ${turn}`].filter(Boolean);
  return parts.length ? `（${parts.join("、")}）` : "";
};
