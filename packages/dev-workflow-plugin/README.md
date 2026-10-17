# Dev Workflow Plugin

仕事の進め方の skill package。指示の管理、案の検討、設計の決め方を担う。

## 入るもの・入らないもの

- 入る: 仕事の流れの一段階（指示を受ける・案を検討する・設計を決める）を担う skill
- 入らない: 仕事の流れの一段階ではない skill。commit の切り方（`git-plugin`）、成果物の review（`review-plugin`）、振り返り会（`facilitation-plugin`）、承認の求め方（`next-action-plugin`）

agent は、受けた指示を会話の中にだけ持ち、話が進むうちに原文と自分の解釈を混ぜる。
案を求められると、広げきる前に1つに絞るか、広げたまま判断を投げる。
この package は、その各場面に手順を与える。

## Skills

- `instruction-management`: 指示の原文・解釈・変更・解決状態をファイルで管理する
- `repeating-diamond`: 広げると収束を分けて繰り返し、案を絞り込む
- `stepwise-system-design`: 作るものの設計を、抽象・土台から一段階ずつ決める

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `instruction-management` | `structured-refactor`（`agent-base-plugin`） |
| `repeating-diamond` | なし |
| `stepwise-system-design` | `repeating-diamond` |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install dev-workflow-plugin@agent-harness-marketplace
```

## Usage

`instruction-management`: ユーザーから入力・返答があるたび、その回の作業を始める前。

`repeating-diamond`: 案・方針・技術選定を検討するとき。

`stepwise-system-design`: 作るものの設計を決めるとき。
