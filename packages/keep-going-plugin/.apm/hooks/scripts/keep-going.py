#!/usr/bin/env python3
"""Stop hook。会話のトークン数が設定した上限に届くまで、ターンの終わりを差し止める。

設定は <プロジェクト>/.claude/keep-going.local.json の max_context_tokens。
ファイルが無い・読めない・値が正の整数でない・トークン数を数えられないときは、何もしない。
設定ファイルがあるときだけ、判定と失敗を <プロジェクト>/.claude/keep-going.local.log に1行ずつ残す。
"""
import json
import os
import sys
import traceback
from datetime import datetime, timezone

CONFIG_RELATIVE_PATH = os.path.join(".claude", "keep-going.local.json")
LOG_RELATIVE_PATH = os.path.join(".claude", "keep-going.local.log")


def log(project, message):
    """判定と失敗を1行残す。ログが書けなくても判定は止めない。"""
    try:
        with open(os.path.join(project, LOG_RELATIVE_PATH), "a", encoding="utf-8") as f:
            f.write(f"{datetime.now(timezone.utc).isoformat()} {message}\n")
    except OSError:
        pass


def read_limit(path):
    """設定ファイルから上限を返す。無い・不正なら None。"""
    try:
        with open(path, encoding="utf-8") as f:
            value = json.load(f).get("max_context_tokens")
    except (OSError, ValueError, AttributeError):
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        return None
    return value


def count_tokens(transcript_path):
    """transcript の最後の assistant 行の usage から、今の会話のトークン数を返す。数えられなければ None。"""
    tokens = None
    try:
        with open(transcript_path, encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue
                if not isinstance(entry, dict) or entry.get("type") != "assistant":
                    continue
                message = entry.get("message")
                usage = message.get("usage") if isinstance(message, dict) else None
                if not isinstance(usage, dict):
                    continue
                total = sum(
                    usage.get(key) or 0
                    for key in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")
                )
                # 合計 0 の行（合成された assistant 行など）は、会話の量を表さないので読み飛ばす
                if total > 0:
                    tokens = total
    except (OSError, TypeError, ValueError):
        return None
    return tokens


def decide(payload, project):
    """hook の入力から、差し止めるときの出力（dict）を返す。止めないなら None。"""
    config_path = os.path.join(project, CONFIG_RELATIVE_PATH)
    if not os.path.exists(config_path):
        return None
    limit = read_limit(config_path)
    if limit is None:
        log(project, "skip: max_context_tokens が正の整数でない、または設定ファイルが読めない")
        return None
    transcript_path = payload.get("transcript_path")
    tokens = count_tokens(transcript_path) if isinstance(transcript_path, str) else None
    if tokens is None:
        log(project, f"skip: transcript からトークン数を数えられない（transcript_path={transcript_path!r}）")
        return None
    if tokens >= limit:
        log(project, f"stop: tokens={tokens} limit={limit}")
        return None
    log(project, f"block: tokens={tokens} limit={limit}")
    return {
        "decision": "block",
        "reason": f"会話は {tokens} トークンで、設定した上限 {limit} に届いていません。止まらずに作業を続けてください。",
    }


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    if not isinstance(payload, dict):
        return
    project = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or "."
    try:
        result = decide(payload, project)
    except Exception:
        log(project, "error: " + traceback.format_exc().replace("\n", " | "))
        return
    if result:
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
