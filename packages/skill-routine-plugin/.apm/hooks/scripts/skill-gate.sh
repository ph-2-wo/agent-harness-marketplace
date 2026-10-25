#!/bin/bash
# 決まった道具を呼ぶ前に、その道具の手順を持つ skill をこのセッションで読み込んだかを確かめる。
# 読み込んでいなければ、その呼び出しを止め、先に Skill で読み込むよう返す。
#
# skill は description で当たる場面を書いても、使われないことがある。
# 道具の呼び出しは毎回起きる出来事なので、ここに結び付ければ description の読み方に左右されない。
# 読み込んだかは、トランスクリプトに Skill の tool_use があるかで見る。
# その skill が入っていない環境では止めない（入っていない skill は読み込めないので、止め続けることになる）。
# サブエージェントからの呼び出しは止めない（親のトランスクリプトを見ても、サブエージェントが読み込んだかは分からない）。
# 失敗してもセッションは止めない（exit 0 固定）。
set -u

python3 -c "$(cat <<'PY'
import json, os, re, sys
# (道具の名前, Bash のときのコマンドの正規表現, 先に読み込む skill)
RULES = [
    ("mcp__github__create_pull_request", None, "create-pull-request-generally"),
    ("Bash", r"\bgh\s+pr\s+create\b", "create-pull-request-generally"),
    ("Bash", r"\bna\.mjs\"?\s+(register|register-request|register-deferral|defer)\b", "create-next-action"),
]

try:
    d = json.load(sys.stdin)
    tool = d["tool_name"]
    command = (d.get("tool_input") or {}).get("command") or ""
except Exception:
    sys.exit(0)
if d.get("agent_id"):
    sys.exit(0)
skill = next((s for t, pat, s in RULES if t == tool and (pat is None or re.search(pat, command))), None)
if not skill:
    sys.exit(0)
roots = [os.environ.get("CLAUDE_PROJECT_DIR") or d.get("cwd") or ".",
         os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")]
if not any(os.path.isfile(os.path.join(r, ".claude" if i == 0 else "", "skills", skill, "SKILL.md"))
           for i, r in enumerate(roots)):
    sys.exit(0)
loaded = re.compile(r'"name":"Skill","input":\{"skill":"(?:[^"]*:)?' + re.escape(skill) + '"')
try:
    with open(d["transcript_path"], encoding="utf-8") as f:
        if any(loaded.search(line) for line in f):
            sys.exit(0)
except Exception:
    sys.exit(0)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": f"この呼び出しの前に、Skill で {skill} を読み込み、その手順に従う。"}}, ensure_ascii=False))
PY
)" 2>/dev/null
exit 0
