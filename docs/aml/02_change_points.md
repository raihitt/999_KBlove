# AML Stage 2: 改変ポイント（Conductor思想反映版）

前提:
- `MOUSE` / `SCROLL` と AML切替先レイヤー番号は `Tomkey` 固有値として維持する
- マウスクリック位置等については `zmkstudio` で調整後の最新構成（後日共有）を基に実装する

設計参考:
- オリジナル思想: https://zenn.dev/kot149/articles/zmk-auto-mouse-layer
- 大幅参考（Conductor）: https://github.com/pite1222/conductor

## 新しいAMLパラダイムの提案（Conductor思想のTomkey移植）

Conductor の実装分析から、「短いタイムアウトで自動解除する」従来の方式から、**「長いタイムアウトで維持し、タイピングを始めた瞬間に即解除する」方式へのパラダイムシフト**を提案します。

### 1. タイムアウトの極大化（操作的ゆとりの確保）
- 概要: AMLのタイムアウトを 400ms から 100秒 (100000ms) など極端に長くします。これにより、トラックボールから手を離して画面を読んでいる間もAMLが維持され、「クリックしようとしたら解除されていた」というストレスを解消します。
- 変更ファイル: `tomkey_L.overlay`
- 変更箇所: `input-processors = <&zip_temp_layer 1 100000>;`

### 2. 非マウスキー押下での即時AML解除（シームレスな移行）
- 概要: タイムアウトを長くする代わりに、**「マウス操作に関するキー（クリックやスクロール等）」以外のキーを押した瞬間にAMLを強制解除**します。これにより、マウスポインタ操作からタイピングへ移行する際に遅延がゼロになります。
- 変更ファイル: `tomkey_L.overlay`
- 変更箇所: `&zip_temp_layer` に `excluded-positions` を追加
- 制約・リスク:
  - ここには**AMLを維持したいキーの物理位置（マトリクス番号）**をハードコードします。（例: MB1, MB2, MO(SCROLL) など）
  - **【重要】** `zmkstudio` でマウスクリックの割り当て位置を変更した場合、こちらの `.overlay` の数値も合わせて変更し、ファームウェアを再ビルドする必要があります（設定の二重管理）。

```dts
&zip_temp_layer {
    /* マウス関連キーのみAMLを維持。それ以外のキーで即時解除 */
    /* ※ 下記は仮の番号。zmkstudioでの調整完了後に正式な番号を設定する */
    excluded-positions = <19 36 37 38>;
};
```

### 3. タイピング中の誤爆防止（アイドル要件）
- 概要: キーボードでタイピングしている最中に、意図せず手がトラックボールに触れてAMLが発動してしまうのを防ぎます。
- 変更ファイル: `tomkey_L.overlay`
- 変更箇所: `&zip_temp_layer` に `require-prior-idle-ms` を追加し、「最後のキー入力から一定時間経っていないとAMLを発動しない」ようにします。

```dts
&zip_temp_layer {
    require-prior-idle-ms = <400>; /* 400msはConductor準拠 */
};
```

## 変更対象ファイルまとめ

- `config/boards/shields/tomkey/tomkey_L.overlay`
  - `zip_temp_layer` のタイムアウト延長
  - `excluded-positions` の追加（zmkstudio調整完了後）
  - `require-prior-idle-ms` の追加
- `config/tomkey.keymap`
  - ※ 基本的には変更不要（コンボ等を追加する場合は適宜）
