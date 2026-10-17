---
name: documentation-review
description: 開発変更のreviewでdocumentationの追加・更新が含まれる場合に使う。README、設計書、runbook、ADR、migration guide等の追加・更新や、文書の責務、情報配置、現在状態と変更経緯、保守性を確認するときに使う。
---

# Documentation Review

開発ドキュメントが、その文書の責務に合う情報を、適切な場所と時間軸で伝えているかレビューする。

不要な更新コストだけでなく、必要情報の削りすぎも問題として扱う。

## Workflow

### 1. 文書の契約を復元する

文書の責務を次の3要素で捉える。

`Document responsibility = Reader/action × Subject scope × Time perspective`

各対象文書について、次を証跡から復元する。

1. Reader/action
   - 誰が何を判断・実行するために読むか
   - 冒頭説明、見出し、導線、利用元、repository規約から確認する
2. Subject scope
   - 何について、どの粒度まで責任を持つか
   - 文書が扱う対象、階層、境界、下位文書への導線から確認する
3. Time perspective
   - stock: 現在の仕様、現在の使い方、現在有効な判断基準
   - flow: 変更、経緯、移行、進捗、判断時点の記録

文書、規約、sourceから確認できる事実と、事実から導いた責務を区別する。

文書名は責務を判断する証跡の1つであり、名前だけで責務を断定しない。

### 2. ownerと正本を確認する

文書の契約を根拠に、変更された記述ごとのownerと正本を確認する。

- 対象文書が正本を持つか
- 上位、下位、別文書が正本を持つか
- code、manifest、schemaなどmachine-readable sourceが正本を持つか
- 対象文書は必要な要約または導線だけを持つか
- 同じ情報を複数文書が正本として保持していないか

別sourceが正本でも、読者の判断に必要な要約まで機械的に削除しない。

### 3. 記述を判定する

必要性、owner、時間適合で各記述を判定する。

| 必要性 | owner | 時間適合 | 方針 |
|---|---|---|---|
| 必要 | 対象文書 | 適合 | 維持 |
| 必要 | 対象文書 | 不適合 | 現在状態化、経緯化、または適切な文書へ移動 |
| 必要 | 別source | 任意 | 重複正本を避け、必要な要約・導線だけ残す |
| 不要 | 任意 | 任意 | 削除または別文書への移動を提案 |

特に次を確認する。

- stock文書が、変更経緯、移行中、未検証、TODOを現在仕様として抱えていないか
- flow文書が、差分増補に不要な現行仕様を複製していないか
- ADRやchangelogのようにflowを保存する文書を、stockへ書き換えていないか
- 上位文書が下位層の詳細を網羅していないか
- 変動するが貴重な情報を、更新コストだけを理由に削除していないか
- 必要だが変動しやすい情報を、安定した抽象度または正本への導線で表現できないか

### 4. completenessとmaintenanceを検算する

記述単位の判定後、文書全体を検算する。

Completenessとmaintenance costは独立した責務ではなく、判断結果の両側を検査する基準とする。

Completeness:

- Reader/actionを達成できるか
- 削除・移動提案後も必要情報が残るか

Maintenance:

- 責務外の変更で更新が発生しないか
- 責務外情報、重複正本、過剰詳細、不要な時間依存表現がないか

片方だけを最適化しない。

### 5. review結果を返す

actionableな指摘だけを返す。

文書は編集しない。

## Examples

次は固定規則ではなく、Workflowの適用例とする。

| 文書 | Reader/action | Subject scope | Time perspective |
|---|---|---|---|
| README | 利用判断・利用開始 | 対象全体の入口 | stockが一般的 |
| Migration guide | version移行 | oldからnewへの差分 | flow |
| Runbook | 現在の運用実行 | 特定operation | stockが一般的 |
| ADR | 判断理由の参照 | 特定decision | flowを固定記録 |

文書内で異なる契約が明示されている場合は、その契約を優先する。

## Output

指摘ごとに、場所、文書の契約、根拠となる事実、判断、修正方針を示す。

指摘がなければその旨を返す。
