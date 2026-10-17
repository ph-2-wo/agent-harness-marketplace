#!/bin/bash
# 英語で書かれた応答を、日本語で書き直すよう 1 回だけ差し戻す。
#
# 判定は機械的に行い、判定モデルに任せない。判定に要るのは応答の本文だけのため。
# コード・URL・引用行を除いた文で、日本語の文字が「英字＋日本語の文字」の 2 割未満、かつ英字が 40 字以上なら英語とみなす。
# 失敗してもセッションは止めない（exit 0 固定）。
set -u

python3 -c "$(cat <<'PY'
import json, re, sys
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
text = re.sub(r"`[^`\n]*`", "", text)
text = re.sub(r"https?://\S+", "", text)
text = "\n".join(l for l in text.splitlines() if not l.lstrip().startswith(">"))
latin = len(re.findall(r"[A-Za-z]", text))
ja = len(re.findall(r"[぀-ヿ㐀-鿿]", text))
if latin < 40 or ja >= (latin + ja) * 0.2:
    sys.exit(0)
print(json.dumps({"decision": "block", "reason": "日本語で書き直して"}, ensure_ascii=False))
PY
)" 2>/dev/null
exit 0
