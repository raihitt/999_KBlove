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

Level 3は別west workspace (`.dya-local/level-3/`)に作成されるため、通常の`.west`や安定設定を共有しない。ビルドスクリプトではZMKのボードバリアント`xiao_ble//zmk`を使用する。通常の`xiao_ble`を指定すると設定保存バックエンドが無効になり、DYA Studioの保存が`operation not allowed or storage error`になるため、手動ビルドでもこのバリアントを使う。

L3（左手）はDYA Studio接続とruntime機能を持つCentral、R3（右手）はBLE splitとcustom-settings relayを持つPeripheralとして分ける。Peripheral側でCentral専用のStudio RPCやkeymap編集機能を有効にすると、Central専用APIのリンクに失敗するため、意図的に有効化していない。

Level 3では、現行の`zmk-module-battery-history`と`zmk-module-settings-rpc`を読み込まない。これらは`main+dya`の現行relay/APIと互換せず、Level 3のビルドを止めるためである。安定経路の`config/west.yml`と既存Level 2設定は変更していない。R3のPMW3610は安定版と同じ`badjeff/zmk-pmw3610-driver`を使用する。ただしZephyr 4.1系にも同名の組み込みドライバーがあるため、Level 3のローカルビルドでは外部ドライバーのcompatibleを`pixart,pmw3610-zmk`へ名前空間化し、二重登録を避けている。これにより、水平移動の挙動を安定版に合わせる。

表示は安定版の`dongle_display`ではなく、Level 3の`tom_oled`を左右両方に載せる構成である。そのためLCDの左右表示・接続表示の配置やアイコンは安定版と一致しない。右手側は`CONN OK`の接続表示を基準に確認する。旧LCDの左右アイコンをそのまま復元することは、今回の保存・トラックボール修正とは別の表示パッチとして扱う。

安定経路の`zmk-module-ble-management`と`zmk-module-runtime-input-processor`は、安定版DYA ZMKが提供するv0.3 APIと一致する`zmk-v0.3.0.0`タグに固定している。Level 3の`config/west-dya-level-3.yml`では、`main+dya`と互換する現行`main`を使用する。この2つの依存セットを混在させない。

## ローカルビルド

前提は `west`、Zephyr SDK、nRF Connect SDK相当のビルド環境と、依存取得・ビルド用の空き容量（8 GiB以上を推奨）。`west`がPATHに無い場合、スクリプトは`uvx`経由でwestを起動する。

```sh
cd /Users/raihi/local_repo/999_KBlove
uv tool install west   # westを常用する場合だけ。一度でよい
./scripts/dya-local-build.sh
```

初回は依存取得のため時間がかかる。生成物は以下に出る。

```text
.dya-local/level-3/firmware/settings_reset-seeeduino_xiao_ble-zmk.uf2
.dya-local/level-3/firmware/tomkey_L3-tom_oled-seeeduino_xiao_ble-zmk.uf2
.dya-local/level-3/firmware/tomkey_R3-tom_oled-seeeduino_xiao_ble-zmk.uf2
```

GitHub Actionsの`dya-level-3-firmware`成果物にも同じ3ファイルを格納する。`tomkey_L3-tom_oled...`はLevel 3用の左手Central、`tomkey_R3-tom_oled...`は右手Peripheralである。設定リセットは必要な場合だけ先に実行する。設定リセット用FWにはUSB RPC用snippetとZephyr 4.1系のUART互換overlayを付けている。

`tomkey_L3`と`tomkey_R3`はDYA Studioの変更をNVSへ保存できる構成である。生成後の`.config`では`CONFIG_FLASH=y`、`CONFIG_NVS=y`、`CONFIG_SETTINGS_NVS=y`を確認する。`settings_reset`を書き込んだままではruntime機能を使えないため、リセット後は必ずL3/R3の通常FWへ戻す。

重要: `settings_reset-seeeduino_xiao_ble-zmk.uf2` は設定消去専用で、Level 3のruntime Macro／runtime Comboを無効にしたFWである。このFWを書き込んだ状態では、DYA Studioの「マクロ＆コンボ」に両機能が表示されない。機能確認時は、設定リセットが必要なら先に一度だけ実行し、その後に必ずLevel 3の右手Peripheralと左手Centralを両方書き込む。

2026-08-29時点では、3ファイルのローカルビルドとUF2生成を確認済み。保存領域を有効にしたLevel 3ビルド、外部PMW3610ドライバーのリンク、runtime Combo/RPC関連Kconfigの有効化も確認済み。実機への書き込み、左右接続、DYA Studio保存、runtime Comboの動作、LCD表示の最終確認はまだ必要である。

検証済みAction:

- [Level 3 firmware run 33228323306](https://github.com/raihitt/999_KBlove/actions/runs/33228323306)
- [Stable firmware run 33228323488](https://github.com/raihitt/999_KBlove/actions/runs/33228323488)

## 段階検証

1. まずビルドだけを完了し、`zephyr/.config`でLevel 3のKconfigが`y`になっていることを確認する。
2. 実機はPeripheral（右）から`tomkey_R3`を書き込み、キー入力・トラックボール・左右接続を確認する。
3. Central（左）へ`tomkey_L3`を書き込み、USBで接続してDYA Studioへ接続する。macOSではDYA StudioのBLE接続を使わずUSBを使う。
4. Studioで現在のKeymap表示と既存のAML／トラックボール設定が壊れていないことを確認する。

### Windows Bluetooth切断のA/B検証

2026-08-30時点のLevel 3中央側では、Windows GATT相性候補を切り分けるため、次を明示的に無効化している。

```text
CONFIG_BT_GATT_ENFORCE_SUBSCRIPTION=n
```

これは安定版には適用していない。Sleep（`CONFIG_ZMK_SLEEP`）とStudioロック（`CONFIG_ZMK_STUDIO_LOCKING`）はLevel 3では無効であり、約10分の切断をそれらで説明する設定にはなっていない。比較時はWindows側でtomkeyを削除して再ペアリングした後、5・10・15・20分時点の入力とStudio接続状態を記録する。
5. runtime Comboを1スロットだけ作成し、短いタイムアウトと既存キー位置で試す。保存前の一時変更と再起動後の永続化を分けて確認する。
6. runtime Macroは作成・編集・保存を確認する。現行keymapにはまだ`&rmacro`の実行キーを追加していないため、実行確認は専用keymapを用意する次段階まで保留する。
7. Input Streamは接続・アンロック後に短時間だけ有効化し、切断前に停止する。モジュール既知の切断時workqueue問題を避ける。

## 切り戻し

- Level 3を止める: `.dya-local/`を削除してよい（生成物のみ）。
- 安定FWへ戻す: `Build ZMK firmware`の成功した成果物から、`settings_reset-seeeduino_xiao_ble-zmk.uf2`を必要時だけ先に書き込み、その後`tomkey_L dongle_display-seeeduino_xiao_ble-zmk.uf2`（左手Central）と`tomkey_R-seeeduino_xiao_ble-zmk.uf2`（右手Peripheral）を書き込む。安定版Actionが失敗している場合は、最後に成功した安定版Action成果物を使う。
- DYA Studioの保存設定はFWの設定領域に残る可能性があるため、機能比較時は必要に応じてStudio側のリセット／設定初期化を行う。

## 未確認事項

- `main+dya`（Zephyr 4.1系）と安定版PMW3610ドライバーの実機完全互換性
- 実機での`tomkey_L3`/`tomkey_R3`の左右接続とDYA Studio認識
- `zmk-tom-oled`を含むtomkeyのLevel 3実機表示
- 43キーの物理レイアウト上でのトラックボール表示位置
- runtime Macroを実キーから呼び出す専用keymap設計
