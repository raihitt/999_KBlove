# 参考資料まとめ

## 公式・主要リポジトリ

| 名前 | URL | 用途 |
|---|---|---|
| DYA Studio | https://studio.dya.cormoran.works/ | Web キーマップエディタ本体 |
| cormoran/zmk | https://github.com/cormoran/zmk (branch: `v0.3-branch+dya`) | カスタム ZMK フォーク |
| zmk-keyboard-dya2 | https://github.com/cormoran/zmk-keyboard-dya2 | DYA2 参考実装（conductor使用） |
| conductor | https://github.com/t-ogura/conductor | ユーティリティツール |

## DYA Studio モジュール（すべて cormoran リポジトリ）

| モジュール | URL | 機能 |
|---|---|---|
| zmk-module-runtime-input-processor | https://github.com/cormoran/zmk-module-runtime-input-processor | トラックボール設定の動的変更 |
| zmk-module-ble-management | https://github.com/cormoran/zmk-module-ble-management | BLE 管理 |
| zmk-module-battery-history | https://github.com/cormoran/zmk-module-battery-history | バッテリー履歴 |
| zmk-module-settings-rpc | https://github.com/cormoran/zmk-module-settings-rpc | アイドル/スリープ設定 |
| zmk-behavior-runtime-sensor-rotate | https://github.com/cormoran/zmk-behavior-runtime-sensor-rotate | エンコーダー動的設定（任意） |

## 参考記事

| タイトル | URL | 著者 | 概要 |
|---|---|---|---|
| Compatible DYAStudio | https://note.com/razily/n/n7a23e5a7512c | RaZiLy | 汎用対応ガイド。west.yml・conf・overlay の具体的な設定を網羅 |
| DYA Studioを導入してみるぞ！moNa2編 | https://note.com/heace/n/nf06b797ffa79 | heace | moNa2 実例。Central/Peripheral の conf・listener 移植手順が詳細 |
| (追記記事) | https://note.com/heace/n/n4cbf41ef1c57 | heace | moNa2 追記 |

## 既存ドライバー

| モジュール | URL | 用途 |
|---|---|---|
| zmk-pmw3610-driver | https://github.com/badjeff/zmk-pmw3610-driver (branch: `zmk-0.3`) | PMW3610 トラックボールドライバー |
| zmk-dongle-display | https://github.com/te9no/zmk-dongle-display | OLED ドングルディスプレイ |
