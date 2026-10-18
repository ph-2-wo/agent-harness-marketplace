# Next Action Plugin

承認の求め方の package。承認が要る事項・ユーザーに頼む作業・後回しを手元の CLI で記録し、未処理を1枚のページに出す形と、それを前提にした承認の判定を担う。

## 入るもの・入らないもの

- 入る: 承認を求める事項・依頼・後回しの記録の仕方（登録・承認・取り下げ・完了・後回し、返事の予想、今の段階で何をアクションにするか）と、それを記録する CLI
- 入る: 承認の記録の仕方を前提にした部品（当初の要求に立ち返る skill、何を承認とみなすかの instruction）
- 入らない: 指示の管理や案の検討など、仕事の流れのほかの段階（`dev-workflow-plugin`）
- 入らない: CLI のコマンドと未処理の番号をターンごとに差し込む hook（`next-action-hook-plugin`）
- 入らない: 承認の求め方を毎回の手順として注入する hook（`skill-routine-plugin`）

agent は、承認が要ることを、承認を取らずに実行するか、どれが承認待ちなのかが読み手に分からない形で書く。
この package は、承認待ちの事項に番号を振って記録し、返事と対応づけられる形を与える。
記録は手元のファイルに残るので、agent が応答に一覧を書き直さなくても、ユーザーはページで未処理を見られる。

別の package にした理由は、同じ `create-next-action` という名前で別の書き方の skill を既に使っている環境がありうるため。
同じ名前の skill が2つ入るとどちらか一方しか残らないので、`dev-workflow-plugin` だけを入れた環境に持ち込まないよう分けている。
`create-next-action` の記録の仕方を前提にする skill・instruction も、同じ理由でこの package に置く。

## 記録と表示

`create-next-action` の `scripts/na.mjs` が記録する CLI。
依存は無く、Node 組み込みの `node:sqlite` を使うので、Node v22.13.0 / v23.4.0 以上が要る。
サブコマンドと標準入力の JSON は `create-next-action` の SKILL.md にある。

記録と一覧のページは、環境変数 `NEXT_ACTION_HOME` のディレクトリに置く。
未設定なら `~/.local/share/next-action/` に置く。

- `next-action.sqlite`: 記録
- `index.html`: 全リポジトリ・全セッションの、未処理のネクストアクションと未完了の依頼。差分の本文も出す。記録を変えるたびに書き直し、ページは数秒ごとに自分で読み直す
- `hook.log`: `next-action-hook-plugin` の hook の記録。直近だけ残す

ページはブラウザで一度開いておけば、記録のたびに新しくなる。常駐するサーバーは無い。

番号はセッションごとに振る。
CLI に `--session <id>` が付けばそのセッション、付かなければ今のディレクトリのリポジトリ（git の origin の owner/repo、取れなければディレクトリ名）を1つのセッションとして扱う。
`next-action-hook-plugin` を入れると、agent の会話の ID を `--session` に入れたコマンドが文脈に差し込まれる。

## Skills

- `create-next-action`: 承認を求める事項・ユーザーへの依頼・後回しを CLI で記録する
- `realign-with-original-request`: 同じ件で続けて差し戻されたときに、当初の要求と現状のギャップから直近の要求を読み直し、本来やるべきだったことをネクストアクションにする

## Instructions

- `approval`: 承認の要否の判定、何を承認とみなすか、承認を求める事項は `create-next-action` に従うこと、承認後に予定が失敗したら止まって承認を求め直すこと

## Dependency

skill・instruction の間に依存がある。**依存先を一緒に install しないと機能しない。**

| 部品 | 依存先 |
|---|---|
| `realign-with-original-request` | `create-next-action`（この package）、`instruction-management`（`dev-workflow-plugin`。要求の原文を指示メモから拾う） |
| `approval` | `create-next-action`（この package） |

依存先の package は `apm.yml` に書いてあり、この package を install すると一緒に入る。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install next-action-plugin@agent-harness-marketplace
```

## Usage

承認を求める事項、ユーザーに作業を頼む事項、後回しにする事項があるとき。
install すると、Claude Code では skill は `.claude/skills/`、instruction は `.claude/rules/` に置かれる。
Codex では skill は `.agents/skills/` に置かれ、instruction は `apm compile` で `AGENTS.md` に入る。
