# Reply Gate Plugin

応答の書き方を機械的に確かめて差し戻す hook の package。

## 入るもの・入らないもの

- 入る: 応答の長さ・言語を確かめて差し戻す hook
- 入らない: 説明・報告の書き方の skill（`communication-plugin`）

skill を読ませるだけでは守られない書き方（長さ・言語）がある。
この package は、応答を終える時点でそれを確かめ、守られていなければ書き直させる。

hook は入れた環境のすべての応答に効くので、skill の package から分けている。
skill だけを使いたい環境に、差し戻しを持ち込まないため。

## Hooks

- `organized-explain-gate`（`Stop`）: 応答の散文（コード・表・引用を除く）が 1000 字以上なら、「整理して説明して」と1回だけ差し戻す。
  閾値は環境変数 `ORGANIZED_EXPLAIN_MIN_CHARS` で変えられる
- `japanese-reply-gate`（`Stop`）: 応答からコード・URL・引用行を除き、日本語の文字が「英字＋日本語の文字」の2割未満かつ英字が40字以上なら、「日本語で書き直して」と1回だけ差し戻す

どちらも判定は機械的に行い、判定モデルに任せない。失敗してもセッションは止めない。
`python3` が要る。

## Dependency

この package は依存を持たない。

`organized-explain-gate` の差し戻しは、`communication-plugin` の `organized-explain` で整理させるためのもの。
一緒に入れると、差し戻しを受けた agent が整理の手順を使える。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install reply-gate-plugin@agent-harness-marketplace
```

`organized-explain` も使うなら、`communication-plugin` も入れる。

```bash
apm install communication-plugin@agent-harness-marketplace
```

## Usage

install すると、hook は `.claude/settings.json` に登録され、応答のたびに動く。
