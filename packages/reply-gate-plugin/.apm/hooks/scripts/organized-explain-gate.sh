#!/bin/bash
# 長い散文の応答を、organized-explain で整理するよう 1 回だけ差し戻す。
#
# 判定は機械的に行い、Claude にも判定モデルにも任せない。
# 失敗してもセッションは止めない（exit 0 固定）。
# 閾値は環境変数 ORGANIZED_EXPLAIN_MIN_CHARS で変えられる。未設定や数字でないときは 1000。
set -u
MIN_CHARS="${ORGANIZED_EXPLAIN_MIN_CHARS:-1000}"
[[ "$MIN_CHARS" =~ ^[0-9]+$ ]] || MIN_CHARS=1000

MIN_CHARS="$MIN_CHARS" python3 -c "$(cat <<'PY'
import json, os, re, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if d.get("stop_hook_active"):
    sys.exit(0)
msg = d.get("last_assistant_message")
if not isinstance(msg, str):
    sys.exit(0)
text = re.sub(r"```.*?```", "", msg, flags=re.S)
lines = [l for l in text.splitlines() if not l.lstrip().startswith(("|", ">"))]
n = len(re.sub(r"\s", "", "".join(lines)))
if n < int(os.environ["MIN_CHARS"]):
    sys.exit(0)
reason = "整理して説明して"
print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
PY
)" 2>/dev/null
exit 0
