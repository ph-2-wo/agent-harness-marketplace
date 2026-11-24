# Keep Going Plugin

会話が決めたトークン量に届くまで、ターンの終わりを差し止める hook の package。

## 入るもの・入らないもの

- 入る: 設定したトークン量に届くまで、止まらず続けるよう差し戻す Stop hook
- 入らない: 時刻で止める条件、応答の書き方を確かめる hook（`reply-gate-plugin`）

スケジュールタスクが起こすクラウドのセッションは、1つ報告するたびにターンを終えて止まりやすい。
この package は、ターンを終えようとした時点で会話のトークン量を数え、設定した上限に届いていなければ続けさせる。

hook は入れた環境のすべてのセッションに効くので、他の hook の package から分けている。
ただし設定ファイルが無いセッションでは何もしないので、入れただけでは動作は変わらない。

## Hooks

- `keep-going`（`Stop`）: プロジェクトの `.claude/keep-going.local.json` があり、会話のトークン数が `max_context_tokens` 未満なら、`decision: block` でターンの終わりを差し止める。

トークン数は、hook の入力にある `transcript_path` の JSONL から、最後の assistant 行の `message.usage` の `input_tokens`・`cache_read_input_tokens`・`cache_creation_input_tokens` の合計で数える。
合計が 0 の行（合成された assistant 行など）は読み飛ばす。
これは今の会話の量であり、累計の消費量ではない。

`stop_hook_active` は見ない。
差し止めの続きでも、トークン量に届くまで差し止めるため。

次のときは何もせず、ターンを終わらせる。

- 設定ファイルが無い、読めない、`max_context_tokens` が正の整数でない
- `transcript_path` が無い、読めない、assistant 行が無い
- トークン数が上限以上

設定ファイルがあるときだけ、判定（block・stop・skip）と失敗を `.claude/keep-going.local.log` に1行ずつ残す。
失敗してもセッションは止めない（exit 0 固定）。
`python3` が要る。

## Usage

install したら、プロジェクトに `.claude/keep-going.local.json` を置く。
形は [keep-going.local.json.example](keep-going.local.json.example) にある。

止める条件はトークン量だけで、時刻は持たない。
差し止めを止めたいときは、ファイルを消すか、`max_context_tokens` を下げる。

## 設定ファイルを git に載せない

設定ファイルとログは、そのセッション限りのものなので git に載せない。
プロジェクトの `.gitignore` に次の1行を足す。
すでに `.claude/*` を除外しているプロジェクトでは要らない。

```gitignore
.claude/keep-going.local.*
```

## 上限

Claude Code の Stop hook は、差し止めを連続で繰り返せる回数に上限がある（連続8回）。
数はツールを呼ぶたびに0に戻るので、作業を続けている間は当たらない。
ツールを呼ばない応答が続いて上限に当たると、トークン量に届いていなくてもターンは終わる。
上限は環境変数 `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` で変えられる。
公式の仕様は <https://code.claude.com/docs/en/hooks.md> の Stop の節にある。

## Dependency

この package は依存を持たない。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install keep-going-plugin@agent-harness-marketplace
```

install すると、hook は `.claude/settings.json` に登録され、ターンの終わりのたびに動く。

## Test

```bash
python3 -m unittest discover -s packages/keep-going-plugin/tests
```
