// hook が呼ぶサブコマンド（session-start・turn・stop）と、hook の記録（hook.log）

import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readStdin, repository, selfCommand } from "./common.mjs";
import { isObject, isText } from "./model.mjs";
import { PAGE_PATH, writePage } from "./page.mjs";
import { DATA_DIR, listPending, now, openDb, startTurn } from "./store.mjs";

const LOG = join(DATA_DIR, "hook.log");

export function log(msg) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    appendFileSync(LOG, `${new Date().toISOString().replace(/\.\d+Z$/, "Z")} ${msg}\n`);
    // ターンのたびに追記するので、際限なく伸びないよう直近だけ残す
    const lines = readFileSync(LOG, "utf8").split("\n");
    if (lines.length > 500) {
      const tmp = `${LOG}.tmp.${process.pid}`;
      writeFileSync(tmp, lines.slice(-201).join("\n"));
      renameSync(tmp, LOG);
    }
  } catch {
    // 記録に失敗しても何もしない
  }
}

function hookInput() {
  try {
    const input = JSON.parse(readStdin());
    return isObject(input) ? input : {};
  } catch {
    return {};
  }
}

const hookSessionId = (input) => (isText(input.session_id) ? input.session_id : undefined);
const hookCwd = (input) => (isText(input.cwd) ? input.cwd : process.cwd());

export async function hookSessionStart() {
  const db = await openDb();
  writePage(db);
  process.stdout.write(JSON.stringify({ systemMessage: `ネクストアクションのページ:\n${pathToFileURL(PAGE_PATH).href}` }));
  log("OK session-start");
}

export async function hookTurn() {
  const ts = now();
  const input = hookInput();
  const sid = hookSessionId(input);
  if (!sid) return log("SKIP turn — hook の入力に session_id が無い");
  const db = await openDb();
  const r = startTurn(db, sid, repository(hookCwd(input)), sid, ts);
  log(`OK turn ${r.turn} 未処理 ${r.pending_seqs.length} 件・依頼 ${r.pending_request_seqs.length} 件・後回し ${r.pending_deferral_seqs.length} 件`);
  const cmd = selfCommand(sid);
  // コマンドは未処理が無くても毎回渡す。渡さないと、エージェントが --session なしで呼び、hook と別のセッションに記録する
  const lines = [`ネクストアクションの CLI: ${cmd}`, "create-next-action の呼び出しには、このコマンドを使う。"];
  if (r.pending_seqs.length) {
    lines.push(
      `未処理のネクストアクション: ${r.pending_seqs.map((s) => `A${s}`).join(", ")}`,
      `ユーザーの返事がこれらへの承認・取り下げに当たるなら、${cmd} approve <seq> / withdraw <seq> <reason> で記録する。`,
    );
  }
  if (r.pending_request_seqs.length) {
    lines.push(
      `お願いしている作業（未完了）: ${r.pending_request_seqs.map((s) => `R${s}`).join(", ")}`,
      `ユーザーが済んだと言ったら ${cmd} complete R<seq> で記録する。頼む必要が無くなったら withdraw R<seq> <reason>。`,
    );
  }
  // 後回しは件数だけを渡す。番号と中身は list で見る
  if (r.pending_deferral_seqs.length) {
    lines.push(
      `後回し: ${r.pending_deferral_seqs.length}件`,
      "後回しにしたものに取り掛かれるタイミングになったら、list で中身を見て、register の JSON に resumes: <D の番号の数字> を付けて出す。",
    );
  }
  if (r.pending_seqs.length || r.pending_request_seqs.length || r.pending_deferral_seqs.length) {
    lines.push(`中身は ${cmd} list で見る。`);
  }
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n") } }),
  );
}

// 入力時には登録するよう伝えているので、ここでは応答を終える時点の確認だけをする
export async function hookStop() {
  const input = hookInput();
  if (input.stop_hook_active === true) return;
  const sid = hookSessionId(input);
  if (!sid) return log("SKIP stop — hook の入力に session_id が無い");
  const db = await openDb();
  const { actions, requests, deferrals } = listPending(db, sid);
  // 未処理のアクションか依頼があるときは何も出さない。出すと毎回の応答を 1 回余分に続けさせる
  if (actions.length || requests.length) return;
  const lines = [
    "未処理のネクストアクションも、お願いしている作業もありません。",
    "この状態で応答を終えてよいのは、このセッションでやることが無く、終えるべきと判断したときだけ。",
    "そう判断していないなら、承認を求める事項はネクストアクション、ユーザーに頼む事項は依頼として create-next-action で登録する。終えると判断したなら、本文にそう書く。",
  ];
  if (deferrals.length) {
    lines.push(
      `後回し: ${deferrals.length}件`,
      "後回しにしたものに取り掛かれるタイミングになっていたら、resumes を付けてアクションとして出す。",
    );
  }
  process.stdout.write(JSON.stringify({ decision: "block", reason: lines.join("\n") }));
  log(`OK stop 未処理 0 件・後回し ${deferrals.length} 件`);
}
