#!/bin/bash
# 決まった道具を呼ぶ前に、その道具の手順を持つ skill をこのセッションで読み込んだかを確かめる。
# 読み込んでいなければ、その呼び出しを止め、先に Skill で読み込むよう返す。
#
# skill は description で当たる場面を書いても、使われないことがある。
# 道具の呼び出しは毎回起きる出来事なので、ここに結び付ければ description の読み方に左右されない。
# 読み込んだかは、トランスクリプトに Skill の tool_use があるかで見る。
# その skill が入っていない環境では止めない（入っていない skill は読み込めないので、止め続けることになる）。
# サブエージェントからの呼び出しは止めない（親のトランスクリプトを見ても、サブエージェントが読み込んだかは分からない）。
# SKILL.md を cat や Read で直接読むのも止める。Skill で読み込まずに中身だけ使う抜け道を塞ぐため。
# 正本の .apm/skills/ は読むのを止めない（編集のために読む場所なので）。
# 失敗してもセッションは止めない（exit 0 固定）。
set -u

python3 -c "$(cat <<'PY'
import json, os, re, sys
# (道具の名前の正規表現, 見る入力の項目, 入力に当てる正規表現, 先に読み込む skill)
# 道具の名前は fullmatch で当てる。項目と正規表現が None なら道具の名前だけで当たる。
# skill が None のときは、正規表現の1つ目の組を skill 名とする。
RULES = [
    ("mcp__github__create_pull_request", None, None, "create-pull-request-generally"),
    ("Bash", "command", r"\bgh\s+pr\s+create\b", "create-pull-request-generally"),
    ("Bash", "command", r"\bna\.mjs\"?\s+(?:register|register-request|register-deferral|defer)\b", "create-next-action"),
    ("mcp__github__create_pull_request", "repo", r"^agent-harness-marketplace$", "agent-harness-marketplace-change"),
    ("Bash", "command", r"agent-harness-marketplace\S*\s+push\b", "agent-harness-marketplace-change"),
    ("Edit|Write", "file_path", r"/\.apm/skills/[^/]+/SKILL\.md$", "skill-review"),
    ("Read", "file_path", r"/\.claude/skills/([^/]+)/SKILL\.md$", None),
    ("Bash", "command", r"\b(?:cat|head|tail|sed|less)\b[^|;&]*\.claude/skills/([^/\s]+)/SKILL\.md", None),
]


def required_skills(tool, tool_input):
    found = []
    for tool_pat, field, pat, skill in RULES:
        if not re.fullmatch(tool_pat, tool):
            continue
        if field is None:
            m = None
        else:
            m = re.search(pat, str(tool_input.get(field) or ""))
            if not m:
                continue
        name = skill or m.group(1)
        if name not in found:
            found.append(name)
    return found


def is_installed(skill, roots):
    return any(os.path.isfile(os.path.join(r, ".claude" if i == 0 else "", "skills", skill, "SKILL.md"))
               for i, r in enumerate(roots))


def is_loaded(skill, transcript):
    pat = re.compile(r'"name":"Skill","input":\{"skill":"(?:[^"]*:)?' + re.escape(skill) + '"')
    return any(pat.search(line) for line in transcript)


try:
    d = json.load(sys.stdin)
    tool = d["tool_name"]
    tool_input = d.get("tool_input") or {}
except Exception:
    sys.exit(0)
if d.get("agent_id"):
    sys.exit(0)
roots = [os.environ.get("CLAUDE_PROJECT_DIR") or d.get("cwd") or ".",
         os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")]
candidates = [s for s in required_skills(tool, tool_input) if is_installed(s, roots)]
if not candidates:
    sys.exit(0)
try:
    with open(d["transcript_path"], encoding="utf-8") as f:
        transcript = f.readlines()
except Exception:
    sys.exit(0)
missing = [s for s in candidates if not is_loaded(s, transcript)]
if not missing:
    sys.exit(0)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": f"この呼び出しの前に、Skill で {'・'.join(missing)} を読み込み、その手順に従う。"}}, ensure_ascii=False))
PY
)" 2>/dev/null
exit 0
