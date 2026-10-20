# Pull Request Communication Plugin

commit の切り方と PR の作成など、PR を通したやり取りの skill package。

## 入るもの・入らないもの

- 入る: レビューする側に変更をどう渡すか（commit の分割・PR の分割・PR 本文）
- 入らない: 仕事の進め方そのもの（`dev-workflow-plugin`）、成果物の review（`review-plugin`）

agent は差分を溜めてから1 commit にまとめ、PR 本文には何を変えたかを並べる。
レビューする側は、何がどの意図で変わったのか、なぜその方針なのかを差分から読み直すことになる。
この package は、commit の分割と PR 本文の書き方に手順と判断基準を与える。

## Skills

- [`commit-planning`](docs/skills/commit-planning.md): 意味ある Commit 分割の計画と実行
- [`create-pull-request-generally`](docs/skills/create-pull-request-generally.md): リポジトリ固有の手順が無いときの、一般的な PR の作成

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `commit-planning` | なし（単体で機能する） |
| `create-pull-request-generally` | `organized-explain`（`communication-plugin`） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install pull-request-communication-plugin@agent-harness-marketplace
```

## Usage

commit を切るとき。PR を作るとき。
