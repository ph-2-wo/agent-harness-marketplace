---
name: skill-review
description: skillまたはskill作成Planを新規作成・更新したときに使う。Humanへ見せる前のreviewやreview依頼時を含む。
---

# Skill Review

skillが実利用時に再現可能で、構造的かつ必要十分な指示になっているかレビューする。

対象skillは編集しない。

問題の修正方針はreview結果へ含めてよい。

## Workflow

### 1. Descriptionをreviewする

Descriptionだけでskillを使うタイミングを判断できるか確認する。

「いつ使うか」は、本文を読む前に観測できる場面を指す。
エージェントが取りかかる作業、ユーザーの依頼の言葉、起きた出来事のどれかで書く。

- いつ使うかを示している
- 押し強く書いている。挙げた場面が例だと分かり（「〜など」）、名前や決まった語で頼まれていなくても使うと書いている
- 本文の中身を書いていない。workflow、実装方法、作業手順、出力詳細、「〜を扱う」のような扱う内容の列挙がこれに当たる
- 利用タイミングの判断をBodyへ委ねていない
- 100字以内を目安とする。超えていたら、中身を書いていないか読み直す

### 2. 再現性をreviewする

`harness-proceduralization` スキルを使って、再現性を上げた対象skillの案を作る。

### 3. 構造をreviewする

`structured-refactor` スキルを使って、2の案の構造を整理する。

### 4. minimizationを通す

`document-minimization-review` スキルを使って、3の案から余分を削る。

ここまでのreviewで指摘へ対応した本文は、記述が増えている。
通さずに返すと、余分を残したままHumanへ出すことになる。

### 5. review結果を返す

目的達成へ影響する指摘だけ返す。

指摘ごとに次を説明する。

- 対象箇所
- Description、再現性、構造、制約のどれに反するか
- Agent実行時に起きる問題
- 修正方針
- 根拠

Description、再現性、構造、制約の順で説明する。

見出し名や固定templateは要求しない。

指摘がなければその旨を返す。
