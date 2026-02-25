# AML Stage 2: 改変ポイント

前提:
- `MOUSE` / `SCROLL` と AML切替先レイヤー番号は `Tomkey` 固有値として維持する

設計参考:
- オリジナル思想: https://zenn.dev/kot149/articles/zmk-auto-mouse-layer

## 反映候補（低リスク）

1. タイムアウト調整
- 対象: `tomkey_L.overlay`
- 変更: `zip_temp_layer 1 400` の `400` を調整
- 例: `700`（やや長め）、`10000`（マウス操作中心）

2. 誤爆防止（アイドル要件）
- 対象: `tomkey_L.overlay`
- 変更: `&zip_temp_layer` に `require-prior-idle-ms` を追加

```dts
&zip_temp_layer {
    require-prior-idle-ms = <200>;
};
```

3. クリック継続性改善
- 対象: `config/tomkey.keymap`
- 変更: `&mkp_input_listener` に `zip_temp_layer` を追加

```dts
#include <input/processors.dtsi>

&mkp_input_listener {
    input-processors = <&zip_temp_layer 1 10000>;
};
```

## 保留（要検証）

1. 非マウスキー押下でAML解除
- 対象: `tomkey_L.overlay`
- 変更: `excluded-positions` を追加
- 注意: 位置番号は `Tomkey` 配列依存で誤設定リスクが高い

```dts
&zip_temp_layer {
    excluded-positions = <
        /* AML継続を許可するキー位置 */
    >;
};
```

2. PMW3610側AMLへの方式変更
- Input Processor方式（現行）との混在を避ける
- 方式変更時は `.overlay` / `.conf` を同時に設計し直す

## 変更対象ファイル

- `config/boards/shields/tomkey/tomkey_L.overlay`
- `config/tomkey.keymap`
- （方式変更時）`config/boards/shields/tomkey/tomkey_R.overlay`
- （方式変更時）`config/boards/shields/tomkey/tomkey_R.conf`
