#!/bin/bash
# スキルを読み込んだら、「<スキル名> を使う」タスクを1件登録する。
#
# hook からタスクを作る公式の方法は無いので、タスクのファイルを直接書く。
# 置き場所（~/.claude/tasks/<CLAUDE_CODE_TASK_LIST_ID か session_id>/）は公式ドキュメントにある。
# ファイルの形（<番号>.json の6項目）と番号の決め方は公式に無く、実測による。版が変わると効かなくなりうる。
# 実測: 外から書いた <番号>.json は TaskList に出た。タスクを消すと .highwatermark に消した最大の番号が入る。
# 番号は既存のファイルと .highwatermark の大きい方に 1 を足す。並列の Skill 呼び出しとぶつかったら進めて取り直す。
# 外すスキルは skill-reading.sh が別に使うよう指示しているもの。あちらを変えたらここも合わせる。
# サブエージェントからの呼び出しでは登録しない（親のリストに残り、閉じる者がいなくなるため）。
# 同じ件名のタスクが未完了で残っていれば、足さない。
# 書けなかったときだけ、タスクの置き場所と同じ設定ディレクトリ（~/.claude など）の skill-task.log に残す。
# 失敗してもセッションは止めない（exit 0 固定）。
set -u

python3 -c "$(cat <<'PY'
import json, os, sys, tempfile, time
EXCLUDE = {"instruction-management", "create-next-action", "workflow-placement"}
DESCRIPTION = "\n".join([
    "使い終わったら完了する。",
    "どうしても不要な場合は使わず完了する。",
    "一つのタスクとして大きすぎる場合は、新しいタスクに分割して登録するところまでをして完了とする。",
])

def log(msg):
    try:
        d = os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "skill-task.log"), "a") as f:
            f.write(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + " " + msg + "\n")
    except Exception:
        pass

try:
    d = json.load(sys.stdin)
    skill = d["tool_input"]["skill"]
    sid = d["session_id"]
except Exception:
    sys.exit(0)
if d.get("agent_id") or not isinstance(skill, str) or skill.split(":")[-1] in EXCLUDE:
    sys.exit(0)
subject = f"{skill} を使う"
base = os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")
tdir = os.path.join(base, "tasks", os.environ.get("CLAUDE_CODE_TASK_LIST_ID") or sid)
try:
    os.makedirs(tdir, exist_ok=True)
    ids = []
    for name in os.listdir(tdir):
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(tdir, name)) as f:
                t = json.load(f)
            ids.append(int(t["id"]))
            if t.get("subject") == subject and t.get("status") in ("pending", "in_progress"):
                sys.exit(0)
        except (ValueError, KeyError, TypeError, OSError):
            continue
    try:
        with open(os.path.join(tdir, ".highwatermark")) as f:
            ids.append(int(f.read().strip()))
    except (ValueError, OSError):
        pass
    n = max(ids, default=0) + 1
    fd, tmp = tempfile.mkstemp(dir=tdir, prefix=".skill-task-")
    try:
        for _ in range(5):
            task = {"id": str(n), "subject": subject, "description": DESCRIPTION,
                    "status": "pending", "blocks": [], "blockedBy": []}
            with open(tmp, "w") as f:
                json.dump(task, f, ensure_ascii=False, indent=2)
            try:
                os.link(tmp, os.path.join(tdir, f"{n}.json"))
                break
            except FileExistsError:
                n += 1
        else:
            log(f"FAIL 番号が取れなかった: {subject}")
            sys.exit(0)
    finally:
        os.close(fd)
        os.unlink(tmp)
except Exception as e:
    log(f"FAIL {type(e).__name__}: {e}: {subject}")
    sys.exit(0)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
    "additionalContext": f"タスク #{n}「{subject}」を登録した。"}}, ensure_ascii=False))
PY
)" 2>/dev/null
exit 0
