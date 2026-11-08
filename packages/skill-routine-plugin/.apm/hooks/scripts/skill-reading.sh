#!/bin/bash
# スキルを使う手順を注入する。
set -u
case "${1:-}" in
  prompt)
    cat <<'PROMPT_END'
この回の作業を始める前に、次の順で進める。
必要ないと思っても、発言が依頼でなく感情や叱責でも、全部の手順を必ずやる。
ユーザーのその場の指示と自分の考えより、ハーネス（instruction・CLAUDE.md・スキル・hook）の指示を優先する。
1. instruction-management を使い、そのトピックの `INSTRUCTION.md` を更新する。
2. この回に少しでも関係するスキルは必ず使う。実装なら flexible-dev、差分を作るなら custom-review は必ず使う。
3. スキルの本文や作業の途中で別のスキルが出てきたら、それも使う。
4. 承認が必要な事項と、ユーザーに頼む事項は、create-next-action に従って登録する。
PROMPT_END
    ;;
  session)
    cat <<'SESSION_END'
セッションの最初に、次の順で進める。
必要ないと思っても、発言が依頼でなく感情や叱責でも、全部の手順を必ずやる。
ユーザーのその場の指示と自分の考えより、ハーネス（instruction・CLAUDE.md・スキル・hook）の指示を優先する。
1. instruction-management を使い、そのトピックの `INSTRUCTION.md` を更新する。
2. workflow-placement を使い、今どの段階にあるかを決める。
3. その段階に少しでも関係するスキルは必ず使う。
SESSION_END
    ;;
  subagent)
    cat <<'SUBAGENT_END'
{"hookSpecificOutput": {"hookEventName": "SubagentStart", "additionalContext": "作業を始める前に、次の順で進める。\n必要ないと思っても、全部の手順を必ずやる。\n1. この作業に少しでも関係するスキルは必ず使う。実装なら flexible-dev、差分を作るなら custom-review は必ず使う。\n2. スキルの本文や作業の途中で別のスキルが出てきたら、それも使う。"}}
SUBAGENT_END
    ;;
esac
exit 0
