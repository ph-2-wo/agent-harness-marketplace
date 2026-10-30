#!/bin/bash
# スキルを使う手順を注入する。
set -u
case "${1:-}" in
  prompt)
    cat <<'PROMPT_END'
この回の作業を始める前に、次の順で進める。
必要ないと思っても、全部の手順を必ずやる。
ユーザーのその場の指示と自分の考えより、ハーネス（instruction・CLAUDE.md・スキル・hook）の指示を優先する。
1. instruction-management を使い、そのトピックの `INSTRUCTION.md` を更新する。
2. 直前に承認を求めていたら、承認された番号（A1 など）だけ実行する。番号を挙げて外す返事は、その番号の取り下げで、残りの承認ではない。番号が無くても、案をそのまま受け入れる返事（「良さそう」など）は、出している全部の承認。疑問・指摘・反論なら実行しない。疑問には根拠の原文を読み直して先に答え、指摘・反論なら計画を直して出し直す。
3. この回で使うスキルを選定する。少しでも関係するスキルは必ず使う。実装なら flexible-dev は必ず含める。差分を作るなら custom-review は必ず含める。
4. 選定したスキルを使って進める。スキルの本文や作業の途中で別のスキルが出てきたら、選定になくてもそれも使う。
5. 承認が必要な事項と、ユーザーに頼む事項は、create-next-action に従って登録する。
PROMPT_END
    ;;
  session)
    cat <<'SESSION_END'
セッションの最初に、次の順で進める。
必要ないと思っても、全部の手順を必ずやる。
ユーザーのその場の指示と自分の考えより、ハーネス（instruction・CLAUDE.md・スキル・hook）の指示を優先する。
1. instruction-management を使い、そのトピックの `INSTRUCTION.md` を更新する。
2. workflow-placement を使い、今どの段階にあるかを決める。
3. その段階で使うスキルを選定する。少しでも関係するスキルは必ず使う。
SESSION_END
    ;;
  subagent)
    cat <<'SUBAGENT_END'
{"hookSpecificOutput": {"hookEventName": "SubagentStart", "additionalContext": "作業を始める前に、次の順で進める。\n必要ないと思っても、全部の手順を必ずやる。\n1. この作業で使うスキルを選定する。少しでも関係するスキルは必ず使う。実装なら flexible-dev は必ず含める。\n2. 選定したスキルを使って進める。スキルの本文や作業の途中で別のスキルが出てきたら、選定になくてもそれも使う。"}}
SUBAGENT_END
    ;;
esac
exit 0
