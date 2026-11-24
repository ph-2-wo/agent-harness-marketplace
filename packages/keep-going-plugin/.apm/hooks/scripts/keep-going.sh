#!/bin/bash
# 設定ファイルがあり、会話のトークン数が上限未満なら、ターンの終わりを差し止める。
# 判定は keep-going.py が行う。失敗してもセッションは止めない（exit 0 固定）。
set -u
python3 "$(dirname "$0")/keep-going.py" 2>/dev/null
exit 0
