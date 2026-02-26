# ZYA / DYA Studio 対応ロードマップ

> 作成日: 2026-02-26
> 参考: [Compatible DYAStudio (RaZiLy)](https://note.com/razily/n/n7a23e5a7512c) / [moNa2編 (heace)](https://note.com/heace/n/nf06b797ffa79) / [zmk-keyboard-dya2](https://github.com/cormoran/zmk-keyboard-dya2)

---

## 背景

DYA Studio（https://studio.dya.cormoran.works/）は、ZMK をベースにした Web キーマップエディタ。
USB・BLE 両対応、トラックボール設定・AML 設定・バッテリー履歴など多機能。
対応には cormoran フォーク ZMK (v0.3-branch+dya) と専用モジュール群の導入が必要。

**tomkey の現状:**

| 項目 | 現状 |
|---|---|
| ZMK | `zmkfirmware/zmk` @ `v0.3` |
| トラックボール | PMW3610 (badjeff driver) / `input-split` 構成 |
| Central | `tomkey_L`（左手・USB ドングル） |
| Peripheral | `tomkey_R`（右手） |
| Studio | `CONFIG_ZMK_STUDIO=y` / `LOCKING=n`（現状 USB 専用） |

> **⚠️ 注意**: tomkey では **左手 (L) が Central**（USB 給電・ドングル側）、**右手 (R) が Peripheral**（トラックボール搭載側）。
> moNa2 記事は「右が Central」なので、Left/Right の割り当てが逆になる点に注意。

---

## 全体の変更影響マップ

```
STEP 1: west.yml             → ビルド依存解決・全体の基盤
    ↓
STEP 2: .github/workflows    → CI ビルド先の変更
    ↓
STEP 3: tomkey_L.conf        → Central の DYA Studio 機能有効化
STEP 3: tomkey_R.conf        → Peripheral の最小設定追加（同時並行可）
    ↓
STEP 4: tomkey_R.overlay     → Peripheral のトラックボール listener 移植
    ↓
STEP 5: tomkey_L.overlay     → Central の include 追加（AML/スクロール記述確認）
    ↓
STEP 6: tomkey.keymap        → &studio_unlock キー追加・include 追加
    ↓
STEP 7: ビルド & 書き込み    → GitHub Actions または ローカル west build
    ↓
STEP 8: DYA Studio 接続確認
```

---

## STEP 1: `config/west.yml` の書き換え

**影響度: ★★★★★（最重要 / 全ビルドの基盤）**

ZMK を cormoran フォークへ切り替え、DYA Studio モジュール群を追加する。

### 変更前 (現状)

```yaml
manifest:
  remotes:
    - name: zmkfirmware
      url-base: https://github.com/zmkfirmware
    - name: badjeff
      url-base: https://github.com/badjeff
    - name: te9no
      url-base: https://github.com/te9no
  projects:
    - name: zmk
      remote: zmkfirmware
      revision: v0.3
      import: app/west.yml
    - name: zmk-pmw3610-driver
      remote: badjeff
      revision: zmk-0.3
    - name: zmk-dongle-display
      remote: te9no
      revision: main
  self:
    path: config
```

### 変更後

```yaml
manifest:
  remotes:
    - name: cormoran
      url-base: https://github.com/cormoran
    - name: badjeff
      url-base: https://github.com/badjeff
    - name: te9no
      url-base: https://github.com/te9no
  projects:
    # ZMK: DYA Studio 用カスタム RPC サブシステム付き cormoran fork
    - name: zmk
      remote: cormoran
      revision: v0.3-branch+dya
      import: app/west.yml
    # DYA Studio モジュール
    - name: zmk-module-ble-management
      remote: cormoran
      revision: main
    - name: zmk-module-battery-history
      remote: cormoran
      revision: main
    - name: zmk-module-settings-rpc
      remote: cormoran
      revision: main
    - name: zmk-module-runtime-input-processor
      remote: cormoran
      revision: main
    # トラックボールドライバー (badjeff)
    - name: zmk-pmw3610-driver
      remote: badjeff
      revision: zmk-0.3
    # ドングルディスプレイ
    - name: zmk-dongle-display
      remote: te9no
      revision: main
  self:
    path: config
```

**差分ポイント:**
- `zmkfirmware` remote を `cormoran` に置き換え
- ZMK の revision を `v0.3` → `v0.3-branch+dya` に変更
- DYA Studio 用モジュール 4 つを追加
- `badjeff` (pmw3610) / `te9no` (display) は引き続き利用

---

## STEP 2: `.github/workflows/build.yml` の書き換え

**影響度: ★★★（CI ビルドのみ / ローカルビルドなら後回し可）**

GitHub Actions で cormoran フォーク版のワークフローを使うように変更。

### 変更前 (現状)

```yaml
jobs:
  build:
    uses: zmkfirmware/zmk/.github/workflows/build-user-config.yml@v0.3
```

### 変更後

```yaml
jobs:
  build:
    uses: cormoran/zmk/.github/workflows/build-user-config.yml@v0.3-branch+dya
```

---

## STEP 3: `.conf` ファイルへの Kconfig 追加

**影響度: ★★★★（機能有効化 / ビルド通過に必要）**

### 3-1. `config/boards/shields/tomkey/tomkey_L.conf`（Central 側）

現状: `CONFIG_ZMK_STUDIO=y` / `LOCKING=n` のみ。
以下を**追記**する（既存設定は保持）:

```conf
# ========================================
# DYA Studio モジュール（Central 側）
# ========================================

# BLE 管理
CONFIG_ZMK_BLE_MANAGEMENT=y
CONFIG_ZMK_BLE_MANAGEMENT_STUDIO_RPC=y

# バッテリー履歴
CONFIG_ZMK_BATTERY_HISTORY=y
CONFIG_ZMK_BATTERY_HISTORY_STUDIO_RPC=y
# USB 接続中もバッテリー履歴を記録したい場合は n に設定
CONFIG_ZMK_BATTERY_SKIP_IF_USB_POWERED=n

# Settings RPC（アイドル/スリープ設定の Studio 連携）
CONFIG_ZMK_SETTINGS_RPC=y
CONFIG_ZMK_SETTINGS_RPC_STUDIO=y

# Split イベントリレー（Central <-> Peripheral 設定同期）
CONFIG_ZMK_SPLIT_RELAY_EVENT=y
CONFIG_ZMK_SPLIT_BLE_CENTRAL_SPLIT_RUN_STACK_SIZE=3096

# Runtime Input Processor（トラックボール設定を DYA Studio からリアルタイム変更）
CONFIG_ZMK_RUNTIME_INPUT_PROCESSOR=y
CONFIG_ZMK_RUNTIME_INPUT_PROCESSOR_STUDIO_RPC=y

# 設定の永続化
CONFIG_SETTINGS=y
CONFIG_ZMK_SETTINGS_SAVE_DEBOUNCE=10000

# BLE 接続スロット（プロファイル + Peripheral + Studio）
CONFIG_BT_MAX_CONN=5
CONFIG_BT_MAX_PAIRED=5

# ヒープメモリ拡張・BLE バッファ調整（フリーズ対策）
CONFIG_HEAP_MEM_POOL_SIZE=24576
CONFIG_BT_RX_STACK_SIZE=2560
CONFIG_BT_HCI_TX_STACK_SIZE=1536
```

> **既存設定の変更点**: `CONFIG_ZMK_STUDIO_LOCKING=n` は **削除または `y` に変更**。
> DYA Studio の BLE 接続には Studio Locking が必要。USB 専用なら `n` のままで可。

### 3-2. `config/boards/shields/tomkey/tomkey_R.conf`（Peripheral 側）

現状には DYA Studio 設定がないため、以下を**追記**:

```conf
# ========================================
# DYA Studio モジュール（Peripheral 側）
# ========================================

# バッテリー履歴
CONFIG_ZMK_BATTERY_HISTORY=y

# Settings RPC
CONFIG_ZMK_SETTINGS_RPC=y

# Split イベントリレー
CONFIG_ZMK_SPLIT_RELAY_EVENT=y

# 設定の永続化
CONFIG_SETTINGS=y
CONFIG_ZMK_SETTINGS_SAVE_DEBOUNCE=10000
```

---

## STEP 4: `tomkey_R.overlay`（Peripheral）のトラックボール設定移植

**影響度: ★★★★（トラックボール動作に直結 / 最も調整が必要）**

`runtime-input-processor` ベースの記述法に移行する。
現状の `trackball_listener` が `device = <&trackball>` を参照しているが、
DYA Studio 対応では `mouse_runtime_input_processor` を `input-processors` に追加する。

### 追加: ファイル先頭の include

```c
#include <input/processors/runtime-input-processor.dtsi>
```

### 変更: `trackball_listener` ノード

```dts
&trackball_listener {
    status = "okay";
    device = <&trackball>;
    input-processors = <&mouse_runtime_input_processor>;

    scroller {
        /* スクロールレイヤー（layer 2: SCROLL）でカーソル移動をスクロールに変換 */
        layers = <2>;
        input-processors = <
            &zip_xy_transform (INPUT_TRANSFORM_Y_INVERT)
            &zip_xy_to_scroll_mapper
            &scroll_runtime_input_processor
        >;
    };
};
```

> **注意**: 現状 `tomkey_L.overlay` の `trackball_listener` で AML (`&zip_temp_layer`) やスクロール設定を行っているが、
> Peripheral 側の overlay で listener を定義し直す場合はそちらに移動させる必要がある。
> `scroll_v` (縦スクロール専用, layer 7) など tomkey 固有のブロックも適宜移植すること。

---

## STEP 5: `tomkey_L.overlay`（Central）の include 追加

**影響度: ★★（include 追加のみ / 比較的低リスク）**

Central 側の overlay に DYA Studio 用 include を追加。

```c
// ファイル先頭の既存 include 群に追加
#include <input/processors/runtime-input-processor.dtsi>
#include <behaviors/battery_history_request.dtsi>
```

現状の `&zip_temp_layer` や `&trackball_listener` ブロックは STEP 4 の移植内容に応じて調整。

---

## STEP 6: `config/tomkey.keymap` の変更

**影響度: ★★（キーマップへの追記 / 既存バインドに影響なし）**

### 6-1. ファイル先頭の include 追加

```c
#include <input/processors.dtsi>
#include <input/processors/runtime-input-processor.dtsi>
#include <behaviors/battery_history_request.dtsi>
```

### 6-2. `&studio_unlock` キーの追加

DYA Studio の BLE 接続解除のために必要。既存の `layer_6`（BT レイヤー）に追加することを推奨:

```dts
layer_6 {
    bindings = <
        // 既存の BT_PRV / BT_NXT ...
        &studio_unlock  // 適切な位置に配置
        // ...
    >;
};
```

---

## STEP 7: ビルド & 書き込み

**影響度: ★（確認フェーズ）**

### GitHub Actions（推奨）

1. STEP 1〜6 の変更をコミット＆プッシュ
2. GitHub Actions が自動的に firmware をビルド
3. Artifacts から `tomkey_L` / `tomkey_R` の `.uf2` をダウンロード
4. 各マイコンをブートローダーモードで接続し書き込み

### ローカルビルド（任意）

```bash
# west update（初回または west.yml 変更後）
west update

# Left (Central)
west build -b seeeduino_xiao_ble -- -DSHIELD=tomkey_L

# Right (Peripheral)
west build -b seeeduino_xiao_ble -- -DSHIELD=tomkey_R
```

---

## STEP 8: DYA Studio 接続確認

1. ブラウザで [https://studio.dya.cormoran.works/](https://studio.dya.cormoran.works/) を開く
2. **USB 接続時**: tomkey の Central (L) を USB で PC に接続 → "Connect" クリック
3. **BLE 接続時**: `&studio_unlock` キーを押した状態で BT 接続 → Studio から認識されるか確認
4. トラックボール速度・AML タイムアウト・スクロール感度が Studio UI から変更できることを確認

---

## リスク・注意事項

| リスク | 内容 | 対策 |
|---|---|---|
| AML 設定の再考 | `&zip_temp_layer` は DYA Studio の AML とは別物。Studio 側 AML に移行するか共存するか検討が必要 | まずは現状の `zip_temp_layer` を残しつつ Studio でのオーバーライドを確認 |
| `STUDIO_LOCKING` の変更 | `LOCKING=n` → `y` にすると BLE Studio 接続が可能になるが、USB のみ使う場合は変更不要 | USB 接続確認を先行、BLE は後続フェーズで対応 |
| dongle-display 互換性 | `te9no/zmk-dongle-display` が cormoran ZMK v0.3+dya と互換性があるか未検証 | ビルドエラーが出た場合は te9no リポジトリの動作確認が必要 |
| `scroll-layers` 削除が必要 | PMW3610 ドライバーの `scroll-layers = <2>` は runtime-input-processor 方式と重複。削除が必要 | STEP 4 で `trackball` ノードを確認・削除 |
| Peripheral listener 場所 | トラックボール listener は Peripheral (R) overlay で設定するが、Central (L) overlay にも現在定義がある | 重複を整理し、片方にまとめる |

---

## 推奨作業順序

```
[1] west.yml 変更 → push → Actions でビルドエラー確認（コンパイル通過が最優先）
[2] .conf 追加（Central/Peripheral 両方）→ ビルド確認
[3] keymap の include / &studio_unlock 追加 → ビルド確認
[4] overlay のトラックボール listener 移植 → 実機動作確認
[5] DYA Studio 接続テスト（USB → BLE の順）
```

各ステップでビルドを確認しながら進めることで、問題の切り分けが容易になる。
