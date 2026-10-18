# Next Action Hook Plugin

`next-action-plugin` の CLI を、agent の会話ごとに使い分けさせる hook の package。

## 入るもの・入らないもの

- 入る: CLI のコマンドと未処理の番号をターンごとに差し込む hook、一覧のページの場所を会話の始めに知らせる hook、登録の漏れを応答の終わりに確かめる hook
- 入らない: 記録の仕方の skill と、記録する CLI（`next-action-plugin`）

`next-action-plugin` だけでも記録はできるが、番号はリポジトリごとに1組になり、同じリポジトリの会話どうしで混ざる。
この package は、会話の ID を `--session` に入れたコマンドを毎回渡し、会話ごとに番号を分ける。

hook は入れた環境のすべてのターンに効くので、skill の package から分けている。
skill だけを使いたい環境に、毎回の差し込みと応答の終わりの確かめを持ち込まないため。

## Hooks

Claude Code と Codex で動く。どちらも受け付ける出力の形だけを使う。

- `next-action`（`SessionStart`）: 一覧のページを書き、その場所を `systemMessage` で1回知らせる
- `next-action`（`UserPromptSubmit`）: やり取りを1回数え、`--session <会話の ID>` を含んだ CLI のコマンドを文脈に差し込む。
  未処理のネクストアクション・未完了の依頼があればその番号を、決着の無い後回しがあればその件数を一緒に差し込む
- `next-action`（`Stop`）: その会話に未処理のネクストアクションが無ければ、登録を忘れていないかを確かめさせるため、`decision: "block"` で1回だけ続けさせる

失敗してもセッションは止めない。何が起きたかは `next-action-plugin` の README にある記録の置き場の `hook.log` に残る。
`node` が要る（Node v22.13.0 / v23.4.0 以上）。

hook のスクリプト `scripts/na.mjs` は、`next-action-plugin` の `create-next-action` にある `scripts/na.mjs` と同じファイル。
APM は hook のコマンドからパッケージの外のファイルを指せず、skill の置き場も agent ごとに違うので、写しを持つ。
変えるときは両方を変え、`cmp` で一致を確かめる。

## Dependency

| 部品 | 依存先 |
|---|---|
| `next-action` | `create-next-action`（`next-action-plugin`。差し込む文が名指しする） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install next-action-hook-plugin@agent-harness-marketplace
```

## Usage

install すると、Claude Code では hook が `.claude/settings.json` に、Codex では `.codex/hooks.json` に登録されて毎回動く。
Codex は、新しい hook を `/hooks` で確かめて信頼するまで動かさない。
Codex の hook のコマンドは、APM がリポジトリの直下からの相対パスで登録し、Codex は会話の作業ディレクトリで実行する。
リポジトリの直下以外で Codex を起動すると hook は動かない。
