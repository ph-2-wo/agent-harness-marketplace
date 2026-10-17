---
name: apm-skill-development
description: APMプロジェクトでskillを作成または更新するときに使う。
---

# APM Skill Development

APMでskillを開発する際の固有事情を扱う。

SKILL.mdの一般的な作り方は扱わない。

## Scope

`.apm/skills/`内のskill作成と更新だけを対象とする。

instructions、prompts、agents、hooks、MCP、marketplace、bundle配布は対象外とする。
対象外の作業が必要な場合、skill開発の知識から推測せず、現在の公式資料を調査する。

## Workflow

### 1. 現在の仕様を確認する

最初に使用中のCLIを確認する。

```sh
apm --version
```

APMの挙動やコマンドに不明点がある場合、学習済み知識で断定しない。
使用中CLIの`--help`と現在の公式資料を確認する。

- install: https://microsoft.github.io/apm/reference/cli/install/
- compile: https://microsoft.github.io/apm/producer/compile/
- pack: https://microsoft.github.io/apm/producer/pack-a-bundle/
- lockfile: https://microsoft.github.io/apm/reference/lockfile-spec/

### 2. 公開範囲を決める

consumerへ配布するskillは、project rootの`.apm/skills/`に置く。

packageの開発・保守だけで使うMaintainer-only skillは、project rootの`.apm/`外に別のlocal APM packageとして置き、`devDependencies.apm`からpath参照する。

```text
my-package/
  apm.yml
  .apm/skills/public-skill/SKILL.md
  dev/maintainer-skills/
    apm.yml
    .apm/skills/release-helper/SKILL.md
```

```yaml
devDependencies:
  apm:
    - path: ./dev/maintainer-skills
```

`dev/`は配置の慣例であり、directory名自体にAPM上の意味はない。

Maintainer-only skillをproject rootの`.apm/skills/`に置いたままdev/internal属性を付ける仕組みではない。

### 3. 正本を編集する

skillの正本は次とする。

```text
.apm/skills/<skill-name>/
```

`.agents/skills/`や`.claude/skills/`などの展開先を直接編集しない。
展開先を編集した場合、その内容を正本へ書き戻し、正本から展開し直して差分の由来を確認する。

### 4. APMで展開する

skillの編集完了後、repository rootで引数なしのinstallを実行する。

```sh
apm install
```

引数なしのinstallは、`apm.yml`の依存とプロジェクト自身の`.apm/`をtargetへ展開し、`apm.lock.yaml`を更新する。

https://microsoft.github.io/apm/reference/cli/install/

次を確認する。

- exit codeが0
- repository rootのlocal primitivesが展開された
- 対象skillが`apm.yml`のtargetへ展開された
- `apm.lock.yaml`が更新された

失敗時は出力を確認し、transactionがcommitされたと推測しない。
APMが変更をcommitしなかったと明示した場合も、実ファイルとlockを確認する。

### 5. 展開結果を確認する

`apm.yml`のtargetとinstall出力から展開先を特定する。

正本と各展開先の内容が一致するか確認する。

```sh
cmp .apm/skills/<skill-name>/SKILL.md .agents/skills/<skill-name>/SKILL.md
cmp .apm/skills/<skill-name>/SKILL.md .claude/skills/<skill-name>/SKILL.md
```

targetやAPMバージョンにより展開先は変わり得るため、存在を推測せずinstall出力を優先する。

### 6. lock差分を確認する

`apm.lock.yaml`は手編集しない。
installが生成した差分を確認する。

https://microsoft.github.io/apm/reference/lockfile-spec/

次が意図したskillと一致するか確認する。

- `local_deployed_files`
- `local_deployed_file_hashes`
- `deployments`
- target
- content hash

関係ないdependency更新やdeployment削除が混ざっている場合、commit前に原因を調査する。

### 7. commit前に確認する

通常のcommit対象は次とする。

- `.apm/skills/<skill-name>/`
- `apm.lock.yaml`
- skill追加に明示的に必要な関連ファイル

`.agents/`や`.claude/`など、gitignoreされた展開結果をcommit対象にしない。

`git status`と差分を確認し、無関係な変更を含めない。

## Conditional Commands

### devDependencies

引数なしの`apm install`は`dependencies`と`devDependencies`を展開する。

`apm install --dev`はdependencyを`devDependencies`へ追加する際に使う。
既存のdev dependencyを展開するために毎回付けるoptionではない。

`apm pack`はdefaultのplugin bundleから`devDependencies`を除外する。

- devDependencies: https://microsoft.github.io/apm/reference/manifest-schema/#5-devdependencies
- dev-only primitives: https://microsoft.github.io/apm/concepts/primitives-and-targets/#dev-only-primitives

### includes

`includes`はpack対象のallow-listであり、exclude形式はない。

https://microsoft.github.io/apm/reference/manifest-schema/#39-includes

### compile

skillsはcompile対象ではないため、skill開発だけなら実行しない。
skillsは`apm install`で直接展開される。

https://microsoft.github.io/apm/producer/compile/

### pack

通常のskill開発では実行しない。
Gitやregistryではなく、生成済みbundleを渡す要件がある場合だけ調査して使う。

https://microsoft.github.io/apm/producer/pack-a-bundle/

### install dry-run

公式上はdeployment writeを行わずinstall計画を表示する。

実実行と表示内容が一致する保証として扱わず、削除や展開の最終判断は実行結果と実ファイルで行う。

https://microsoft.github.io/apm/reference/cli/install/
