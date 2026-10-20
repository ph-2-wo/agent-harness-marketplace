#!/usr/bin/env node
// ネクストアクション（承認を求める事項）と依頼（ユーザーに頼む作業）と後回し（今はやらないが後で戻すもの）を、
// 手元の SQLite のファイルに記録する。依存なし。Node 組み込みの node:sqlite を使う（Node v22.13.0 / v23.4.0 以上）。
//
// 同じパッケージの hook（.apm/hooks/next-action.json）も、このファイルを呼ぶ。
//
// エージェントが呼ぶもの（失敗したら理由を stderr に出して exit 1。直して呼び直せるように）:
//   na.mjs register              標準入力の JSON を 1 件登録し、A{seq} を出す
//                                登録後の未処理が PENDING_LIMITS.warn 件以上なら、次の行に警告を出す
//                                未処理が PENDING_LIMITS.max 件あれば、登録できない旨を stderr に出して exit 1
//                                JSON に resumes（D の番号の数字）を付けると、その後回しを戻したものとして記録する
//   na.mjs list                  未処理を人が読める形で出す
//   na.mjs approve <seq>         承認を記録する
//   na.mjs approve <seq> --partial   一部承認を記録する。note は標準入力
//   na.mjs withdraw <seq> <reason>   取り下げを記録する。reason は rejected / sent_back / unneeded。note は標準入力（任意）
//                                    <seq> が R 付き（R1）なら依頼の、D 付き（D1）なら後回しの取り下げ
//   na.mjs register-request      標準入力の JSON（{title, steps?, hand_back?, replaces?}）で依頼を 1 件登録し、R{seq} を出す
//   na.mjs complete R<seq>       依頼の完了を記録する。note は標準入力（任意。受け取った値そのものは書かない）
//   na.mjs defer A<seq>          アクションを後回しに移し、D{seq} を出す。revisit_when（いつ戻すかの条件）は標準入力
//   na.mjs register-deferral     標準入力の JSON（{title, revisit_when}）で後回しを 1 件登録し、D{seq} を出す
//   アクションの <seq> は 3 でも A3 でもよい。依頼は R、後回しは D を必ず付ける（R1・D1）。
//   どのサブコマンドにも --session <id> を付けられる。番号はセッションごとに振る。
//   付けなければ、今のディレクトリのリポジトリ（git の origin の owner/repo、取れなければディレクトリ名）を1つのセッションとして扱う。
//
// hook が呼ぶもの（何があっても exit 0。セッションを止めない）。出力は Claude Code と Codex の両方が受け付ける形だけにする:
//   na.mjs session-start   SessionStart。一覧のページを書き、その場所を systemMessage で出す
//   na.mjs turn            UserPromptSubmit。やり取りを 1 回進め、hook 入力の session_id を --session に入れたコマンドを文脈に差し込む
//                          未処理のアクション・未完了の依頼があればその番号も、決着の無い後回しがあればその件数だけも差し込む
//   na.mjs stop            Stop。未処理のアクションも依頼も0件なら、登録を忘れていないかを確かめさせ、後回しが残っていればその件数も渡す
//                          続けさせるのは decision: "block"（Codex の Stop は additionalContext を受けない）
//                          この hook で続けた後の終了（stop_hook_active）では何もしない
//
// 記録を変えるたびに、全リポジトリ・全セッションの未処理を1枚にした HTML を書き直す。ページは数秒ごとに自分で読み直す。
// 置き場は環境変数 NEXT_ACTION_HOME のディレクトリ。無ければ ~/.local/share/next-action。
//   next-action.sqlite（記録）・index.html（ページ）・hook.log（hook の記録。直近だけ残す）
//
// このファイルは引数の読み取りとサブコマンドの振り分けだけを持つ。
// 中身は隣の lib/ に役割ごとに分けてあり、何を持つかは各ファイルの冒頭に書いてある。

import { cli, fail } from "./lib/cli.mjs";
import { repository, repositorySessionId } from "./lib/common.mjs";
import { hookSessionStart, hookStop, hookTurn, log } from "./lib/hook.mjs";
import { isText, Refusal } from "./lib/model.mjs";
import { SetupError } from "./lib/store.mjs";

// --session <id> はどの位置にあってもよい。取り除いた残りをサブコマンドと引数にする
function splitSession(argv) {
  const rest = [];
  let sid;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--session") {
      sid = argv[++i];
      if (!isText(sid)) fail("--session の後にセッションの ID を書く");
    } else if (argv[i].startsWith("--session=")) {
      sid = argv[i].slice("--session=".length);
      if (!isText(sid)) fail("--session= の後にセッションの ID を書く");
    } else {
      rest.push(argv[i]);
    }
  }
  return { sid, rest };
}

const HOOKS = { "session-start": hookSessionStart, turn: hookTurn, stop: hookStop };

const { sid: argSession, rest } = splitSession(process.argv.slice(2));
const [cmd, ...args] = rest;

if (Object.hasOwn(HOOKS, cmd ?? "")) {
  try {
    await HOOKS[cmd]();
  } catch (e) {
    log(`FAIL ${cmd} — ${e?.name ?? "Error"}: ${e?.message ?? ""}`);
  }
  // process.exit は pipe への書き出しを待たずに終わることがあるので、終了コードだけ決めて自然に終わらせる
  process.exitCode = 0;
} else {
  try {
    await cli(cmd, args, argSession ?? repositorySessionId(repository(process.cwd())));
  } catch (e) {
    if (e instanceof Refusal) fail(`${e.code}${e.field ? ` field=${e.field}` : ""} — ${e.message}`);
    if (e instanceof SetupError) fail(e.message);
    fail(`記録できなかった: ${e?.name ?? "Error"}: ${e?.message ?? e}`);
  }
}
