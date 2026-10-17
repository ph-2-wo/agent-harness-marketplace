# シェルスクリプト・hookの観点

## スクリプト

### 標準入力を取り合う

when

- heredoc でソースを渡してプログラムを動かしている
  - `python3 - <<'EOF'`
  - `node - <<EOF`
  - など
- など

then

- そのソースが stdin を読むなら、ソースの渡し方を変えさせる
  - `python3 -c` で、ソースを引数として渡す
  - ソースを別のファイルにして、`python3 script.py` で動かす

事例

- Stop hook の `python3 - <<'PY'` の中で `json.load(sys.stdin)` を呼び、hook の入力が読めていなかった

## hook

### Stop hook の差し戻しが誤る・止まらない

when

- Stop hook を足す・変える
  - 定義
  - 判定
  - 差し戻しの文
  - など
- など

then

- 判定が誤らないか、差し戻しが止まらなくならないかを確かめる。例:
  - 文字列で書ける判定を `type: prompt` / `agent` にしている
  - 例外を否定形で書いている
  - `stop_hook_active` を見ていない
  - など

事例

- agent 型の Stop hook が、例外条件の一文を逆向きに読んで差し戻しを繰り返した。語の有無で決める command 型に置き換えた
- 「ネクストアクションはありません」と書けば通る抜け道があった
