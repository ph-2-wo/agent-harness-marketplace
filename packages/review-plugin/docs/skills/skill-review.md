# skill-review

skill が実利用時に再現可能で、構造的かつ必要十分な指示になっているかレビューする。

## 解決する課題

skill は読み物ではなく、agent が実行時に従う manual である。
「注意する」「適切に考える」のような記述は、読むと妥当に見えるが、実行時には何も決まらない。
また、会話で出た feedback をそのまま箇条書きにすると、責務が重複した flat list になり、
後段で判断が変わっても戻り先がない構造になる。

逆に、実際に失敗していないのに禁止事項や固定 format を先回りで足すと、skill が肥大して守られなくなる。

## 概要

- **Description**: それだけで使うタイミングを判断できるか。手順や出力詳細を書いていないか
- **再現性**: `harness-proceduralization` をかける
- **構造**: `structured-refactor` をかける
- **分量**: `document-minimization-review` をかける

対象 skill は編集せず、目的達成に影響する指摘だけを返す。

## 利用場面

skill の新規作成・更新後、および skill 作成 Plan の人間承認前。

## 依存

`harness-proceduralization`、`structured-refactor`、`document-minimization-review`。
