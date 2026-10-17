# Next Action Plugin

承認の求め方の skill package。承認が要る事項を、応答の末尾に番号付きで書く形を担う。

## 入るもの・入らないもの

- 入る: 承認を求める事項の書き方（番号の振り方、返事の予想、今の段階で何をアクションにするか）
- 入らない: 指示の管理や案の検討など、仕事の流れのほかの段階（`dev-workflow-plugin`）

agent は、承認が要ることを、承認を取らずに実行するか、どれが承認待ちなのかが読み手に分からない形で書く。
この package は、承認待ちの事項を番号付きで並べ、返事と対応づけられる形を与える。

別の package にした理由は、同じ `create-next-action` という名前で別の書き方の skill を既に使っている環境がありうるため。
同じ名前の skill が2つ入るとどちらか一方しか残らないので、`dev-workflow-plugin` だけを入れた環境に持ち込まないよう分けている。

## Skills

- `create-next-action`: 承認を求める事項を、応答の末尾に番号付きの「ネクストアクション」として書く

## Dependency

skill 間に依存がある。**依存先を一緒に install しないと機能しない。**

| skill | 依存先 |
|---|---|
| `create-next-action` | `instruction-management`（`dev-workflow-plugin`。番号を指示メモごとに振る） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install next-action-plugin@agent-harness-marketplace
```

## Usage

承認を求める事項があるとき。
