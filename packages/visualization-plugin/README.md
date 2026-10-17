# Visualization Plugin

表データ・数値データをグラフィカルに見せる方法を、実際に使って通った事例から選べるようにする skill package。

## 入るもの・入らないもの

- 入る: 表データ・数値データの可視化の見せ方（比較表を図にする、多数×多数を比べる、値の推移を見せる、など）
- 入らない: 仕組みやアーキテクチャを描く図、解説ページそのものの作り方（配布しない）
- 入らない: 色の選び方・軸・目盛りなどのグラフの作り込み（組み込みの `dataviz` skill の担当）

比較表をそのまま置くと、1つずつは読めても全体像が見えない。
普通の棒グラフに直しても、多数のモデル×多数の項目のような表は表現しきれない。
agent はその場で見せ方を考え直し、一度ユーザーに差し戻された案をまた出すことがある。
この package は、使って満足された見せ方と、合わなかった見せ方を事例として渡す。

## Skills

- [`data-viz-ideas`](docs/skills/data-viz-ideas.md): 見せたいものから、使える見せ方のアイデアと見本を引く

## Dependency

skill 間の依存はない。
単体で機能する。

色の検証とグラフの作り込みには、Claude Code に組み込みの `dataviz` skill を使う（APM の依存ではない）。

## Install from Marketplace

```bash
apm marketplace add ph-2-wo/agent-harness-marketplace
apm install visualization-plugin@agent-harness-marketplace
```

## Usage

表データ・数値データをグラフィカルに見せる方法を決めるときに使う。
