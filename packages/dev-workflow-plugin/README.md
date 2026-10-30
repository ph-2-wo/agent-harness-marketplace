# Dev Workflow Plugin

仕事の進め方の skill package。開発の段階の判定から実装・レビュー依頼までの流れと、指示の管理、案の検討、設計の決め方を担う。

## 入るもの・入らないもの

- 入る: 仕事の流れの一段階（段階の判定・指示を受ける・案を検討する・設計を決める・実装・self review・レビュー依頼）を担う skill
- 入らない: 仕事の流れの一段階ではない skill。commit の切り方と PR の作成（`pull-request-communication-plugin`）、成果物の review（`review-plugin`）、振り返り会（`facilitation-plugin`）、承認の求め方（`next-action-plugin`）

セッションを開いた agent は、自分が開発のどの段階にいるかを判断しないまま作業を始める。
調査で足りる場面で実装を始めたり、要件が決まっていないのに Plan を書いたりする。
実装に入ってからも、詰まったときに何度も同じ修正を繰り返してユーザーに報告しない。
受けた指示は会話の中にだけ持ち、話が進むうちに原文と自分の解釈を混ぜる。
案を求められると、広げきる前に1つに絞るか、広げたまま判断を投げる。
この package は、その各場面に手順を与える。

## Skills

- `workflow-placement`: セッションの最初に使い、開発がどの段階にあるかを判定して次の skill へ渡す
- `flexible-dev`: Plan から実装、self review、レビュー依頼までを進める
- `instruction-management`: 指示の解釈・変更・解決状態を、根拠にした発言の時刻と一緒にファイルで管理する
- `catch-up-on-history`: 直近の記録から前提の議論まで遡り、当初の依頼の原文まで読む
- `hand-off-to-new-session`: 新しいセッションへの引き継ぎを、キャッチアップを頼む2〜3行に限る
- `repeating-diamond`: 広げると収束を分けて繰り返し、案を絞り込む
- `stepwise-system-design`: 作るものの設計を、抽象・土台から一段階ずつ決める

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `workflow-placement` | `instruction-management`, `flexible-dev`, `zero`（`communication-plugin`） |
| `flexible-dev` | `repeating-diamond`, `imitation-review`・`custom-review`（`review-plugin`）, `zero`（`communication-plugin`）, `structured-refactor`（`agent-base-plugin`） |
| `instruction-management` | `structured-refactor`（`agent-base-plugin`） |
| `catch-up-on-history` | なし |
| `hand-off-to-new-session` | なし |
| `repeating-diamond` | なし |
| `stepwise-system-design` | `repeating-diamond` |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install dev-workflow-plugin@agent-harness-marketplace
```

## Usage

`workflow-placement`: セッションの最初。ここから `flexible-dev` などへ進む。

`instruction-management`: ユーザーから入力・返答があるたび、その回の作業を始める前。

`catch-up-on-history`: 「経緯をキャッチアップして」と言われたとき。

`hand-off-to-new-session`: 仕事を新しいセッションに引き継ぐとき。

`repeating-diamond`: 案・方針・技術選定を検討するとき。

`stepwise-system-design`: 作るものの設計を決めるとき。
