# 設定ファイルの観点

## デプロイ設定

### 画面と設定ファイルで設定がずれる

when

- デプロイの設定ファイル（`wrangler.jsonc` など）を変えている
- `keep_vars = true` を足している
- README に「画面で値を入れる」手順がある
- など

then

- 画面で変えた設定がデプロイで上書きされないかを確かめ、正本を設定ファイルにさせる（Infrastructure as Code の考え方）

事例

- 画面で設定した公開 URL・ログ・変数が、デプロイのたびに元に戻った。同じ性質の修正が4 commit に分かれた
- 検証に使う値を画面で手入力していた。設定ファイルに移した

## 外部サービスの権限

### 権限の範囲が足りない

when

- scopes・イベントの購読（`manifest.json` など）を足している
- など

then

- 呼ぶ API に要るスコープと、イベントが届く条件を、公式ドキュメントで確かめたかを問う

事例

- スコープ（`channels:join` と `channels:read`）を2回に分けて足した

## 依存の管理

### lockfile・生成物を管理から外す

when

- `.gitignore` に lockfile（`apm.lock.yaml`、`package-lock.json`）や生成物を足している
- など

then

- lockfile が無いときのツールの挙動を確かめたかを問う

事例

- lockfile を git から外したら、APM の展開物が更新されなくなった
