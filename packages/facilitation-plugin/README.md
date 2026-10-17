# Facilitation Plugin

人と進める会の進め方の skill package。

## 入るもの・入らないもの

- 入る: 振り返り会など、会の進め方を段階で定めた手順
- 入らない: 仕事の流れの一段階（`dev-workflow-plugin`）、伝え方（`communication-plugin`）、成果物の review（`review-plugin`）

agent は振り返りを求められると、目的を確かめずに反省点を並べる。
得た知見と当初の目的とのギャップが整理されないまま、ネクストアクションだけが出てくる。
この package は、会を段階に分けて進める手順を与える。

## Skills

- `retrospective`: 振り返り会を、当初の目的・知見・ギャップ・ネクストアクションの順で進める

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `retrospective` | `structured-refactor`（`agent-base-plugin`）, `repeating-diamond`（`dev-workflow-plugin`）, `organized-explain`（`communication-plugin`） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install facilitation-plugin@agent-harness-marketplace
```

## Usage

「振り返りしよう」「振り返り会」と言われたとき。
