# DYA Studio Level 3 実験手順

## 目的

現在動作している `config/west.yml` と通常のGitHub Actions成果物を維持したまま、DYA Studioの未マージ機能をローカルFWで段階検証する。

対象は `cormoran/zmk-config-dya-studio-sample` のPR #4相当で、次の機能を含む。

- Keymapの高速取得
- runtime Macro
- runtime Combo
- 押下キーのInput Stream
- トラックボール等をレイアウトに載せるPhysical Layout module

## 安全境界

| 経路 | manifest | 扱い |
| --- | --- | --- |
| 現行安定 | `config/west.yml` | 既存機能・通常更新用。変更しない |
| Level 3実験 | `config/west-dya-level-3.yml` | `main+dya` とPR #4相当の機能。未マージ依存を含む |

Level 3は別west workspace (`.dya-local/level-3/`)に作成されるため、通常の`.west`や安定設定を共有しない。`main+dya`側のボード名は`xiao_ble`である。

L3（左手）はDYA Studio接続とruntime機能を持つCentral、R3（右手）はBLE splitとcustom-settings relayを持つPeripheralとして分ける。Peripheral側でCentral専用のStudio RPCやkeymap編集機能を有効にすると、Central専用APIのリンクに失敗するため、意図的に有効化していない。

Level 3では、現行の`zmk-module-battery-history`と`zmk-module-settings-rpc`を読み込まない。これらは`main+dya`の現行relay/APIと互換せず、Level 3のビルドを止めるためである。安定経路の`config/west.yml`と既存Level 2設定は変更していない。R3のPMW3610は外部ドライバーではなくZephyr 4.1系の組み込み入力ドライバーを使用する。

## ローカルビルド

前提は `west`、Zephyr SDK、nRF Connect SDK相当のビルド環境と、依存取得・ビルド用の空き容量（8 GiB以上を推奨）。`west`がPATHに無い場合、スクリプトは`uvx`経由でwestを起動する。

```sh
cd /Users/raihi/local_repo/999_KBlove
uv tool install west   # westを常用する場合だけ。一度でよい
./scripts/dya-local-build.sh
```

初回は依存取得のため時間がかかる。生成物は以下に出る。

```text
.dya-local/level-3/build/tomkey_L3/zephyr/zmk.uf2
.dya-local/level-3/build/tomkey_R3/zephyr/zmk.uf2
```

2026-08-19時点では、L3/R3ともローカルビルドとUF2生成まで確認済み。実機への書き込み、左右接続、DYA Studio接続、runtime Comboの動作はまだ未確認である。

## 段階検証

1. まずビルドだけを完了し、`zephyr/.config`でLevel 3のKconfigが`y`になっていることを確認する。
2. 実機はPeripheral（右）から`tomkey_R3`を書き込み、キー入力・トラックボール・左右接続を確認する。
3. Central（左）へ`tomkey_L3`を書き込み、USBで接続してDYA Studioへ接続する。macOSではDYA StudioのBLE接続を使わずUSBを使う。
4. Studioで現在のKeymap表示と既存のAML／トラックボール設定が壊れていないことを確認する。
5. runtime Comboを1スロットだけ作成し、短いタイムアウトと既存キー位置で試す。保存前の一時変更と再起動後の永続化を分けて確認する。
6. runtime Macroは作成・編集・保存を確認する。現行keymapにはまだ`&rmacro`の実行キーを追加していないため、実行確認は専用keymapを用意する次段階まで保留する。
7. Input Streamは接続・アンロック後に短時間だけ有効化し、切断前に停止する。モジュール既知の切断時workqueue問題を避ける。

## 切り戻し

- Level 3を止める: `.dya-local/`を削除してよい（生成物のみ）。
- 安定FWへ戻す: 通常のGitHub Actions成果物、または`config/west.yml`を使った従来ビルドを書き込む。
- DYA Studioの保存設定はFWの設定領域に残る可能性があるため、機能比較時は必要に応じてStudio側のリセット／設定初期化を行う。

## 未確認事項

- `main+dya`（Zephyr 4.1系）と既存PMW3610ドライバーの完全互換性
- 実機での`tomkey_L3`/`tomkey_R3`の左右接続とDYA Studio認識
- `zmk-tom-oled`を含むtomkeyのLevel 3実機表示
- 43キーの物理レイアウト上でのトラックボール表示位置
- runtime Macroを実キーから呼び出す専用keymap設計
