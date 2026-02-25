# トラックボール（マウス）速度の調整に関する提案

## 背景と課題
現在のTomkey標準の構成では、トラックボール（マウスカーソル）の移動速度が早すぎると感じることがありました。
原因調査のため、本番構成と過去のアーカイブ構成（`_archive` や `config_new` 参照元）を比較・調査しました。

## 調査結果

1. **_archive（レガシー環境: `legacy/old_KB-love`）の調査**
   過去の設定ファイル `_archive/legacy/old_KB-love/config/boards/shields/tomkey/tomkey_R.overlay` を確認したところ、トラックボールの速度設定（`cpi`）として明示的に `400` が指定されていました。

   ```dts
   &trackball {
       status = "okay";
       irq-gpios = <&gpio0 2 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>;
       cpi = <400>; // ← 過去の設定値は400
       evt-type = <INPUT_EV_REL>;
       x-input-code = <INPUT_REL_X>;
       y-input-code = <INPUT_REL_Y>;
   };
   ```

2. **現在の設定（`config/boards/shields/tomkey/tomkey_R.overlay`）の調査**
   現在の標準的なTomkey構成では、該当箇所に `cpi` のパラメーター指定が存在しません。
   PixArt PMW3610などのトラックボールセンサーでは、指定がない場合のデフォルトのCPI値がより高い値（例: 1600や800等）になるため、以前の環境よりも相対的にマウス速度が早すぎる状態になっていました。

   ```dts
   &trackball {
       status = "okay";
       irq-gpios = <&gpio0 2 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>;
       evt-type = <INPUT_EV_REL>;
       x-input-code = <INPUT_REL_X>;
       y-input-code = <INPUT_REL_Y>;
   };
   ```
   ※なお、同一ファイル内の `trackball: pd@0` ノード内には `cpi = <1600>;` の記載がありますが、実際にポインティングデバイスとして機能する下部の `&trackball` 側には値が設定されていない/上書きされていない状態でした。

## 解決策の提案

扱い慣れた元の速度に戻すため、現在の本番環境 `config/boards/shields/tomkey/tomkey_R.overlay` に対して `cpi = <400>;` の設定を追加・付与することを提案します。

### 変更点
`config/boards/shields/tomkey/tomkey_R.overlay` を以下の通り修正します。

```diff
 &trackball {
     status = "okay";
 	  irq-gpios = <&gpio0 2 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>;
+    cpi = <400>;
     evt-type = <INPUT_EV_REL>;
     x-input-code = <INPUT_REL_X>;
     y-input-code = <INPUT_REL_Y>;
 };
```

これにより、以前の動作感覚（CPI: 400）に合わせた直感的なマウス速度に戻すことが可能です。
