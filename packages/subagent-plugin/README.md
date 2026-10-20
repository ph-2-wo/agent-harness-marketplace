# Subagent Plugin

Claude Code の組み込みのサブエージェントを、同じ名前の agent 定義で上書きする package。

## 入るもの・入らないもの

- 入る: 組み込みのサブエージェントと同じ名前の agent 定義
- 入らない: どのサブエージェントにどの model を渡すかのルール（instruction は入れた側で書く）

agent 定義は入れた環境のすべての委任に効くので、skill の package から分けている。

## Agents

- `Explore`: 組み込みの `Explore` と同じ定義で、`model` だけを `haiku` にしたもの

同じ名前の定義は組み込みの本文ごと置き換えるので、本文もこの package に書いてある。

## Dependency

この package は依存を持たない。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install subagent-plugin@agent-harness-marketplace
```

## Usage

install すると、agent 定義は `.claude/agents/` に置かれ、`Explore` への委任がこの定義で動く。
