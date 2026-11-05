# 用語集の言葉に印を付け、タップで下からシート（inline-term-sheet）

## 場面

説明の文に、読み手が知らなさそうな言葉（組織の中だけで通じる名前・ファイル名・その作業で生まれた言葉など）が出るとき。

知らない言葉が出ると、読み手は検索するか書き手に聞き直すまで読み進められない。
選ぶたびに説明を作る形では、同じ言葉を毎回聞き直すことになる。

## 作り方

- 言葉と説明を用語集に登録しておき、画面が本文の中の一致した言葉に自動で印を付ける。
  書き手が本文に印の記法を書かない
- 印は、節（カードなど）ごとに、その言葉が最初に出たところに1回だけ付ける
- 印は点線の下線にし、文字の色は変えない。
  色は他の強調に使われているので混ぜない
- コード・リンクの中には付けない。
  インラインコードは、コード全体が言葉と一致するときだけ付ける
- 英数字の言葉は語の切れ目で照らす（`tone` が `stone` に当たらない）。
  長い言葉を先に照らす
- 印をタップすると、下からシートを開き、見出しに言葉、本文に説明を出す。
  シートは画面に既にあるシートの作りにそろえる
- シートの中の説明には印を付けない

## 使わない場面

- 飛び先のあるリンク。
  リンクのタップを横取りしてプレビューを出さない
- 一般に通じる言葉。
  印が増えると、どこが大事か分からなくなる

## 根拠

- Wikipedia Manual of Style/Linking の Duplicate and repeat links: "Link a term at most once per major section, at first occurrence."
  （訳: 言葉のリンクは、大きな節ごとに最大1回、最初に出たところに付ける。）
  https://en.wikipedia.org/wiki/Wikipedia:Manual_of_Style/Linking
- MDN `<abbr>`: "Some browsers add a dotted underline to the content of the element."
  （訳: 一部のブラウザは、この要素の中身に点線の下線を付ける。）
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/abbr
- Wikipedia のモバイル web のリンクプレビューの実験: リンクのタップでボトムシートを出す形を A/B で試し、ページビューとセッションの長さが減り、長押しが増えたので導入しないと決めた。
  https://www.mediawiki.org/wiki/Readers/Reader_Growth/Mobile_page_previews
- Atlassian Rovo の definitions: 作った定義を誰でも直せ、範囲内の人に同じ定義が出る。
  定義のある言葉に印を付ける（definition highlighting）。
  https://support.atlassian.com/rovo/docs/add-or-edit-a-definition/

## 事例

- 言葉を選ぶたびに説明を作る形は、毎回聞き直すことになるとして差し戻された
- 用語集の言葉にカードごとに最初の1回だけ点線の下線を付け、タップで下からシートを出す見本は通った
