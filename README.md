# Agent Harness Marketplace

agent のハーネス（skill）を用途別の package にして配る APM Marketplace。

APM は Microsoft 製の OSS で、agent 向けの skill・instruction などを依存として管理するツール。

## Packages

役割と、入るもの・入らないものの境目は各 package の README の冒頭にある。

| Package | 何を配るか |
| :-- | :-- |
| [agent-base-plugin](packages/agent-base-plugin/README.md) | 一切の依存を持たない、他 skill の土台になる skill |
| [communication-plugin](packages/communication-plugin/README.md) | 説明・報告など、ユーザーへ何をどう伝えるかの skill |
| [review-plugin](packages/review-plugin/README.md) | 実際に起きた問題から蓄積した観点の review と、模倣・ドキュメント・文書の最小化・skill の各種 review skill |
| [dev-workflow-plugin](packages/dev-workflow-plugin/README.md) | 開発の現在地の判定から実装・レビュー依頼までの流れと、検討・設計・指示の管理など、仕事の進め方の skill |
| [facilitation-plugin](packages/facilitation-plugin/README.md) | 振り返り会など、人と進める会の進め方の skill |
| [harness-dev-plugin](packages/harness-dev-plugin/README.md) | ハーネス（CLAUDE.md・skill・hook）そのものを開発・整備する skill |
| [git-plugin](packages/git-plugin/README.md) | commit・PR の切り方の skill |
| [apm-dev-plugin](packages/apm-dev-plugin/README.md) | APM の機構に固有の skill 開発手順 |
| [next-action-plugin](packages/next-action-plugin/README.md) | 承認を求める事項・ユーザーへの依頼・後回しを手元の CLI で記録し、未処理を1枚のページに出す skill と、それを前提にした承認の判定の instruction と、CLI のコマンドと未処理の番号をターンごとに差し込み登録の漏れを応答の終わりに確かめる hook |
| [visualization-plugin](packages/visualization-plugin/README.md) | 表データ・数値データをグラフィカルに見せる方法のアイデア集の skill |
| [reply-gate-plugin](packages/reply-gate-plugin/README.md) | 応答の長さ・言語を機械的に確かめて差し戻す hook |
| [skill-routine-plugin](packages/skill-routine-plugin/README.md) | skill を使う毎回の手順を注入し、読み込んだ skill をタスクにする hook |
| [subagent-plugin](packages/subagent-plugin/README.md) | 組み込みのサブエージェント（`Explore`）を安いモデルで動かすよう上書きする agent 定義 |

## Install APM CLI

APM CLI を install する。

https://microsoft.github.io/apm/getting-started/installation/

## Install from Marketplace

自分の作業ディレクトリを APM project にして、Marketplace を登録する。
このリポジトリは public なので、token なしで引ける。

```bash
apm init --yes --target claude
apm marketplace add ph-2-wo/agent-harness-marketplace
```

`apm init` は引数にプロジェクト名を渡すとサブディレクトリを作る。カレントに作るなら引数なしで実行する。

各 package README に記載された package 名を指定して install する。

```bash
apm install {package-name}@agent-harness-marketplace
```

package が依存する別の package は、各 package の `apm.yml` に書いてあり、install すると一緒に入る。

install した skill は `.claude/skills/` へ展開される。instruction を持つ package は `.claude/rules/` に置く。hook を持つ package は `.claude/settings.json` に hook を登録する。既存の `CLAUDE.md` は書き換えられない。

## Update

```bash
apm update --yes
```

`apm install` は `apm.lock.yaml` に記録済みの commit を再現するだけで、新しい commit へは追随しない。

## License

[MIT](LICENSE)
