# Information Trust Plugin

目にした情報をどの程度信頼するかの instruction の package。

## 入るもの・入らないもの

- 入る: 情報の種類ごとに、信頼を置くか、照らしてから使うかを分ける instruction
- 入らない: 承認の判定の instruction（`next-action-plugin`）、毎回の手順として注入する hook（`skill-routine-plugin`）

agent は、目にした情報をフラットに受け取る。
間違った情報を優先したり、最優先の情報を蔑ろにしたりする。
この package は、情報の種類ごとに信頼の置き方を与える。

## Instructions

- `information-trust`: 情報を区分に分け、信頼を置かない区分の情報は、信頼を置く区分の情報に照らしてから使わせる

## Dependency

この package は依存を持たない。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install information-trust-plugin@agent-harness-marketplace
```

## Usage

install すると、instruction は `.claude/rules/` に置かれ、毎回読まれる。
