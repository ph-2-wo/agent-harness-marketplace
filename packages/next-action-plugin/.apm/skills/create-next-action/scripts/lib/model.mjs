// 記録する値の形とバリデーション。
// 標準入力の JSON を検証し、決まりに合わなければ Refusal を投げる

export const OK_LABEL = { high: "ok 高", mid: "ok 中", low: "ok 低" };
export const NEED_LABEL = { high: "要 高", mid: "要 中", low: "要 低" };

const LEVELS = ["high", "mid", "low"];
export const REASONS = ["rejected", "sent_back", "unneeded"];

// 1 つの diff の行数（コンテキスト行も含む全行）と、diffs の個数の上限
const DIFF_LIMITS = { lines: 30, count: 5 };
const DIFF_ADVICE =
  "keep only the parts needed to decide on approval; if you cannot narrow them down, consider whether the action's scope is too large";

// セッションごとの未処理のアクションの件数。依頼と後回しは数えない。
// 登録の前に max 件あれば登録を断る（replaces 付きの出し直しは件数が増えないので断らない）。登録の後に warn 件以上なら警告を出す。
export const PENDING_LIMITS = { warn: 4, max: 5 };

// 記録の決まりに合わない入力。code・field・message を stderr に出す
export class Refusal extends Error {
  constructor(code, message, field) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

export const invalid = (field, message) => new Refusal("invalid_value", message, field);

export const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
export const isText = (v) => typeof v === "string" && v.length > 0;
export const isSeq = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 1;

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
export const diffLines = (diff) => diff.replace(/\r?\n$/, "").split(/\r?\n/);

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

export function parseRegisterRequest(input) {
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

export function parseUserRequestRegistration(input) {
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

export function parseDeferralRegistration(input) {
  requireObject(input);
  rejectUnknown(input, ["title", "revisit_when"]);
  if (!isText(input.title)) throw invalid("title", "title must be a non-empty string");
  if (!isText(input.revisit_when)) throw invalid("revisit_when", "revisit_when must be a non-empty string");
  return { title: input.title, revisit_when: input.revisit_when };
}
