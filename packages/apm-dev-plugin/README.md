# APM Dev Plugin

APM の機構に固有の、skill 開発手順の package。

## 入るもの・入らないもの

- 入る: APM でしか要らない手順（正本と展開先の区別、lock の確認）
- 入らない: ハーネスに何をどう書くかの判断（`harness-dev-plugin`）、書いた skill の review（`review-plugin`）

APM には「正本は `.apm/skills/`、`.claude/skills/` は展開結果」「skills は compile 対象外」など、
一般的な skill 作成の知識では分からない固有事情がある。それを知らないまま作業すると、
展開先を直接編集して次の install で消える、lock の差分を確認せず commit する、といった事故が起きる。
この package はその手順を扱う。

## Skills

- [`apm-skill-development`](docs/skills/apm-skill-development.md): APM 固有の skill 開発、展開、lock 確認の workflow

## Dependency

skill 間の依存はない。単体で機能する。

実行には APM CLI が必要。

https://microsoft.github.io/apm/getting-started/installation/

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install apm-dev-plugin@agent-harness-marketplace
```

## Usage

APM project の `.apm/skills/` を作成・更新する時に使用する。
