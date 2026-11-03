# 縦に並んだ項目へは、端の短い線を触って一覧から飛ぶ（edge-index-rail）

## 場面

縦に1つずつ送る画面で、項目が増えたときに、離れた項目へ移るとき。

1つずつしか送れないと、遠くの項目へ行くのに何回も送ることになる。
位置を示す印が表示だけだと、どこにいるかは分かっても、そこへは行けない。

## 作り方

- 画面の端に、項目ごとの短い横線を縦に並べる
- 今いる項目の線だけを、少し長く濃くする。
  進捗ではないので、今いる所まで塗らない
- 指を置いている間だけ、線が内側へ伸びて、項目の番号とタイトルの一覧になる。
  後ろの中身は薄くする
- 指を置いたまま上下になぞると、指の下の項目に色が付いて替わる
- 離すと、その項目へ送る。
  一覧の外で離したとき、今いる項目の上で離したときは送らない
- 線は、横に送るカードの隣のカードが覗かない側の端に置く。
  覗く側に置くと、被りを避けるために押せる幅が小さくなる
- 項目が多いときは、一覧が画面に収まるまで1行の高さを詰める

## 使わない場面

- 縦に移るのが主な操作になる画面。
  端の線は押せる幅が小さいので、離れた項目へたまに飛ぶときにだけ使う
- 横の送り。
  横は、送る段に置いた棒を押す・なぞる（thumb-bottom-bar の事例）

## 根拠

- 縦に並んだ短い線が、hover で項目の文面を出し、押すとそこへ飛ぶ会話の rail（二次。利用者の投稿で読んだ）。
  "horizontal bars corresponding to each question/prompt"
  （訳: 質問ごとに対応する横線）
  https://community.openai.com/t/right-side-conversation-navigator-missing/1392207
- 画面の端に hover すると、飛びたいセクションが見つかる目次。
  "you can now hover over the right side of the screen and find the section you want to jump to"
  （訳: 画面の右側に hover すると、飛びたいセクションが見つかる）
  https://www.notion.com/releases/2024-06-11
- 指で上下にドラッグして速く送る、側面の日付バー。
  "a new date bar on the side of the page, which you can drag up and down"
  （訳: ページの側面の新しい日付バーを、上下にドラッグできる）
  https://telegram.org/blog/shared-media-scrolling-calendar-join-requests-and-more
- 外で離したら押したことにしない、というボタンの決まり。
  "A touch-up event in the control where the finger is outside the bounds of the control."
  （訳: 指がコントロールの外にある状態で離れたこと）
  https://developer.apple.com/documentation/uikit/uicontrol/event/touchupoutside
- 上の2つの線の前例はどちらも hover（マウス）のもので、指で触って伸びる前例は見つかっていない

## 事例

- 横の送りの棒を、そのまま向きを変えて縦の端に置いた案は、雑だとして差し戻された
- 端の線を今いる所まで塗る案は、進捗ではないとして差し戻された
- 線を右端に置き、触ると一覧に伸びる試作は、動きは通ったが、右に覗くカードや外したカードの跡と被った
- 被りを避けるために覗く側を切った試作は、押せる幅が小さいのが問題だとして通らなかった
- 線を左端に移し、押せる幅を広げた試作は通った
