# Skill Gate Plugin

読み込んだ skill をタスクにし、決まった道具の前に skill を読み込ませる hook の package。

## 入るもの・入らないもの

- 入る: 読み込んだ skill をタスクにする hook と、決まった道具の呼び出しの前に skill の読み込みを求める hook
- 入らない: hook が名指しする skill そのもの

他の package に依存しない。
`next-action-plugin` にも依存しない。
hook が求める skill が入っていない環境では、その規則では何もしない。
そのため、単独で入れられる。
自前の承認の仕組みを持つ環境にも入れられる。

## Hooks

- `skill-task`（`PreToolUse`、`Skill`）: skill を読み込むたびに`<skill 名> を使う`タスクを1件登録する。
  `instruction-management`・`create-next-action`・`workflow-placement` と、サブエージェントからの呼び出しは除く。
  hook からタスクを作る公式の方法は無いので、タスクのファイル（`~/.claude/tasks/` の下）を直接書く。
  ファイルの形は実測によるもので、Claude Code の版が変わると効かなくなりうる

- `skill-gate`（`PreToolUse`、`Bash`・`Read`・`Edit`・`Write`・`mcp__github__create_pull_request`）: 決まった道具の呼び出しの前に、その手順を持つ skill をこのセッションで読み込んだかをトランスクリプトで見て、読み込んでいなければその呼び出しを止める。
  `mcp__github__create_pull_request` と `gh pr create` の前に `create-pull-request-generally` を、`na.mjs` の `register`・`register-request`・`register-deferral`・`defer` の前に `create-next-action` を求める。
  公開リポジトリ `agent-harness-marketplace` への PR と `push` の前に `agent-harness-marketplace-change` を求める。
  `.apm/skills/<名前>/SKILL.md` の編集と書き込みの前に `skill-review` を求める。
  `.claude/skills/<名前>/SKILL.md` を `Read` や `cat`・`head`・`tail`・`sed`・`less` で直接読む前に、その `<名前>` の skill を求める。
  Skill で読み込まずに中身だけ使う抜け道を塞ぐためで、正本の `.apm/skills/` を読むのは止めない。
  1回の呼び出しで複数の規則に当たったときは、読み込んでいない skill をまとめて返す。
  description に場面を書いても skill が使われないことがあるので、Stop で応答を差し戻さず、1回の道具の呼び出しだけを止める。
  Skill で読み込めば次の呼び出しは通る。
  その skill が入っていない環境と、サブエージェントからの呼び出しは止めない。

すべての hook は、失敗してもセッションは止めない。
どちらも `python3` が要る。

## Dependency

| 部品 | 参照する skill |
|---|---|
| `skill-gate` | `create-pull-request-generally`（`pull-request-communication-plugin`）、`create-next-action`（`next-action-plugin`）、`skill-review`（`review-plugin`）。`agent-harness-marketplace-change` はこのリポジトリに無い |

これらは参照するだけで、依存としては引かない。
入っていない skill の規則では止めない。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install skill-gate-plugin@agent-harness-marketplace
```

## Usage

install すると、hook は `.claude/settings.json` に登録されて毎回動く。
