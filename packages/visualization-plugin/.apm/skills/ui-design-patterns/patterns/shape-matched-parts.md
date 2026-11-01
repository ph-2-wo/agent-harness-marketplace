# 中身の形に合わせた部品（shape-matched-parts）

## 場面

説明の中身に形があるとき（変更・比較・流れ・経緯・数量・理由の連鎖など）。

文章だけで書くと、図や差分なら一目で分かるものまで読ませることになる。
かといって部品を毎回全部出すと読めず、同じ部品が複数要る中身を1つに押し込むことになる。

## 作り方

- 形ごとの部品を、使える一覧として持つ
  - 変更: 差分。
    変わった語を強調する
  - 比較: 同じ目盛りの小さな図を並べる（small multiples）
  - 流れ・構造: 図
  - 経緯: 時系列
  - 数量: 長さで比べる
  - 理由の連鎖: 主張・根拠・反論を分けて並べる
- どの部品を、いくつ、どの順で出すかは、中身に合わせてその都度決める。
  同じ部品を何回使ってもよい
- 一覧に無い形が出てきたら、部品を一覧に足す

## 使わない場面

- 表データ・数値データを図にするとき。
  `data-viz-ideas` スキルを使う
- 中身に形が無く、文章で足りるとき

## 根拠

- Larkin & Simon 1987: 図が文章に勝つのは、探索と知覚的な推論が楽になるとき。
  作りの悪い図は負ける。
  二次。
  https://mechanism.ucsd.edu/bill/teaching/F12/cs200/Readings/larkin.whyadiagramissometimesworth.1987.pdf
- Difftastic: 行ではなく構文の単位で差分を出す。
  https://difftastic.wilfred.me.uk/introduction.html
- Kaleidoscope の画像比較: 並べる・分割・重ねる・差だけ、の見せ方を選べる。
  https://kaleidoscope.app/help/docs/image-comparison-views
- FT Visual Vocabulary: 見せたい関係ごとに図の種類を分ける。
  https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md
- Tufte の small multiples: 同じ形の小さな図を並べて比べる。
  二次。
  https://spectrum.ieee.org/tufteisms

## 事例

- 形ごとの部品を1件の説明で必ず全部出した見本は、読めないとして差し戻された。
  差分が複数ある中身を、1つの差分の部品に押し込んでいた
- 部品を使える一覧にし、組み合わせを中身ごとに決める形は通った

## 確かめた回数

- 使って通った: 1回
- 前例: 5件（2件は二次）
