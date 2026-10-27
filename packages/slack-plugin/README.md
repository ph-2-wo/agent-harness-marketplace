# Slack Plugin

Slack を扱う skill package。

## 入るもの・入らないもの

- 入る: Slack MCP を使って Slack から情報を集める手順
- 入らない: 説明・報告の書き方（`communication-plugin`）

## Skills

- `slack-mentions-catchup`: 自分宛ての DM・メンション・スレッド返信を、既読を付けずに時刻で区切って集める

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install slack-plugin@agent-harness-marketplace
```

## Usage

Slack MCP（公式の Slack コネクタ）がつながっている環境で、「Slack キャッチアップして」と頼む。
