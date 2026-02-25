# `tomkey.keymap` 比較判断（`monokey` 参照）

対象:
- 現行: `config/tomkey.keymap`（ローカル確認日: 2026-02-24）
- 参照: `monokey.keymap`（取得日: 2026-02-24）

## 固有値ポリシー

- `MOUSE` と `SCROLL` は `Tomkey` レイアウト依存の固有値として扱う
- 他実装（`monokey` など）からレイヤー番号や役割を移植しない
- 比較参照は「操作アイデア」に限定し、レイヤー定義そのものは `tomkey` を正とする

## 反映候補（低リスク）

1. `&mt` / `&lt` の `quick-tap-ms = <300>` 導入
- 狙い: タップホールド境界の安定化
- 根拠: `monokey` L10-L15

2. `combos` で `SCROLL` 呼び出しと `MB3` 追加（`tomkey` のレイヤー番号維持）
- 狙い: 同時押しからのマウス操作導線を短縮
- 根拠: `monokey` L18-L29

3. `ARROW` レイヤーへの `sensor-bindings` 検証導入
- 狙い: レイヤー別スクロール/ページ移動の統一
- 根拠: `monokey` L84

## 保留（要検証）

1. レイヤー番号体系の変更（`#define MOUSE 4` など）
- 理由: `tomkey` 既存構成への影響が大きい
- 根拠: `tomkey` L19-L71 / `monokey` L6-L8

2. `default_layer` の全面置換
- 理由: 日常運用のタイピングへ直接影響する
- 根拠: `tomkey` L12-L15 / `monokey` L49-L53

3. `Bluetooth` / `layer_7`〜`11` の追加
- 理由: 現行 `layer_6` でBT運用済み。空レイヤー追加は優先度が低い
- 根拠: `tomkey` L64-L69 / `monokey` L105-L157
