# 参考Keymapエビデンス（`monokey.keymap`）

## 参照情報

- 参照元: https://github.com/pite1222/conductor/blob/main/config/monokey.keymap
- 生データ: https://raw.githubusercontent.com/pite1222/conductor/main/config/monokey.keymap
- 取得日: 2026-02-24
- 目的: `tomkey` 改善時の比較用ベースライン

## 確認できた変更要素

1. タップホールド調整
- `&mt { quick-tap-ms = <300>; };`
- `&lt { quick-tap-ms = <300>; };`

2. コンボ定義
- `scroll`: `bindings = <&mo 5>;` / `key-positions = <17 18>;`
- `mb3`: `bindings = <&mkp MB3>;` / `key-positions = <19 18>;`

3. 右クリックビヘイビア
- `right_click_behavior` を定義し `bindings = <&mkp MB2>;`

4. レイヤー構成
- `default_layer`, `FUNCTION`, `NUM`, `ARROW`, `MOUSE`, `SCROLL`, `Bluetooth`
- 予約レイヤー: `layer_7` から `layer_11`

5. センサー割当
- `default_layer`: `sensor-bindings = <&inc_dec_kp PG_UP PAGE_DOWN>;`
- `ARROW`: `sensor-bindings = <&inc_dec_kp LC(PAGE_UP) LC(PAGE_DOWN)>;`

## 根拠抜粋（原文）

- `bindings = <&mo 5>;`
- `bindings = <&mkp MB3>;`
- `bindings = <&mkp MB2>;`
- `key-positions = <17 18>;`
- `key-positions = <19 18>;`
- `layer_7` 〜 `layer_11` 定義あり
