# Communication Plugin

ユーザーへ何をどう伝えるか、の skill package。

## 入るもの・入らないもの

- 入る: 説明・報告・依頼・質問の書き方
- 入らない: 仕事の進め方（`dev-workflow-plugin`）、成果物の review（`review-plugin`）、恒久ドキュメントの書き方（`agent-base-plugin` の `writing-docs`）、応答の長さ・言語を確かめて差し戻す hook（`reply-gate-plugin`）

agent は、自分が積み上げた文脈を相手も持っている前提で書く。そのため報告や依頼は読み手に伝わらない。
説明を求められると、調べたことを調べた順に並べた羅列になる。
なぜそう動いたかを聞かれると、指示の文面を示さずに自分の言葉で言い直す。
この package は、その各場面に手順を与える。

## Skills

- [`zero`](docs/skills/zero.md): 前提知識のない読み手に伝わる説明・報告を書く
- [`organized-explain`](docs/skills/organized-explain.md): 説明を要求されたときに、整理された説明を作る
- `cite-action-basis`: 会話中の行動と、会話に入っている指示の文面との対応を、引用で示す

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `organized-explain` | `zero`（同 package）、`document-minimization-review`（`review-plugin`）、`structured-refactor`（`agent-base-plugin`） |
| `zero` | なし（単体で機能する） |
| `cite-action-basis` | なし（単体で機能する） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install communication-plugin@agent-harness-marketplace
```

## Usage

説明・報告・依頼を書くとき。行動の根拠を指示の文面で示すよう求められたとき。
