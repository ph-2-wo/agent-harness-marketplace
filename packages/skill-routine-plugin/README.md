# Skill Routine Plugin

skill を使う毎回の手順を、hook で文脈に入れる package。

## 入るもの・入らないもの

- 入る: 毎回の入力・セッションの開始・サブエージェントの開始で手順を注入する hook
- 入らない: 読み込んだ skill をタスクにする hook と、決まった道具の呼び出しの前に skill の読み込みを求める hook（`skill-task`・`skill-gate`。`skill-gate-plugin` から入る）
- 入らない: 手順が名指しする skill そのもの（`dev-workflow-plugin`・`next-action-plugin`）

hook はこの package を入れた環境のすべてのターンに効く。
skill や承認の書き方だけを使いたい環境に持ち込まないよう、hook だけをこの package に分けている。

## Hooks

- `skill-reading`（`SessionStart`・`UserPromptSubmit`・`SubagentStart`）: skill を使う手順を文脈に注入する。
  毎回の入力では、指示メモの更新、承認された番号だけの実行、使う skill の選定と使用、承認が要る事項を `create-next-action` に従って登録すること、の順を指示する。
  セッションの開始時は指示メモの更新と `workflow-placement` による現在地の判定、サブエージェントの開始時は skill の選定と使用を指示する

すべての hook は、失敗してもセッションは止めない。

## Dependency

| 部品 | 依存先 |
|---|---|
| `skill-reading` | `instruction-management`・`workflow-placement`・`flexible-dev`（`dev-workflow-plugin`）、`create-next-action`（`next-action-plugin`） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install skill-routine-plugin@agent-harness-marketplace
```

## Usage

install すると、hook は `.claude/settings.json` に登録されて毎回動く。
