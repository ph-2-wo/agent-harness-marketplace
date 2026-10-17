# Agent Base Plugin

**一切の依存を持たない** skill だけを置く package。base の名はここから来ている。

## 入るもの・入らないもの

- 入る: 他の skill・package・外部ツールのどれにも依存せず、単体で完結する skill
- 入らない: 依存を1つでも持つ skill。用途が汎用でも、依存があれば用途別の package に置く

依存を持たない skill は、他のどの skill からも安全に呼べる。
情報を整理する、という作業は多くの skill の中に現れる。各 skill がそれぞれの言い方で
「整理する」と書くと、agent は整理のたびに情報を足したり要約したりして、元の情報を壊す。
この package は、その土台になる手順を1本に切り出して置く。

## Skills

- `structured-refactor`: 情報を1行ずつ分析し、増やさずに構造へ組み替える
- `leap-by-imitation`: 貯めた種・検索・自分の知識から実例を集め、今の課題に結びつけて、前提から作り直す案を出す

## Dependency

なし。この package の skill は定義上、依存を持たない。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install agent-base-plugin@agent-harness-marketplace
```

## Usage

`structured-refactor`: 情報を構造的に整理するとき。`instruction-management`、`organized-explain`、
`retrospective`、`skill-review` から呼ばれる。

`leap-by-imitation`: 改善では届かない案（飛躍）を出すとき。飛躍の種になる事例に触れたとき。
