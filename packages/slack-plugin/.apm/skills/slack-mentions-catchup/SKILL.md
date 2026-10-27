---
name: slack-mentions-catchup
description: Slack で自分宛てに来たものを、前回以降・直近1時間など時刻で区切って集めるときに使う。「Slack キャッチアップして」「何か来てる？」など、名前で頼まれていなくても使う。
---

# Slack の自分宛てを時刻で集める

Slack MCP の検索 `slack_search_public_and_private` だけで集める。
既読を付けるツールは呼ばない。
既に読んだものも、時刻の範囲に入れば集める。

## 1. 自分の user ID と区切りの時刻を決める

- user ID は、`slack_read_user_profile` を引数なしで呼び、返った `User ID` を使う
- 区切りは、頼まれた範囲にする。指定が無ければ直近24時間にする
- 区切りの時刻は、`after` に Unix 秒で渡す
- 検索には keywords か filters が要るので、filters に `after:<区切りの前日の日付>` も入れる

## 2. 3つの検索を並べて実行する

3つとも `sort: "timestamp"`・`include_bots: true`・`include_context: false`・`natural_language_query: ""` を付ける。

| 集めるもの | 引数 |
| :-- | :-- |
| DM・グループ DM | `channel_types: "im,mpim"`、`filters: "-from:<@ID> after:<日付>"` |
| メンション | `keywords: ["<@ID>"]`、`filters: "-from:<@ID> after:<日付>"` |
| 自分が加わったスレッドへの返信 | `filters: "is:thread with:<@ID> -from:<@ID> after:<日付>"` |

`pagination_info` に次のページの cursor があれば、`cursor` に渡して最後まで取る。

## 3. まとめて返す

同じ `Message_ts` は1件にまとめる。
新しい順に、種類・場所・送り手・本文の要約・permalink を並べる。

## この3つの検索に入らないもの

リアクション・招待・キーワード通知は入らない。
@channel と @here が取れるかは確かめていない。
