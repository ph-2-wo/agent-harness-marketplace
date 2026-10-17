# Next Action Plugin

承認の求め方の package。承認が要る事項を応答の末尾に番号付きで書く形と、それを前提にした承認の判定を担う。

## 入るもの・入らないもの

- 入る: 承認を求める事項の書き方（番号の振り方、返事の予想、今の段階で何をアクションにするか）
- 入る: 承認の書き方を前提にした部品（当初の要求に立ち返る skill、何を承認とみなすかの instruction）
- 入らない: 指示の管理や案の検討など、仕事の流れのほかの段階（`dev-workflow-plugin`）
- 入らない: 承認の書き方を毎回の手順として注入する hook（`skill-routine-plugin`）

agent は、承認が要ることを、承認を取らずに実行するか、どれが承認待ちなのかが読み手に分からない形で書く。
この package は、承認待ちの事項を番号付きで並べ、返事と対応づけられる形を与える。

別の package にした理由は、同じ `create-next-action` という名前で別の書き方の skill を既に使っている環境がありうるため。
同じ名前の skill が2つ入るとどちらか一方しか残らないので、`dev-workflow-plugin` だけを入れた環境に持ち込まないよう分けている。
`create-next-action` の書き方（応答の末尾に書く）を前提にする skill・instruction も、同じ理由でこの package に置く。

## Skills

- `create-next-action`: 承認を求める事項を、応答の末尾に番号付きの「ネクストアクション」として書く
- `realign-with-original-request`: 同じ件で続けて差し戻されたときに、当初の要求と現状のギャップから直近の要求を読み直し、本来やるべきだったことをネクストアクションにする

## Instructions

- `approval`: 承認の要否の判定、何を承認とみなすか、承認を求める事項は `create-next-action` に従うこと、承認後に予定が失敗したら止まって承認を求め直すこと

## Dependency

skill・instruction の間に依存がある。**依存先を一緒に install しないと機能しない。**

| 部品 | 依存先 |
|---|---|
| `create-next-action` | `instruction-management`（`dev-workflow-plugin`。番号を指示メモごとに振る） |
| `realign-with-original-request` | `create-next-action`（この package）、`instruction-management`（`dev-workflow-plugin`。要求の原文を指示メモから拾う） |
| `approval` | `create-next-action`（この package） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install next-action-plugin@agent-harness-marketplace
```

## Usage

承認を求める事項があるとき。
install すると、instruction は `.claude/rules/` に置かれる。
