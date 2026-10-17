# Git Plugin

commit・PR の切り方の skill package。

## 入るもの・入らないもの

- 入る: git で履歴をどう切るか（commit の分割・PR の分割）
- 入らない: 仕事の進め方そのもの（`dev-workflow-plugin`）、成果物の review（`review-plugin`）

agent は差分を溜めてから1 commit にまとめる。レビューする側は、何がどの意図で変わったのかを
差分から読み直すことになる。この package は、その分割に手順と判断基準を与える。

## Skills

- [`commit-planning`](docs/skills/commit-planning.md): 意味ある Commit 分割の計画と実行

## Dependency

なし（単体で機能する）。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install git-plugin@agent-harness-marketplace
```

## Usage

commit を切るとき。
