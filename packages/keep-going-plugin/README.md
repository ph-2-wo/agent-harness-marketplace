# Keep Going Plugin

ターンの終わりで止まらずに作業を続けさせる hook の package。

## 入るもの・入らないもの

- 入る: 設定に届くまで、続けるよう差し戻す Stop hook
- 入らない: 応答の書き方を確かめる hook（`reply-gate-plugin`）

スケジュールタスクが起こすクラウドのセッションは、1つ報告するたびにターンを終えて止まりやすい。
この package は、ターンを終えようとした時点で会話のトークン量を数え、設定した上限に届いていなければ続けさせる。

hook は入れた環境のすべてのセッションに効くので、他の hook の package から分けている。
ただし設定ファイルが無いセッションでは何もしないので、入れただけでは動作は変わらない。

## Hooks

- `keep-going`（`Stop`）: `.claude/keep-going.local.json` があり、その設定に届いていなければ、ターンの終わりを差し止める

設定ファイルが無いセッションでは何もしない。あるときは、判定を `.claude/keep-going.local.log` に残す。
`python3` が要る。

## Usage

install したら、プロジェクトに `.claude/keep-going.local.json` を置く。
形は [keep-going.local.json.example](keep-going.local.json.example) にある。

差し止めをやめたいときは、ファイルを消す。

## 設定ファイルを git に載せない

設定ファイルとログは、そのセッション限りのものなので git に載せない。
プロジェクトの `.gitignore` に次の1行を足す。
すでに `.claude/*` を除外しているプロジェクトでは要らない。

```gitignore
.claude/keep-going.local.*
```

## 上限

連続で差し止められる回数には Claude Code の上限があり、当たるとターンは終わる。
仕様は <https://code.claude.com/docs/en/hooks.md> の Stop の節にある。

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
