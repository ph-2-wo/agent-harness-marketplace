// エージェントが呼ぶサブコマンド。
// 失敗したら理由を stderr に出して exit 1

import { format, formatDeferrals, formatRequests, parseRef, readStdin, repository, turnNote } from "./common.mjs";
import {
  invalid,
  parseDeferralRegistration,
  parseRegisterRequest,
  parseUserRequestRegistration,
  PENDING_LIMITS,
  REASONS,
  Refusal,
} from "./model.mjs";
import { PAGE_PATH, writePage } from "./page.mjs";
import {
  decide,
  deferAction,
  ensureSession,
  KINDS,
  listPending,
  openDb,
  registerAction,
  registerDeferral,
  registerUserRequest,
} from "./store.mjs";

export function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function readJsonStdin(usage) {
  try {
    return JSON.parse(readStdin());
  } catch {
    fail(`標準入力が JSON でない。${usage} を渡す`);
  }
}

// 記録を変えたらページを書き直す。書けなくても記録は済んでいるので、警告だけ出して続ける
function refreshPage(db) {
  try {
    writePage(db);
  } catch (e) {
    process.stderr.write(`警告: ページを書き直せなかった（${PAGE_PATH}）: ${e?.message ?? e}\n`);
  }
}

const CLI_COMMANDS = ["register", "register-request", "register-deferral", "defer", "list", "approve", "withdraw", "complete"];

export async function cli(cmd, args, sid) {
  if (!CLI_COMMANDS.includes(cmd)) {
    fail(
      "使い方: na.mjs [--session <id>] register | register-request | register-deferral | list | approve <seq> [--partial] | complete R<seq> | defer A<seq> | withdraw <seq|R<seq>|D<seq>> <reason>",
    );
  }
  const db = await openDb();
  ensureSession(db, sid, repository(process.cwd()));
  switch (cmd) {
    case "register": {
      const body = readJsonStdin("{title, ok_forecast, need_forecast, risk_note?, on_ok, on_ng, replaces?, resumes?, diffs?}");
      let r;
      try {
        r = registerAction(db, sid, parseRegisterRequest(body));
      } catch (e) {
        if (e instanceof Refusal && e.code === "too_many_pending") {
          fail(`登録できません: 認知負荷軽減のため、未処理は ${PENDING_LIMITS.max} 件までしか登録できません。`);
        }
        throw e;
      }
      refreshPage(db);
      process.stdout.write(`A${r.seq}\n`);
      if (body.resumes !== undefined) process.stdout.write(`D${body.resumes} を戻したものとして記録した\n`);
      if (r.warning) {
        process.stdout.write(
          `警告: 未処理のネクストアクションが ${r.warning.pending} 件あります。認知負荷軽減のため、未処理は ${PENDING_LIMITS.max} 件までしか登録できません。\n`,
        );
      }
      return;
    }
    case "register-request": {
      const body = readJsonStdin("{title, steps?, hand_back?, replaces?}");
      const seq = registerUserRequest(db, sid, parseUserRequestRegistration(body));
      refreshPage(db);
      process.stdout.write(`R${seq}\n`);
      return;
    }
    case "register-deferral": {
      const body = readJsonStdin("{title, revisit_when}");
      const seq = registerDeferral(db, sid, parseDeferralRegistration(body));
      refreshPage(db);
      process.stdout.write(`D${seq}\n`);
      return;
    }
    case "defer": {
      const ref = parseRef(args[0]);
      if (ref?.kind !== "action") fail("使い方: na.mjs defer A<seq>（revisit_when を標準入力で渡す）。defer はアクションだけに使う");
      const revisit_when = readStdin().trim();
      if (!revisit_when) fail("いつ戻すかの条件（revisit_when）を標準入力で渡す");
      const r = deferAction(db, sid, ref.seq, revisit_when);
      refreshPage(db);
      process.stdout.write(`A${ref.seq} を後回しに移した: D${r.seq}${turnNote(r.decided_turn)}\n`);
      return;
    }
    case "list": {
      const { actions, requests, deferrals } = listPending(db, sid);
      const parts = [];
      if (requests.length) parts.push(`お願いしている作業（未完了）\n${formatRequests(requests)}`);
      if (actions.length) parts.push(`ネクストアクション（未処理）\n${format(actions)}`);
      // 後回しは今は動かないものなので最後に出す
      if (deferrals.length) parts.push(`後回し（未決着）\n${formatDeferrals(deferrals)}`);
      process.stdout.write(
        parts.length ? `${parts.join("\n\n")}\n` : "未処理のネクストアクション・お願いしている作業・後回しはありません\n",
      );
      return;
    }
    case "approve": {
      const ref = parseRef(args[0]);
      if (ref?.kind === "request") fail(`R${ref.seq} は依頼。完了は na.mjs complete R${ref.seq} で記録する`);
      if (ref?.kind === "deferral") {
        fail(`D${ref.seq} は後回し。戻すときは register の JSON に resumes: ${ref.seq} を付けてアクションとして出す`);
      }
      if (!ref) fail("使い方: na.mjs approve <seq> [--partial]（--partial のときは note を標準入力で渡す）");
      const partial = args.includes("--partial");
      let note = null;
      if (partial) {
        note = readStdin().trim();
        if (!note) fail("--partial のときは、一部承認の内容（note）を標準入力で渡す");
      }
      const turn = decide(db, "action", sid, ref.seq, partial ? "partially_approved" : "approved", null, note);
      refreshPage(db);
      process.stdout.write(`A${ref.seq} を${partial ? "一部" : ""}承認として記録した${turnNote(turn)}\n`);
      return;
    }
    case "withdraw": {
      const ref = parseRef(args[0]);
      const reason = args[1];
      if (!ref || !reason) {
        fail("使い方: na.mjs withdraw <seq|R<seq>|D<seq>> <rejected|sent_back|unneeded>（note は標準入力、任意）");
      }
      if (!REASONS.includes(reason)) throw invalid("reason", `reason must be one of ${REASONS.join(", ")}`);
      const note = readStdin().trim() || null;
      const turn = decide(db, ref.kind, sid, ref.seq, "withdrawn", reason, note);
      refreshPage(db);
      process.stdout.write(`${KINDS[ref.kind].prefix}${ref.seq} を取り下げとして記録した${turnNote(turn, reason)}\n`);
      return;
    }
    case "complete": {
      const ref = parseRef(args[0]);
      if (ref?.kind !== "request") {
        fail("使い方: na.mjs complete R<seq>（note は標準入力、任意）。complete は依頼（R 付き）だけに使う。アクションは approve で記録する");
      }
      const note = readStdin().trim() || null;
      const turn = decide(db, "request", sid, ref.seq, "completed", null, note);
      refreshPage(db);
      process.stdout.write(`R${ref.seq} を完了として記録した${turnNote(turn)}\n`);
      return;
    }
  }
}
