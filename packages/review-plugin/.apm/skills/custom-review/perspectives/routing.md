# 観点ファイルの振り分け

差分のファイルごとに、当てはまる行の観点ファイルを全部選ぶ（複数可）。
振り分けはファイル名・拡張子・置き場所で決める。
ファイルの中身を読んで決めない。

| 差分のファイル | 観点ファイル |
|---|---|
| すべてのファイル | `general.md`、`imitation-review` スキル |
| プログラムのコード | `code.md` |
| シェルスクリプトと hook | `shell-hook.md` |
| ページ（ウェブページ、Artifact） | `web-ui.md` |
| 設定ファイル | `config.md` |
| テストのコード（`*.test.*`・`*.spec.*`・`tests/`・`e2e/` など） | `test.md` |
| 手順書（スキル、CLAUDE.md などのハーネスの部品を含む） | `procedures.md` |
| Markdown を含む文書 | `document-minimization-review` スキル、`documentation-review` スキル |
| スキル | `skill-review` スキル |
| ハーネスの部品（CLAUDE.md、instruction、スキルなど） | `harness-placement` スキル |
| README と設計書などの恒久ドキュメント | `writing-docs` スキル |
