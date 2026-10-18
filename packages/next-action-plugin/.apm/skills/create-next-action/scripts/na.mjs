#!/usr/bin/env node
// ネクストアクション（承認を求める事項）と依頼（ユーザーに頼む作業）と後回し（今はやらないが後で戻すもの）を、
// 手元の SQLite のファイルに記録する。依存なし。Node 組み込みの node:sqlite を使う（Node v22.13.0 / v23.4.0 以上）。
//
// このファイルは2か所に同じものがある。変えるときは両方を変え、cmp で一致を確かめる。
//   packages/next-action-plugin/.apm/skills/create-next-action/scripts/na.mjs（skill から呼ぶ）
//   packages/next-action-hook-plugin/.apm/hooks/scripts/na.mjs（hook から呼ぶ）
// hook は別のパッケージに置く決まりで、APM は hook のコマンドからパッケージの外のファイルを指せないため。
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
//   na.mjs stop            Stop。未処理が0件なら、登録を忘れていないかを確かめさせ、後回しが残っていればその件数も渡す
//                          続けさせるのは decision: "block"（Codex の Stop は additionalContext を受けない）
//                          この hook で続けた後の終了（stop_hook_active）では何もしない
//
// 記録を変えるたびに、全リポジトリ・全セッションの未処理を1枚にした HTML を書き直す。ページは数秒ごとに自分で読み直す。
// 置き場は環境変数 NEXT_ACTION_HOME のディレクトリ。無ければ ~/.local/share/next-action。
//   next-action.sqlite（記録）・index.html（ページ）・hook.log（hook の記録。直近だけ残す）

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DATA_DIR = resolve(process.env.NEXT_ACTION_HOME || join(homedir(), ".local", "share", "next-action"));
const DB_PATH = join(DATA_DIR, "next-action.sqlite");
const PAGE_PATH = join(DATA_DIR, "index.html");
const LOG = join(DATA_DIR, "hook.log");

// ページが自分で読み直す間隔（秒）
const REFRESH_SECONDS = 5;

const OK_LABEL = { high: "ok 高", mid: "ok 中", low: "ok 低" };
const NEED_LABEL = { high: "要 高", mid: "要 中", low: "要 低" };

// ---------- 値の形とバリデーション ----------

const LEVELS = ["high", "mid", "low"];
const REASONS = ["rejected", "sent_back", "unneeded"];

// 1 つの diff の行数（コンテキスト行も含む全行）と、diffs の個数の上限
const DIFF_LIMITS = { lines: 30, count: 5 };
const DIFF_ADVICE =
  "keep only the parts needed to decide on approval; if you cannot narrow them down, consider whether the action's scope is too large";

// セッションごとの未処理のアクションの件数。依頼と後回しは数えない。
// 登録の前に max 件あれば登録を断る（replaces 付きの出し直しは件数が増えないので断らない）。登録の後に warn 件以上なら警告を出す。
const PENDING_LIMITS = { warn: 4, max: 5 };

// 記録の決まりに合わない入力。code・field・message を stderr に出す
class Refusal extends Error {
  constructor(code, message, field) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

const invalid = (field, message) => new Refusal("invalid_value", message, field);

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.length > 0;
const isSeq = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 1;

function rejectUnknown(o, allowed, prefix = "") {
  const key = Object.keys(o).find((k) => !allowed.includes(k));
  if (key !== undefined) throw invalid(`${prefix}${key}`, `unknown field: ${key}`);
}

function requireObject(input) {
  if (!isObject(input)) throw invalid(undefined, "body must be a JSON object");
}

function parseReplaces(input) {
  if (!isObject(input)) throw invalid("replaces", "replaces must be an object");
  rejectUnknown(input, ["seq", "reason", "note"], "replaces.");
  if (!isSeq(input.seq)) throw invalid("replaces_seq", "replaces.seq must be a positive integer");
  if (!REASONS.includes(input.reason)) throw invalid("reason", `replaces.reason must be one of ${REASONS.join(", ")}`);
  if (input.note !== undefined && !isText(input.note)) throw invalid("note", "replaces.note must be a non-empty string");
  return { seq: input.seq, reason: input.reason, note: input.note ?? null };
}

// 差分を行に分ける。末尾の改行 1 つは行に数えない（git diff の出力をそのまま貼ると最後に改行が付く）
const diffLines = (diff) => diff.replace(/\r?\n$/, "").split(/\r?\n/);

function parseDiffs(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw invalid("diffs", "diffs must be a non-empty array; omit it when there is no diff");
  }
  if (input.length > DIFF_LIMITS.count) {
    throw invalid("diffs", `diffs must have at most ${DIFF_LIMITS.count} items (got ${input.length}); ${DIFF_ADVICE}`);
  }
  return input.map((d, i) => {
    const at = `diffs[${i}]`;
    if (!isObject(d)) throw invalid(at, `${at} must be an object`);
    rejectUnknown(d, ["file", "diff"], `${at}.`);
    if (!isText(d.file)) throw invalid(`${at}.file`, `${at}.file must be a non-empty string`);
    if (!isText(d.diff)) throw invalid(`${at}.diff`, `${at}.diff must be a non-empty string`);
    // 行頭の 1 文字で変わらない行・足す行・消す行を分ける。付けないと「- 項目」のようなリストの行が消す行に見える
    const split = diffLines(d.diff);
    const bad = split.findIndex((l) => l !== "" && !/^[ +-]/.test(l));
    if (bad >= 0) {
      throw invalid(
        `${at}.diff`,
        `${at}.diff line ${bad + 1} must start with " ", "+" or "-"; prefix unchanged lines with one space and do not write @@ lines`,
      );
    }
    if (split.length > DIFF_LIMITS.lines) {
      throw invalid(`${at}.diff`, `${at}.diff must be at most ${DIFF_LIMITS.lines} lines (got ${split.length}); ${DIFF_ADVICE}`);
    }
    return { file: d.file, diff: d.diff };
  });
}

function parseRegisterRequest(input) {
  requireObject(input);
  rejectUnknown(input, ["title", "ok_forecast", "need_forecast", "risk_note", "on_ok", "on_ng", "replaces", "resumes", "diffs"]);
  const { title, ok_forecast, need_forecast, risk_note, on_ok, on_ng, replaces, resumes, diffs } = input;
  if (!isText(title)) throw invalid("title", "title must be a non-empty string");
  if (!LEVELS.includes(ok_forecast)) throw invalid("ok_forecast", `ok_forecast must be one of ${LEVELS.join(", ")}`);
  if (!LEVELS.includes(need_forecast)) throw invalid("need_forecast", `need_forecast must be one of ${LEVELS.join(", ")}`);
  if (!isText(on_ok)) throw invalid("on_ok", "on_ok must be a non-empty string");
  if (!isText(on_ng)) throw invalid("on_ng", "on_ng must be a non-empty string");
  if (risk_note !== undefined && !isText(risk_note)) throw invalid("risk_note", "risk_note must be a non-empty string");
  if (resumes !== undefined && !isSeq(resumes)) {
    throw invalid("resumes", "resumes must be a positive integer (the D number without D)");
  }
  if (ok_forecast !== "high" && risk_note === undefined) {
    throw invalid("risk_note", "risk_note is required when ok_forecast is mid or low");
  }
  return {
    title,
    ok_forecast,
    need_forecast,
    risk_note: risk_note ?? null,
    on_ok,
    on_ng,
    replaces: replaces === undefined ? undefined : parseReplaces(replaces),
    resumes,
    diffs: diffs === undefined ? [] : parseDiffs(diffs),
  };
}

function parseUserRequestRegistration(input) {
  requireObject(input);
  rejectUnknown(input, ["title", "steps", "hand_back", "replaces"]);
  const { title, steps, hand_back, replaces } = input;
  if (!isText(title)) throw invalid("title", "title must be a non-empty string");
  if (steps !== undefined && !isText(steps)) throw invalid("steps", "steps must be a non-empty string; omit it when there are none");
  if (hand_back !== undefined && !isText(hand_back)) {
    throw invalid("hand_back", "hand_back must be a non-empty string; omit it when nothing needs to be handed back");
  }
  return {
    title,
    steps: steps ?? null,
    hand_back: hand_back ?? null,
    replaces: replaces === undefined ? undefined : parseReplaces(replaces),
  };
}

function parseDeferralRegistration(input) {
  requireObject(input);
  rejectUnknown(input, ["title", "revisit_when"]);
  if (!isText(input.title)) throw invalid("title", "title must be a non-empty string");
  if (!isText(input.revisit_when)) throw invalid("revisit_when", "revisit_when must be a non-empty string");
  return { title: input.title, revisit_when: input.revisit_when };
}

// ---------- テーブル ----------

// やり取りの回数の列（sessions.turn・created_turn・decided_turn）は NULL 可。
// やり取りは UserPromptSubmit の hook が数えるので、hook が動かない環境では数えられない。
// sessions.turn は hook が一度も数えていなければ NULL で、数え始めると 1 から増える。
// turns.claude_code_session_id には、Codex でも hook の入力の session_id を入れる（列の名前は Claude Code に由来する）。
const SCHEMA = `
CREATE TABLE sessions (
  id          TEXT    PRIMARY KEY,
  repository  TEXT    NOT NULL,
  turn        INTEGER CHECK (turn IS NULL OR turn >= 0),
  created_at  TEXT    NOT NULL
);

CREATE TABLE actions (
  session_id    TEXT    NOT NULL REFERENCES sessions(id),
  seq           INTEGER NOT NULL CHECK (seq >= 1),
  title         TEXT    NOT NULL CHECK (length(title) > 0),
  ok_forecast   TEXT    NOT NULL CHECK (ok_forecast   IN ('high', 'mid', 'low')),
  need_forecast TEXT    NOT NULL CHECK (need_forecast IN ('high', 'mid', 'low')),
  risk_note     TEXT,
  on_ok         TEXT    NOT NULL,
  on_ng         TEXT    NOT NULL,
  replaces_seq  INTEGER,
  created_at    TEXT    NOT NULL,
  created_turn  INTEGER,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, replaces_seq) REFERENCES actions(session_id, seq),
  CHECK (ok_forecast = 'high' OR risk_note IS NOT NULL)
);

CREATE TABLE decisions (
  session_id    TEXT    NOT NULL,
  seq           INTEGER NOT NULL,
  kind          TEXT    NOT NULL CHECK (kind IN ('approved', 'partially_approved', 'withdrawn', 'deferred')),
  reason        TEXT             CHECK (reason IN ('rejected', 'sent_back', 'unneeded')),
  note          TEXT,
  decided_at    TEXT    NOT NULL,
  decided_turn  INTEGER,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, seq) REFERENCES actions(session_id, seq),
  CHECK ((kind = 'withdrawn') = (reason IS NOT NULL)),
  CHECK (kind <> 'partially_approved' OR note IS NOT NULL)
);

CREATE VIEW pending_actions AS
  SELECT a.* FROM actions a LEFT JOIN decisions d USING (session_id, seq) WHERE d.seq IS NULL;

CREATE TABLE action_diffs (
  session_id  TEXT    NOT NULL,
  seq         INTEGER NOT NULL,
  idx         INTEGER NOT NULL CHECK (idx >= 0),
  file        TEXT    NOT NULL CHECK (length(file) > 0),
  diff        TEXT    NOT NULL CHECK (length(diff) > 0),
  PRIMARY KEY (session_id, seq, idx),
  FOREIGN KEY (session_id, seq) REFERENCES actions(session_id, seq)
);

CREATE TABLE turns (
  session_id              TEXT    NOT NULL REFERENCES sessions(id),
  turn                    INTEGER NOT NULL CHECK (turn >= 1),
  claude_code_session_id  TEXT             CHECK (claude_code_session_id IS NULL OR length(claude_code_session_id) > 0),
  started_at              TEXT,
  PRIMARY KEY (session_id, turn)
);

CREATE TABLE user_requests (
  session_id    TEXT    NOT NULL REFERENCES sessions(id),
  seq           INTEGER NOT NULL CHECK (seq >= 1),
  title         TEXT    NOT NULL CHECK (length(title) > 0),
  steps         TEXT             CHECK (steps IS NULL OR length(steps) > 0),
  hand_back     TEXT             CHECK (hand_back IS NULL OR length(hand_back) > 0),
  replaces_seq  INTEGER,
  created_at    TEXT    NOT NULL,
  created_turn  INTEGER,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, replaces_seq) REFERENCES user_requests(session_id, seq)
);

CREATE TABLE user_request_decisions (
  session_id    TEXT    NOT NULL,
  seq           INTEGER NOT NULL,
  kind          TEXT    NOT NULL CHECK (kind IN ('completed', 'withdrawn')),
  reason        TEXT             CHECK (reason IN ('rejected', 'sent_back', 'unneeded')),
  note          TEXT,
  decided_at    TEXT    NOT NULL,
  decided_turn  INTEGER,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, seq) REFERENCES user_requests(session_id, seq),
  CHECK ((kind = 'withdrawn') = (reason IS NOT NULL))
);

CREATE VIEW pending_user_requests AS
  SELECT r.* FROM user_requests r LEFT JOIN user_request_decisions d USING (session_id, seq) WHERE d.seq IS NULL;

CREATE TABLE deferrals (
  session_id       TEXT    NOT NULL REFERENCES sessions(id),
  seq              INTEGER NOT NULL CHECK (seq >= 1),
  title            TEXT    NOT NULL CHECK (length(title) > 0),
  revisit_when     TEXT    NOT NULL CHECK (length(revisit_when) > 0),
  from_action_seq  INTEGER,
  created_at       TEXT    NOT NULL,
  created_turn     INTEGER,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, from_action_seq) REFERENCES actions(session_id, seq)
);

CREATE TABLE deferral_decisions (
  session_id          TEXT    NOT NULL,
  seq                 INTEGER NOT NULL,
  kind                TEXT    NOT NULL CHECK (kind IN ('resumed', 'withdrawn')),
  reason              TEXT             CHECK (reason IN ('rejected', 'sent_back', 'unneeded')),
  resumed_action_seq  INTEGER,
  note                TEXT,
  decided_at          TEXT    NOT NULL,
  decided_turn        INTEGER,
  PRIMARY KEY (session_id, seq),
  FOREIGN KEY (session_id, seq) REFERENCES deferrals(session_id, seq),
  FOREIGN KEY (session_id, resumed_action_seq) REFERENCES actions(session_id, seq),
  CHECK ((kind = 'withdrawn') = (reason IS NOT NULL)),
  CHECK ((kind = 'resumed') = (resumed_action_seq IS NOT NULL))
);

CREATE VIEW pending_deferrals AS
  SELECT f.* FROM deferrals f LEFT JOIN deferral_decisions d USING (session_id, seq) WHERE d.seq IS NULL;
`;

// テーブルの形の版。形を変えるときは、MIGRATIONS の末尾に足す。足した分だけが、まだ当てていない記録に当たる
const MIGRATIONS = [SCHEMA];

class SetupError extends Error {}

async function openDb() {
  // node:sqlite は読み込むと ExperimentalWarning を stderr に出す。エージェントの出力を汚さないよう、その警告だけを止める
  const emitWarning = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    const text = typeof warning === "string" ? warning : warning?.message;
    if (/SQLite/i.test(text ?? "")) return;
    return emitWarning.call(process, warning, ...rest);
  };
  let sqlite;
  try {
    sqlite = await import("node:sqlite");
  } catch {
    throw new SetupError(`node:sqlite が使えない（Node ${process.version}）。Node v22.13.0 / v23.4.0 以上で動かす`);
  } finally {
    process.emitWarning = emitWarning;
  }
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new sqlite.DatabaseSync(DB_PATH);
  // hook と CLI が同時に開くことがあるので、書き込みの順番待ちを許す
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  tx(db, () => {
    const { user_version } = db.prepare("PRAGMA user_version").get();
    for (let v = user_version; v < MIGRATIONS.length; v++) db.exec(MIGRATIONS[v]);
    if (user_version < MIGRATIONS.length) db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
  return db;
}

// 確かめてから書くまでを 1 つのトランザクションにする。BEGIN IMMEDIATE で、確かめた後に別のプロセスが書くのを防ぐ
function tx(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // 取り消しに失敗しても、元の例外を返す
    }
    throw e;
  }
}

const now = () => new Date().toISOString();

// セッションの今の turn。hook が数えていなければ NULL
const CURRENT_TURN = "(SELECT turn FROM sessions WHERE id = ?)";

// 決着を持つものの種類。SQL に埋めるのはここの固定の文字列だけ（利用者の入力は入れない）
const KINDS = {
  action: { items: "actions", decisions: "decisions", prefix: "A", notFound: "action_not_found" },
  request: { items: "user_requests", decisions: "user_request_decisions", prefix: "R", notFound: "user_request_not_found" },
  deferral: { items: "deferrals", decisions: "deferral_decisions", prefix: "D", notFound: "deferral_not_found" },
};

// セッションが無ければ作る（repository は最初の値のまま変えない）。turn は hook が数えるまで NULL
function ensureSession(db, sid, repository) {
  db.prepare("INSERT INTO sessions (id, repository, turn, created_at) VALUES (?, ?, NULL, ?) ON CONFLICT (id) DO NOTHING").run(
    sid,
    repository,
    now(),
  );
}

function pendingState(db, kind, sid, seq) {
  const { items, decisions } = KINDS[kind];
  const row = db
    .prepare(
      `SELECT d.seq AS decided FROM ${items} a LEFT JOIN ${decisions} d USING (session_id, seq)
       WHERE a.session_id = ? AND a.seq = ?`,
    )
    .get(sid, seq);
  if (row === undefined) return "missing";
  return row.decided === null ? "pending" : "decided";
}

const countPending = (db, sid) => db.prepare("SELECT COUNT(*) AS n FROM pending_actions WHERE session_id = ?").get(sid).n;

function insertDecision(db, kind, sid, seq, outcome, reason, note) {
  return db
    .prepare(
      `INSERT INTO ${KINDS[kind].decisions} (session_id, seq, kind, reason, note, decided_at, decided_turn)
       VALUES (?, ?, ?, ?, ?, ?, ${CURRENT_TURN})
       RETURNING decided_turn`,
    )
    .get(sid, seq, outcome, reason, note, now(), sid).decided_turn;
}

function requirePending(db, kind, sid, seq) {
  const state = pendingState(db, kind, sid, seq);
  if (state === "missing") throw new Refusal(KINDS[kind].notFound, `${KINDS[kind].prefix}${seq} is not registered in this session`);
  if (state === "decided") throw new Refusal("already_decided", `${KINDS[kind].prefix}${seq} is already decided`);
}

// replaces があれば、元のアクションの取り下げと新しいアクションの登録を一緒に行う。元の差分は引き継がない。
// resumes があれば、その後回しを resumed で決着させ、今入れたアクションを指す。resumes 付きは未処理が 1 件増えるので上限の対象にする。
function registerAction(db, sid, req) {
  return tx(db, () => {
    if (req.replaces && pendingState(db, "action", sid, req.replaces.seq) !== "pending") {
      throw new Refusal("replaces_not_pending", "the action to replace does not exist or is already decided");
    }
    if (req.resumes !== undefined && pendingState(db, "deferral", sid, req.resumes) !== "pending") {
      throw new Refusal("resumes_not_pending", "the deferral to resume does not exist or is already decided");
    }
    if (!req.replaces && countPending(db, sid) >= PENDING_LIMITS.max) {
      throw new Refusal("too_many_pending", `at most ${PENDING_LIMITS.max} pending actions per session`);
    }
    if (req.replaces) insertDecision(db, "action", sid, req.replaces.seq, "withdrawn", req.replaces.reason, req.replaces.note);
    const { seq } = db
      .prepare(
        `INSERT INTO actions (session_id, seq, title, ok_forecast, need_forecast, risk_note, on_ok, on_ng, replaces_seq, created_at, created_turn)
         VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM actions WHERE session_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ${CURRENT_TURN})
         RETURNING seq`,
      )
      .get(sid, sid, req.title, req.ok_forecast, req.need_forecast, req.risk_note, req.on_ok, req.on_ng, req.replaces?.seq ?? null, now(), sid);
    const insertDiff = db.prepare("INSERT INTO action_diffs (session_id, seq, idx, file, diff) VALUES (?, ?, ?, ?, ?)");
    req.diffs.forEach((d, idx) => insertDiff.run(sid, seq, idx, d.file, d.diff));
    if (req.resumes !== undefined) {
      db.prepare(
        `INSERT INTO deferral_decisions (session_id, seq, kind, reason, resumed_action_seq, note, decided_at, decided_turn)
         VALUES (?, ?, 'resumed', NULL, ?, NULL, ?, ${CURRENT_TURN})`,
      ).run(sid, req.resumes, seq, now(), sid);
    }
    const pending = countPending(db, sid);
    return pending >= PENDING_LIMITS.warn ? { seq, warning: { pending } } : { seq };
  });
}

function registerUserRequest(db, sid, req) {
  return tx(db, () => {
    if (req.replaces && pendingState(db, "request", sid, req.replaces.seq) !== "pending") {
      throw new Refusal("replaces_not_pending", "the user request to replace does not exist or is already decided");
    }
    if (req.replaces) insertDecision(db, "request", sid, req.replaces.seq, "withdrawn", req.replaces.reason, req.replaces.note);
    return db
      .prepare(
        `INSERT INTO user_requests (session_id, seq, title, steps, hand_back, replaces_seq, created_at, created_turn)
         VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM user_requests WHERE session_id = ?), ?, ?, ?, ?, ?, ${CURRENT_TURN})
         RETURNING seq`,
      )
      .get(sid, sid, req.title, req.steps, req.hand_back, req.replaces?.seq ?? null, now(), sid).seq;
  });
}

const NEXT_DEFERRAL_SEQ = "(SELECT COALESCE(MAX(seq), 0) + 1 FROM deferrals WHERE session_id = ?)";

function registerDeferral(db, sid, req) {
  return tx(
    db,
    () =>
      db
        .prepare(
          `INSERT INTO deferrals (session_id, seq, title, revisit_when, from_action_seq, created_at, created_turn)
           VALUES (?, ${NEXT_DEFERRAL_SEQ}, ?, ?, NULL, ?, ${CURRENT_TURN})
           RETURNING seq`,
        )
        .get(sid, sid, req.title, req.revisit_when, now(), sid).seq,
  );
}

// アクションを deferred で決着させ、後回しを 1 件作る。title は元のアクションの写し
function deferAction(db, sid, seq, revisit_when) {
  return tx(db, () => {
    requirePending(db, "action", sid, seq);
    const decided_turn = insertDecision(db, "action", sid, seq, "deferred", null, null);
    const row = db
      .prepare(
        `INSERT INTO deferrals (session_id, seq, title, revisit_when, from_action_seq, created_at, created_turn)
         SELECT ?, ${NEXT_DEFERRAL_SEQ}, a.title, ?, a.seq, ?, ${CURRENT_TURN}
         FROM actions a WHERE a.session_id = ? AND a.seq = ?
         RETURNING seq`,
      )
      .get(sid, sid, revisit_when, now(), sid, sid, seq);
    return { seq: row.seq, decided_turn };
  });
}

function decide(db, kind, sid, seq, outcome, reason, note) {
  return tx(db, () => {
    requirePending(db, kind, sid, seq);
    return insertDecision(db, kind, sid, seq, outcome, reason, note);
  });
}

// やり取りを 1 回進める。セッションが無ければ作る
function startTurn(db, sid, repository, agentSessionId, ts) {
  return tx(db, () => {
    const { turn } = db
      .prepare(
        `INSERT INTO sessions (id, repository, turn, created_at) VALUES (?, ?, 1, ?)
         ON CONFLICT (id) DO UPDATE SET turn = COALESCE(turn, 0) + 1
         RETURNING turn`,
      )
      .get(sid, repository, ts);
    db.prepare("INSERT INTO turns (session_id, turn, claude_code_session_id, started_at) VALUES (?, ?, ?, ?)").run(
      sid,
      turn,
      agentSessionId ?? null,
      ts,
    );
    return { turn, ...pendingSeqs(db, sid) };
  });
}

function pendingSeqs(db, sid) {
  const seqs = (view) => db.prepare(`SELECT seq FROM ${view} WHERE session_id = ? ORDER BY seq`).all(sid).map((r) => r.seq);
  return {
    pending_seqs: seqs("pending_actions"),
    pending_request_seqs: seqs("pending_user_requests"),
    pending_deferral_seqs: seqs("pending_deferrals"),
  };
}

const ACTION_COLUMNS = "session_id, seq, title, ok_forecast, need_forecast, risk_note, on_ok, on_ng, replaces_seq, created_at";

// 未処理を返す。sid を渡せばそのセッションだけ、渡さなければ全セッション。差分は本文ごと付ける
function listPending(db, sid) {
  const where = sid === undefined ? "" : "WHERE session_id = ?";
  const params = sid === undefined ? [] : [sid];
  const diffs = new Map();
  for (const d of db
    .prepare(
      `SELECT d.session_id, d.seq, d.file, d.diff FROM action_diffs d JOIN pending_actions p USING (session_id, seq)
       ${sid === undefined ? "" : "WHERE d.session_id = ?"} ORDER BY d.session_id, d.seq, d.idx`,
    )
    .all(...params)) {
    const key = `${d.session_id}\n${d.seq}`;
    diffs.set(key, [...(diffs.get(key) ?? []), { file: d.file, diff: d.diff }]);
  }
  const actions = db
    .prepare(`SELECT ${ACTION_COLUMNS} FROM pending_actions ${where} ORDER BY session_id, seq`)
    .all(...params)
    .map((a) => ({ ...a, diffs: diffs.get(`${a.session_id}\n${a.seq}`) ?? [] }));
  const requests = db
    .prepare(
      `SELECT session_id, seq, title, steps, hand_back, replaces_seq, created_at FROM pending_user_requests ${where} ORDER BY session_id, seq`,
    )
    .all(...params);
  const deferrals = db
    .prepare(
      `SELECT session_id, seq, title, revisit_when, from_action_seq, created_at FROM pending_deferrals ${where} ORDER BY session_id, seq`,
    )
    .all(...params);
  return { actions, requests, deferrals };
}

// ---------- 一覧のページ ----------

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
function writePage(db) {
  const tmp = `${PAGE_PATH}.tmp.${process.pid}`;
  writeFileSync(tmp, renderPage(db));
  renameSync(tmp, PAGE_PATH);
}

// ---------- 共通 ----------

function readStdin() {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// origin の末尾の owner/repo だけを使う。取れなければディレクトリ名
function repository(cwd) {
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
const repositorySessionId = (repo) => `repo:${repo}`;

const shellQuote = (s) => (/^[A-Za-z0-9_.:@%+=/-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

// このスクリプトを実パスとセッションで呼ぶ書き方。文脈に差し込んで、エージェントがそのまま使えるようにする
function selfCommand(sid) {
  return `node "${fileURLToPath(import.meta.url)}" --session ${shellQuote(sid)}`;
}

function format(actions) {
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

function formatRequests(requests) {
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

function formatDeferrals(deferrals) {
  return deferrals
    .map((f) => {
      const lines = [`- **D${f.seq}** ${indent(f.title)}`, `  - 戻す条件: ${indent(f.revisit_when)}`];
      if (f.from_action_seq) lines.push(`  - A${f.from_action_seq} から移した`);
      return lines.join("\n");
    })
    .join("\n");
}

// 数字だけと A 付きはアクション、R 付きは依頼、D 付きは後回し
function parseRef(raw) {
  const m = /^([ARD]?)([1-9]\d*)$/i.exec(raw ?? "");
  if (!m) return undefined;
  const p = m[1].toUpperCase();
  const seq = Number(m[2]);
  if (!isSeq(seq)) return undefined;
  return { kind: p === "R" ? "request" : p === "D" ? "deferral" : "action", seq };
}

// turn が数えられていなければ（hook が動かない環境）、出力から turn を省く
const turnNote = (turn, before) => {
  const parts = [before, turn === null || turn === undefined ? undefined : `turn ${turn}`].filter(Boolean);
  return parts.length ? `（${parts.join("、")}）` : "";
};

// ---------- hook ----------

function log(msg) {
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

async function hookSessionStart() {
  const db = await openDb();
  writePage(db);
  process.stdout.write(JSON.stringify({ systemMessage: `ネクストアクションのページ:\n${pathToFileURL(PAGE_PATH).href}` }));
  log("OK session-start");
}

async function hookTurn() {
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
async function hookStop() {
  const input = hookInput();
  if (input.stop_hook_active === true) return;
  const sid = hookSessionId(input);
  if (!sid) return log("SKIP stop — hook の入力に session_id が無い");
  const db = await openDb();
  const { actions, deferrals } = listPending(db, sid);
  // 未処理のアクションがあるときは後回しの件数も出さない。出すと毎回の応答を 1 回余分に続けさせる
  if (actions.length) return;
  const lines = [
    "未処理のネクストアクションはありません。",
    "ネクストアクションがないならユーザーはなにも許可しません。",
    "この回で承認を求める事項を出していたら create-next-action で登録する。無ければこのまま終えてよい。",
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

// ---------- エージェント用 ----------

function fail(msg) {
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

async function cli(cmd, args, sid) {
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
