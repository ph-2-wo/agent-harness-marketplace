"""keep-going の Stop hook を、keep-going.py に入力を渡して試す。

守る仕様:
- 設定ファイルが無いプロジェクトでは、何も出さず exit 0
- 設定ファイルがあり、トークン数が上限未満なら、decision=block を出す
- トークン数が上限以上なら、何も出さない
- トークン数は最後の assistant 行の usage の 3 項目の合計
- 設定・transcript・入力が壊れていても、何も出さず exit 0
"""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).resolve().parent.parent / ".apm" / "hooks" / "scripts" / "keep-going.py"


def assistant(input_tokens=0, cache_read=0, cache_creation=0):
    usage = {
        "input_tokens": input_tokens,
        "cache_read_input_tokens": cache_read,
        "cache_creation_input_tokens": cache_creation,
        "output_tokens": 999,
    }
    return json.dumps({"type": "assistant", "message": {"usage": usage}})


class Project:
    """各テストが自分で作る、一時のプロジェクトディレクトリ（seed）。"""

    def __init__(self, test):
        tmp = tempfile.TemporaryDirectory()
        test.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        (self.root / ".claude").mkdir()

    def config(self, text):
        (self.root / ".claude" / "keep-going.local.json").write_text(text, encoding="utf-8")

    def transcript(self, lines):
        path = self.root / "transcript.jsonl"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return str(path)

    def run(self, stdin, env_project=True):
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_PROJECT_DIR"}
        if env_project:
            env["CLAUDE_PROJECT_DIR"] = str(self.root)
        if not isinstance(stdin, str):
            stdin = json.dumps(stdin)
        return subprocess.run(
            ["python3", str(HOOK)], input=stdin, capture_output=True, text=True, env=env, cwd=self.root
        )


def assert_continues(test, proc):
    test.assertEqual(proc.returncode, 0)
    test.assertEqual(proc.stdout.strip(), "")


def assert_blocked(test, proc):
    test.assertEqual(proc.returncode, 0)
    out = json.loads(proc.stdout)
    test.assertEqual(out["decision"], "block")
    return out


class KeepGoingTest(unittest.TestCase):
    def test_設定ファイルが無ければ何もしない(self):
        p = Project(self)
        t = p.transcript([assistant(input_tokens=10)])
        assert_continues(self, p.run({"transcript_path": t}))

    def test_上限未満なら差し止める(self):
        p = Project(self)
        p.config('{"max_context_tokens": 60000}')
        t = p.transcript([assistant(input_tokens=100, cache_read=200, cache_creation=300)])
        out = assert_blocked(self, p.run({"transcript_path": t}))
        self.assertIn("会話は 600 トークン", out["reason"])
        self.assertIn("上限 60000 ", out["reason"])
        self.assertIn("コンテキストの容量ではありません", out["reason"])
        self.assertIn(os.path.join(".claude", "keep-going.local.json") + " を消して", out["reason"])

    def test_使用量が_0_の行は会話の量とみなさない(self):
        p = Project(self)
        p.config('{"max_context_tokens": 5000}')
        t = p.transcript([assistant(input_tokens=9000), assistant()])
        assert_continues(self, p.run({"transcript_path": t}))

    def test_上限以上なら差し止めない(self):
        p = Project(self)
        p.config('{"max_context_tokens": 600}')
        t = p.transcript([assistant(input_tokens=100, cache_read=200, cache_creation=300)])
        assert_continues(self, p.run({"transcript_path": t}))
        t = p.transcript([assistant(input_tokens=1000)])
        assert_continues(self, p.run({"transcript_path": t}))

    def test_最後の_assistant_行の値で数える(self):
        p = Project(self)
        p.config('{"max_context_tokens": 5000}')
        t = p.transcript([assistant(input_tokens=9000), assistant(input_tokens=10)])
        assert_blocked(self, p.run({"transcript_path": t}))
        t = p.transcript([assistant(input_tokens=10), assistant(input_tokens=9000)])
        assert_continues(self, p.run({"transcript_path": t}))

    def test_壊れた行と_usage_の無い行は読み飛ばす(self):
        p = Project(self)
        p.config('{"max_context_tokens": 5000}')
        t = p.transcript([
            assistant(input_tokens=10),
            "{broken",
            json.dumps({"type": "user", "message": {"usage": {"input_tokens": 99999}}}),
            json.dumps({"type": "assistant", "message": {"content": "no usage"}}),
            "[1, 2]",
        ])
        assert_blocked(self, p.run({"transcript_path": t}))

    def test_プロジェクトの場所は環境変数が無ければ_cwd_を使う(self):
        p = Project(self)
        p.config('{"max_context_tokens": 5000}')
        t = p.transcript([assistant(input_tokens=10)])
        assert_blocked(self, p.run({"transcript_path": t, "cwd": str(p.root)}, env_project=False))

    def test_止めずに通す入力(self):
        cases = {
            "設定が壊れた JSON": ('{"max_context_tokens": ', {"ok": True}),
            "設定が JSON の配列": ("[1]", {"ok": True}),
            "上限が 0": ('{"max_context_tokens": 0}', {"ok": True}),
            "上限が負": ('{"max_context_tokens": -5}', {"ok": True}),
            "上限が文字列": ('{"max_context_tokens": "60000"}', {"ok": True}),
            "上限が真偽値": ('{"max_context_tokens": true}', {"ok": True}),
            "上限の項目が無い": ("{}", {"ok": True}),
            "transcript_path が無い": ('{"max_context_tokens": 5000}', {}),
            "transcript_path が文字列でない": ('{"max_context_tokens": 5000}', {"transcript_path": 7}),
            "transcript が存在しない": ('{"max_context_tokens": 5000}', {"transcript_path": "/nonexistent/x.jsonl"}),
            "transcript に assistant 行が無い": ('{"max_context_tokens": 5000}', {"transcript_empty": True}),
        }
        for name, (config, payload) in cases.items():
            with self.subTest(name):
                p = Project(self)
                p.config(config)
                if payload.get("ok"):
                    payload = {"transcript_path": p.transcript([assistant(input_tokens=10)])}
                elif payload.get("transcript_empty"):
                    payload = {"transcript_path": p.transcript([json.dumps({"type": "user"})])}
                assert_continues(self, p.run(payload))

    def test_入力の_JSON_が壊れていても止めない(self):
        for name, stdin in {"壊れた JSON": "{not json", "空": "", "配列": "[]"}.items():
            with self.subTest(name):
                p = Project(self)
                p.config('{"max_context_tokens": 5000}')
                assert_continues(self, p.run(stdin))


if __name__ == "__main__":
    unittest.main()
