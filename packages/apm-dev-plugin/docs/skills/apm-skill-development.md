# apm-skill-development

APM project で skill を作成・更新する際の、APM 固有の手順を扱う。

SKILL.md の一般的な書き方は扱わない（それは `skill-review` の担当）。

## 解決する課題

APM では、skill の正本は `.apm/skills/` にあり、`.claude/skills/` などは `apm install` が作る展開結果である。
これを知らないと展開先を直接編集し、次の install で消える。

同様に、APM の学習済み知識には食い違いやすい点が多い。

- `apm compile` が扱うのは instruction だけで、skills は対象外（`apm install` が直接展開する）
- `apm pack` は通常の skill 開発では不要
- `apm install --dev` は dev dependency を**追加**するときのオプションで、展開のために毎回付けるものではない
- `includes` は allow-list であり、exclude 形式はない

知らないまま手探りすると、効かないオプションを足して消す、といった試行錯誤に時間を使う。

## 概要

`.apm/skills/` 内の skill 作成と更新だけを対象とし、次の順で進める。

1. 使用中の CLI version と公式資料で現在の仕様を確認する（学習済み知識で断定しない）
2. consumer へ配る skill か maintainer 専用かで公開範囲を決める
3. 正本（`.apm/skills/<name>/`）を編集する。展開先は編集しない
4. repository root で引数なしの `apm install` を実行する
5. 正本と各展開先が一致するか確認する
6. `apm.lock.yaml` の差分を確認する（手編集しない）
7. gitignore された展開結果を commit に含めずに commit する

instructions / prompts / agents / hooks / MCP / marketplace / bundle 配布は対象外。
必要な場合は skill 開発の知識から推測せず、公式資料を調査する。

## 利用場面

APM project の `.apm/skills/` を作成・更新するとき。

## 依存

skill 間の依存はなし。実行には APM CLI が必要。
