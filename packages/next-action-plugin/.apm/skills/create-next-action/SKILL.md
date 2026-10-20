---
name: create-next-action
description: 承認を求める事項や、ユーザーに作業を頼む事項、後回しにする事項があるときに使う。
---

# ネクストアクション

承認が要るものは、次の4つの行動で扱う
行動は `na.mjs` のサブコマンドで、payload は標準入力で渡す
番号は register が返す（A3 など）。自分で振らない

文脈に「ネクストアクションの CLI: node "…" --session …」が差し込まれていれば、そのコマンドを使う
無ければ、この SKILL.md と同じディレクトリにある `scripts/na.mjs` を node で呼ぶ
以下の例では、そのコマンドを `na` と書く

記録は手元のファイルに残り、未処理の一覧のページが記録のたびに書き直される
ページの場所は、ユーザーに聞かれたときだけ `$NEXT_ACTION_HOME/index.html`（未設定なら `~/.local/share/next-action/index.html`）と答える

### register — 1件登録する

payload は JSON

```bash
na register <<'EOF'
{
  "title": "何をするか\n読みやすさのために改行もできる",
  "ok_forecast": "high | mid | low",
  "need_forecast": "high | mid | low",
  "risk_note": "ok にならないと思う点（ok_forecast が mid・low なら必須）",
  "on_ok": "ok なら使うスキルか手順",
  "on_ng": "ng なら使うスキルか手順",
  "replaces": { "seq": 3, "reason": "rejected | sent_back | unneeded", "note": "取り下げの補足（任意）" },
  "resumes": 2,
  "diffs": [
    { "file": "POST /items", "diff": " request body:\n {\n   name: string\n+  tags: string[]\n }" },
    { "file": "src/items.ts", "diff": " function saveItem(item) {\n-  db.insert(item.name)\n+  db.insert(item.name, item.tags)\n }" }
  ]
}
EOF
```

- `replaces` は出し直すときだけ付ける。元の番号の取り下げと、新しい登録が一緒に記録される。元が未処理でなければ失敗する
- `resumes` は後回し（D）を戻すときだけ付ける。番号は後回しの番号（D2 なら 2）。登録と一緒に、その後回しが戻したものとして記録される
- `risk_note` に書いた懸念で案が成り立たなくなるなら、登録せずに案を直す
- `diffs` は承認の判断に要る変更を、変わるものの今の全体に、変わる行の `+` `-` を付けて載せる。基本はファイルかインターフェースごとに1つにまとめる
  - ファイルもインターフェースも変えない案（調査・相談）だけは省く
  - 変更先のファイルをまだ見ていないなら、見てから載せる
  - 行頭の1文字は、変わらない行が空白、足す行が `+`、消す行が `-`。`@@` の行と `---` `+++` の見出しは書かない
  - 書き換える行は、消す行のすぐ下に書き換え後の行を置き、1行ずつ交互に並べる

    悪い例（消す行と足す行がまとまって離れる）
    ```
    -  validate(item.name)
    -  normalize(item.name)
    ...
    -  db.insert(item.name)
    +  validate(item.name, item.tags)
    +  normalize(item.name, item.tags)
    ...
    +  db.insert(item.name, item.tags)
    ```

    良い例
    ```
    -  validate(item.name)
    +  validate(item.name, item.tags)
    -  normalize(item.name)
    +  normalize(item.name, item.tags)
    ...
    -  db.insert(item.name)
    +  db.insert(item.name, item.tags)
    ```
  - コード: 変わる関数の今の全体
  - インターフェース（API など）: 変わるなら、変更に関係するインターフェースの今の全体。`file` にはインターフェースの名前を書く
- 行数か個数の上限を超えると断られる。要所に絞り、絞れないならアクションの範囲が大きすぎないかを考える
- 例や、案の中の小さな選択肢は登録しない

### list — 未処理を見る

payload なし

```bash
na list
```

### approve — 承認を記録する

全部の承認は payload なし

```bash
na approve A3
```

一部だけの承認は `--partial` を付け、payload に承認された範囲と外された範囲を文章で書く

```bash
na approve A3 --partial <<'EOF'
差分の書き込みは承認、push は外された
EOF
```

### withdraw — 取り下げを記録する

理由を3つから選んで引数に書く

- `rejected`: ng と返された
- `sent_back`: 差し戻された（疑問・指摘・反論が返った）
- `unneeded`: 自分で不要と判断した

payload は補足の文章で、任意

```bash
na withdraw A3 sent_back <<'EOF'
payload の書き方が分からないと指摘された
EOF
```

## 予想

各アクションに、次の2つの予想を付ける

- `ok_forecast`: ユーザーが ok と返す見込み
- `need_forecast`: ユーザーに聞く必要がある見込み
  - 聞くまでもなく ok、または聞くまでもなく ng と言えるなら低。そのとき `ok_forecast` は高か低になる
  - `ok_forecast` が中なら、答えが決まっていないので、要を低にしない

今の段階で承認できるものをアクションとする

- 今出せるアクションは1回の応答でまとめて登録する。1つずつ小出しにしない
- 承認されたアクションが複数あるときは、1つずつサブエージェントに出して並行で進める
- 実行内容が検討済みならそれを、でなければその検討をアクションとする
- 検討をすぐできるなら検討してから出す
- 前に出したアクションは、出し直す前に「今それをやって、判断が変わるか」を確かめる
  - 変わらないなら、`withdraw <番号> unneeded` で取り下げる

## 依頼 — ユーザーに作業を頼む

誰が作業するかで分ける
エージェントが作業してユーザーは可否だけを返すものはアクション、それ以外でユーザーにしてもらうこと（答える、決める、レビューする、画面の操作、値を取ってくる、環境変数を入れる）は依頼
ユーザーにしてもらうことを、応答の本文だけで頼まない
アクションも依頼も出さずに、ユーザーが動くのを待たない。自分の作業が尽きたら、次に進めることを決めて、アクションか依頼として出す
1つの件に両方が入るなら、ユーザーの作業を依頼として、その後にエージェントがやることをアクションとして分けて出す
頼む前に、自分でできないかを確かめる（環境変数やトークンが手元に無いか、API や CLI で代わりにできないか）

番号は register-request が返す（R1 など）。自分で振らない

### register-request — 1件登録する

payload は JSON

```bash
na register-request <<'EOF'
{
  "title": "何をしてほしいか",
  "steps": "どこで・どう作業するか（任意）\n取ってくる値があれば、その取得元もここに書く",
  "hand_back": "返してほしいもの（任意）。秘密の値なら会話に貼らせず、入れる場所を書く",
  "replaces": { "seq": 1, "reason": "rejected | sent_back | unneeded", "note": "取り下げの補足（任意）" }
}
EOF
```

- `steps`・`hand_back` は無ければ省く。空の文字列は断られる
- `steps` は、画面で分かれ道になる所（まだ無いものを作るか既存を選ぶか、押してはいけないボタン）まで書く。自分で見ていない画面はそう書く
- 答え・判断・レビューを頼むときは、`steps` に見る場所と観点を書き、観点ごとに自分の意見と、答えで何が変わるかを書く
- 画面で作業してもらうときは、その画面を開く URL を `steps` に書く
- `replaces` は出し直すときだけ付ける。番号は依頼の番号（R1 なら 1）

### complete — 完了を記録する

ユーザーが「やった」と言ったら記録する
返してほしいものが揃っていなければ、記録せずに足りないものを伝える
payload は何を受け取りどこに反映したかの文章で、任意。受け取った値そのものは書かない

```bash
na complete R1 <<'EOF'
API のトークンを受け取り .env に反映した
EOF
```

### withdraw — 取り下げを記録する

アクションと同じ。番号に R を付ける

```bash
na withdraw R1 unneeded <<'EOF'
API トークンで自分でできると分かった
EOF
```

## 後回し — 今やらないものを置く

今やらないが後でやるものは、後回しとして記録する
承認は求めず、自分の判断で送ってよい
次のどれかに当たったら後回しにする

- ユーザーに「今じゃない」「後で」と返された
- 出そうとした案が、まだ済んでいない作業に依存している
- 今の依頼の外だが、やる価値がある
- 差し戻された。手順書で直すかを決めるのを後回しにする

番号は defer と register-deferral が返す（D1 など）。自分で振らない
後回しはページに出ない。hook が動く環境では、ターンの始めと終わりに件数だけが渡される

### defer — 出したアクションを後回しに移す

payload は、いつ戻すかの条件の文章

```bash
na defer A3 <<'EOF'
A2 の migration を当て終えたら
EOF
```

### register-deferral — 案になる前のものを後回しにする

payload は JSON

```bash
na register-deferral <<'EOF'
{
  "title": "何を後でやるか",
  "revisit_when": "いつ戻すかの条件"
}
EOF
```

### 戻す・取り下げる

後回しにしたものに取り掛かれるタイミングになったら、`list` で中身を見る
取り掛かるものは、アクションとして `register` に `resumes` を付けて出す
要らなくなったものは取り下げる。理由はアクションと同じ3つ

```bash
na withdraw D1 unneeded <<'EOF'
A4 の方針に含めたので要らなくなった
EOF
```

後回しはそのセッションの中で片付ける
