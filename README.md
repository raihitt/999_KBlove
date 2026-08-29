## 概要
- このキーボードは無線分割式 40% 19mm トラックボール内蔵のキーボードになります。
  ![tomkey keyboard](img/tomkeyimg.png)

## ビルドガイド
- `build_guide/build_guide.md`

## ZMKファーム更新（要点）

- 詳細手順: `build_guide/build_guide.md` の「ZMKファームウェア更新手順」
- 基本フロー
  1. フォーク先へ設定変更を push
  2. GitHub Actions の成功したビルド成果物(zip)を取得
  3. 左右のマイコンをそれぞれリセット 2 回でブートローダーモードにする
  4. 左右それぞれ対応する `uf2` をコピーして再起動を待つ
- 使用する `uf2`
  - 初期化: `settings_reset-seeeduino_xiao_ble-zmk.uf2`
  - 左手: `tomkey_L dongle_display-seeeduino_xiao_ble-zmk.uf2`
  - 右手: `tomkey_R-seeeduino_xiao_ble-zmk.uf2`

## コンフィグ変更ガイド（推奨フロー）

- 変更計画の起点: `docs/roadmap/roadmap.md`
- 基本方針
  1. いきなり `keymap` は触らない
  2. 先に AML 設定を低リスク項目から段階適用する
  3. 各ステップで `git diff` と実機確認を行う
  4. AML の整合確認後に `keymap` 反映へ進む
- 詳細ドキュメント
  - `docs/README.md`
  - `docs/aml/README.md`
  - `docs/keymap/README.md`

## スペック
- ファームウェア
  - ZMK を使用しています
  - ZMKStudio に対応しております
- ハードウェア
  - 43 キー
  - choc v1/v2、lofree 系列のスイッチが使用可能
  - 左手側が master,右手側が slave になります
  - 左手側に OLED 内蔵
  - トラックボールはケースごとマグネットで張り付いているので、脱着可能です
  - バッテリー対応 2 つ必要です
    - 横 25mm,縦 35mm,厚さ 5mm 以内のものを使用してください
    - 製作者はこちらを使用しています(https://amzn.asia/d/ebvtzoP)。250mAh で大体 1 週間は持ちます(1 日 5 時間使用くらい)
    - リチウムイオンバッテリーは十分注意して取り扱ってください(https://www.baj.or.jp/battery/safety/safety16.html)
    - 市販のバッテリーの極性が個体によって異なる例が確認されておりますので、極性には気をつけてご利用ください。tomkey では赤色を+極として作成しております

## 電源および充電について
※ご自身で購入したバッテリーによっては極性が逆になっている可能性がありますので、十分にご確認の上で接続をお願いいたします！(表記と端子が逆の事例もありました)
- スイッチを ON にしている状態で USB に接続することで充電されます。充電しながらの使用も可能です
- スイッチが OFF の状態で USB を接続すると USB からの給電で使用できますが、OFF の状態ではバッテリーに充電はされません
  - 安全上意図的にバッテリー ON 状態でないと充電されない仕様になっております
- バッテリー残量に関しては oled 上に表示されるようになっております
  - 上側が左手のバッテリー残量
  - 下側が右手のバッテリー残量

## OLED の切り替えについて

- デフォルトでは us 配列の mac に適した配置になっております
- また oled も mac に併せてありますので、windows の方は以下の設定を n に指定することで表示が切り替わります
- config/boards/shields/tomkey/tomkey_L.conf
- `CONFIG_ZMK_DONGLE_DISPLAY_MAC_MODIFIERS=n`にする

## DYA Studio について

- DYA Studio は [https://studio.dya.cormoran.works/](https://studio.dya.cormoran.works/) から利用できます
- tomkey では左手 `tomkey_L` が Central、右手 `tomkey_R` が Peripheral です
- 有線でDYA Studioを使う場合は、左手Central側をUSBでPCに接続してください
- macOSではDYA StudioのBLE接続を使わず、USB接続を使用してください
- Level 3の実験機能は `docs/zya_studio/03_level_3_experiment.md` に分離しています
- ローカルFWビルドは `./scripts/dya-local-build.sh` で行えます
- GitHub Actions の `Build DYA Studio Level 3 firmware` から、従来の書き込み手順で扱えるLevel 3用の設定リセット・左手Central・右手PeripheralのUF2を取得できます
- 注意: `settings_reset-seeeduino_xiao_ble-zmk.uf2` は設定消去専用で、DYAマクロ／コンボ機能は含みません。機能確認時は、Level 3用の左手・右手UF2を両方書き込んでください
- 安定版へ戻す場合は、`Build ZMK firmware`の最後に成功した成果物を使用してください（詳細は `docs/zya_studio/03_level_3_experiment.md`）

## キーマップについて

- 変更着手前に `docs/roadmap/roadmap.md` を確認してください
- `keymap` 編集は AML 設定の段階適用・整合確認が完了してから実施してください
- ZMKstudio にて確認・編集を行なってください

  - https://zmk.studio/

- ZMK keymap-editor も使用できます
  - マクロ設定などを使いたい場合はこちらを使うとべんりです
  - https://nickcoutsos.github.io/keymap-editor
  - ご使用の時は本リポジトリをフォークしてお使いください
    - ※フォークしてマクロ等にパスワードなどを設定する際はリポジトリが public になってしまい情報漏洩につながりますのでご注意ください

### レイヤーマップ

- レイヤー 0 がデフォルトです
- レイヤー 1 がオートマウスレイヤーです
  - トラックボール操作中に切り替わるレイヤーです(400ms でレイヤー０に切り替わります)
- レイヤー 2 がスクロールレイヤーです
  ![tomkey layer0](img/layer0.png)
  ![tomkey layer1](img/layer1.png)
  ![tomkey layer2](img/layer2.png)
  ![tomkey layer3](img/layer3.png)
  ![tomkey layer4](img/layer4.png)
  ![tomkey layer5](img/layer5.png)
  ![tomkey layer6](img/layer6.png)

## その他

不明な点がある場合は下記アカウントにご連絡ください
https://x.com/tomcat09131
