# Harness Dev Plugin

ハーネス（CLAUDE.md・skill・hook）そのものを書く skill package。

## 入るもの・入らないもの

- 入る: ハーネスに何をどう書くかの手順
- 入らない: APM の機構に固有の操作手順（`apm-dev-plugin`）、書いたものの review（`review-plugin`）

agent が書く手順は「そう書いてあるけど具体的にどうすればいいのか」が埋まっておらず、読んでも実行できない。
この package は、書いた手順を実行できる具体度まで落とす手順を与える。

## Skills

- `harness-proceduralization`: ハーネス記述を再現性が十分な手順に落とし込む

## Dependency

なし（単体で機能する）。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install harness-dev-plugin@agent-harness-marketplace
```

## Usage

新しいルールや skill を書くとき。`skill-review`（`review-plugin`）から呼ばれる。
