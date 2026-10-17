# Review Plugin

成果物を人間に見せる前に通す review の skill package。

## 入るもの・入らないもの

- 入る: 成果物の種類ごとに「何を見るか」を決めた review
- 入らない: 取り組みの振り返り（`facilitation-plugin`）。review の結果を伝える書き方（`communication-plugin`）

agent は自分が書いたものを妥当だと判断する。そのまま人間に出すと、実装は周辺コードの書き方を無視したまま、
文書は余分な記述を抱えたまま、skill は実行時に何も決まらない記述を抱えたまま届く。
この package は、成果物の種類ごとに「何を見るか」を決めた review を与える。

## Skills

- [`imitation-review`](docs/skills/imitation-review.md): 既存実装の模倣観点レビュー
- [`documentation-review`](docs/skills/documentation-review.md): ドキュメントの責務と保守性のレビュー
- [`skill-review`](docs/skills/skill-review.md): skill と skill 作成 Plan のレビュー
- [`document-minimization-review`](docs/skills/document-minimization-review.md): 文書を最小化する削除起点のレビュー

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `skill-review` | `document-minimization-review`、`harness-proceduralization`（`harness-dev-plugin`）、`structured-refactor`（`agent-base-plugin`） |
| 上記以外 | なし（単体で機能する） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install review-plugin@agent-harness-marketplace
```

## Usage

Plan、実装、ドキュメント、skill を人間に見せる前。
