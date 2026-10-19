// SQLite のテーブルと、記録の読み書き。
// node:sqlite は openDb の中で動的に読み込む（静的に import すると、警告を止める前に読み込まれる）

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { PENDING_LIMITS, Refusal } from "./model.mjs";

export const DATA_DIR = resolve(process.env.NEXT_ACTION_HOME || join(homedir(), ".local", "share", "next-action"));
const DB_PATH = join(DATA_DIR, "next-action.sqlite");

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

export class SetupError extends Error {}

export async function openDb() {
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

export const now = () => new Date().toISOString();

// セッションの今の turn。hook が数えていなければ NULL
const CURRENT_TURN = "(SELECT turn FROM sessions WHERE id = ?)";

// 決着を持つものの種類。SQL に埋めるのはここの固定の文字列だけ（利用者の入力は入れない）
export const KINDS = {
  action: { items: "actions", decisions: "decisions", prefix: "A", notFound: "action_not_found" },
  request: { items: "user_requests", decisions: "user_request_decisions", prefix: "R", notFound: "user_request_not_found" },
  deferral: { items: "deferrals", decisions: "deferral_decisions", prefix: "D", notFound: "deferral_not_found" },
};

// セッションが無ければ作る（repository は最初の値のまま変えない）。turn は hook が数えるまで NULL
export function ensureSession(db, sid, repository) {
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
export function registerAction(db, sid, req) {
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

export function registerUserRequest(db, sid, req) {
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

export function registerDeferral(db, sid, req) {
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
export function deferAction(db, sid, seq, revisit_when) {
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

export function decide(db, kind, sid, seq, outcome, reason, note) {
  return tx(db, () => {
    requirePending(db, kind, sid, seq);
    return insertDecision(db, kind, sid, seq, outcome, reason, note);
  });
}

// やり取りを 1 回進める。セッションが無ければ作る
export function startTurn(db, sid, repository, agentSessionId, ts) {
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
export function listPending(db, sid) {
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
