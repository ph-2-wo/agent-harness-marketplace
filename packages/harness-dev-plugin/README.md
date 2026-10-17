# Harness Dev Plugin

ハーネス（CLAUDE.md・skill・hook）そのものを開発・整備する skill package。

## 入るもの・入らないもの

- 入る: ハーネスに何を書くか、どこに置くか、どう直すかの手順
- 入らない: APM の機構に固有の操作手順（`apm-dev-plugin`）、書いたものの review（`review-plugin`）

失敗が起きたとき、agent はその場の判断ミスとして片付けて次に進む。同じ失敗は次のセッションでも起きる。
書き足す側にも問題があり、agent が書く手順は「そう書いてあるけど具体的にどうすればいいのか」が
埋まっておらず、読んでも実行できない。この package は、原因をハーネス側で特定して直す手順と、
書いた手順を実行できる具体度まで落とす手順を与える。

## Skills

- `maintain-harness`: 失敗の原因をハーネス側で特定し、改善方針を決めて承認まで持っていく
- `harness-placement`: ルール・手順・仕組みをどこに書くか決める
- `harness-proceduralization`: ハーネス記述を再現性が十分な手順に落とし込む
- `cross-case-procedure-draft`: 何回か試した事例を横断して評価し、手順のラフを作る
- `procedure-draft-buildout`: 手順のラフに事例や調査を肉付けし、大枠から順に具体的な手順にする

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `maintain-harness` | `harness-placement`, `harness-proceduralization`, `document-minimization-review`, `custom-review`（`review-plugin`）, `zero`（`communication-plugin`） |
| `cross-case-procedure-draft` | `organized-explain`（`communication-plugin`）, `procedure-draft-buildout` |
| `procedure-draft-buildout` | `custom-review`（`review-plugin`）, `repeating-diamond`（`dev-workflow-plugin`） |
| 上記以外 | なし（単体で機能する） |

**この package の `apm.yml` は依存先を持たない。** `review-plugin` がこの package に依存しているので、
ここから `review-plugin`・`communication-plugin`・`dev-workflow-plugin` を引くと依存が循環し、APM は install を止める。
上の表の依存先の package は、別に install する。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install harness-dev-plugin@agent-harness-marketplace
apm install review-plugin@agent-harness-marketplace
apm install communication-plugin@agent-harness-marketplace
apm install dev-workflow-plugin@agent-harness-marketplace
```

## Usage

失敗の原因をハーネスに求めるとき、新しいルールや skill を作るとき、手順書が肥大化したとき。
`harness-proceduralization` と `harness-placement` は、`review-plugin` の skill からも呼ばれる。
