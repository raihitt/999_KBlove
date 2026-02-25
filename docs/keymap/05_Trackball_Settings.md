# 05: トラックボール設定 (Static Settings)

トラックボールの速度や物理的な軸挙動に関する固定設定のリファレンスです。

## 現在の設定値

| パラメータ | 設定値 | 対象ファイル | 備考 |
| :--- | :--- | :--- | :--- |
| **CPI** | 800 | `tomkey_R.overlay` | 標準的な解像度 |
| **軸反転** | Y軸反転 | `tomkey_L.overlay` | `INPUT_TRANSFORM_Y_INVERT` |
| **スクロール倍率** | 1/16 | `tomkey_L.overlay` | `zip_xy_scaler 1 16` |
| **VSCROLL X減衰** | 1/16 | `tomkey_L.overlay` | `zip_x_scaler 1 16` (Layer 7時) |

## CPI 調整の経緯
初期 600 CPI から 800 CPI へ引き上げ、現代の高解像度ディスプレイでの操作感を最適化しました。

## overlay 構成
`trackball_listener` 内で以下のプロセッサを連結しています。
1. `zip_temp_layer` (AML制御: 100,000ms)
2. `scroll` ブロック (通常スクロール)
3. `scroll_v` ブロック (縦専用スクロール)
