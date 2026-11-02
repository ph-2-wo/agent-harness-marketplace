# 前の版をその場で行き来する（in-place-version-history）

## 場面

出し直して版を重ねたものを見ていて、ある要素が前はどうだったか、消えた要素が無かったかを、思い出して確かめたいとき。
普段は見なくてよい。

前の版を別の場所に出すと、どの要素の前の版かを対応させる手間がかかる。
消えた要素は、跡が無いと消えたことにも気づけない。

## 作り方

- 前の版は、その要素の位置のまま中身を替えて出す。枠と位置は変えない
- 版を開いたら、全部の版の番号を並べる。その要素が無かった版は打ち消して押せなくし、今の版に印を付ける
- 直前の版で変わった要素と、それより前に変わったことがある要素を、印の塗り分けで分ける
- 消えた要素は、あった位置に細い跡を残す。押すと元の大きさに開き、出ていた版の中身を選べる
- 印は表示だけにし、開くボタンは要素の下の段に置く（[thumb-bottom-bar](thumb-bottom-bar.md)）
- 前の版の中身は、開いたときに初めて読む

## 使わない場面

- 変わったところを読ませるのが主のとき。
  [changes-first-revisit](changes-first-revisit.md) を使う。
  このパターンは、普段は見ない確認のためのもの

## 根拠

- iMessage の編集履歴: "Tap the word "Edited" under the current message to reveal the previous message or messages."
  （訳: 今のメッセージの下の「Edited」をタップすると、前のメッセージを出す。）
  https://support.apple.com/en-ph/105083
- Wikipedia の差分: 消えた段落の反対側に空の枠を置き、飛ばした版の数を "(x intermediate revisions not shown.)" と出す。
  https://en.wikipedia.org/wiki/Help:Diff
- Gerrit: 全部の版を一覧で見せ、同じ画面のまま版を切り替える。
  https://gerrit-review.googlesource.com/Documentation/user-review-ui.html
- WhatsApp: 削除したメッセージの位置に "This message was deleted" を残す（二次）。
  https://techcrunch.com/?p=1560410

## 事例

- 前の版を下から出すシートに並べた作りは、どの要素の前の版か分からないとして差し戻された
- 消えた要素の入口を束の最後にだけ置き、前の版を矢印と番号1つで送った作りは、端まで行かないと見られない・何版見られるか分からないとして差し戻された
- その場で替える・全部の版の番号・消えた位置の跡を見本で見せた作りは通った。
  開くボタンが上にありすぎて押しづらいとされ、下の段に移した

## 確かめた回数

- 使って通った: 1回（見本）
- 前例: 4件
