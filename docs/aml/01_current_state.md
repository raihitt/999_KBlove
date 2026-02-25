# AML Stage 1: 現行仕様と依存関係

対象:
- `config/tomkey.keymap`
- `config/boards/shields/tomkey/tomkey_L.overlay`
- `config/boards/shields/tomkey/tomkey_L.conf`
- `config/boards/shields/tomkey/tomkey_R.conf`

## 現行の定義

1. レイヤー定義（`tomkey.keymap`）
- `MOUSE` が AML用途
- `SCROLL` がスクロール用途

2. AML自動切替（`tomkey_L.overlay`）
- `&trackball_listener` で `input-processors = <&zip_temp_layer 1 400>;`
- 意味: トラックボール入力時に一時的にレイヤー1へ切替

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
- 他実装は比較参照のみとし、レイヤー定義は移植しない
