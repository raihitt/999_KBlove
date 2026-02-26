# AML Stage 1: 現行仕様と依存関係

対象:
- `config/tomkey.keymap`
- `config/boards/shields/tomkey/tomkey_L.overlay`
- `config/boards/shields/tomkey/tomkey_L.conf`
- `config/boards/shields/tomkey/tomkey_R.conf`

## 現行の定義

1. レイヤー定義（`tomkey.keymap`）
- `MOUSE` (レイヤー1) が AML用途
  - `,` (31): `MB1` (左クリック)
  - `.` (32): `MB2` (右クリック)
  - `,` + `.` (同時押しコンボ): `MB3` (中クリック)
- `SCROLL` (レイヤー2) がスクロール用途

2. AML自動切替（`tomkey_L.overlay`）
- `&trackball_listener` で `input-processors = <&zip_temp_layer 1 5000>;`
- タイムアウト: **5000ms (5秒)**
- **即時解除設定 (`excluded-positions`)**: `<7 8 31 32 34 35 36 37>`
  - `,` (31), `.` (32): マウスボタン維持のため除外
  - 修飾キー (34-37): ドラッグ操作等のため除外
  - I (7), O (8): 縦スクロールコンボ起動のため除外
  - **それ以外のキーを押すと即座にAMLを解除し、デフォルトレイヤーへ戻る**
- **誤爆防止 (`require-prior-idle-ms`)**: `400ms`
  - タイピング終了後 400ms 経過してからのみAMLを発動可能

3. スクロール変換（`tomkey_L.overlay`）
- `scroll { layers = <2>; ... }`
- 意味: レイヤー2でXY入力をスクロールへ変換

4. ビルド有効化（`.conf`）
- 右手: `CONFIG_ZMK_MOUSE=y`
- 左手: `CONFIG_ZMK_POINTING=y`, `CONFIG_INPUT=y`
- センサー: `CONFIG_PMW3610=y` ほか

## 固有値ポリシー

- `MOUSE` / `SCROLL` は `Tomkey` レイアウト依存の固有値として固定
- `zip_temp_layer` の切替先レイヤー番号は `Tomkey` 構成を維持
- スキャンコード・物理位置は `tomkey.keymap` および `tomkey.dtsi` を正とする
