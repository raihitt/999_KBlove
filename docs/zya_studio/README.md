# ZYA / DYA Studio 対応ドキュメント

tomkey を [DYA Studio](https://studio.dya.cormoran.works/) に対応させるための作業ドキュメント群。

## ファイル構成

| ファイル | 内容 |
|---|---|
| [00_roadmap.md](./00_roadmap.md) | 変更ステップ一覧・具体的な diff・リスク整理 |
| [01_work_log.md](./01_work_log.md) | 作業ログ（日付ごとに追記） |
| [02_references.md](./02_references.md) | 参考記事・モジュール URL まとめ |
| [03_level_3_experiment.md](./03_level_3_experiment.md) | PR #4相当の実験manifest・ローカルビルド・切り戻し手順 |

## ステータス

| STEP | 内容 | 状態 |
|---|---|---|
| 1 | `west.yml` 書き換え（cormoran ZMK + モジュール追加） | ✅ 完了 |
| 2 | `.github/workflows/build.yml` 更新 | ✅ 完了 |
| 3 | `.conf` ファイルへ Kconfig 追加（Central / Peripheral） | ✅ 完了 |
| 4 | `tomkey_R.overlay` トラックボール listener 移植 | ✅ 完了 |
| 5 | `tomkey_L.overlay` include 追加 | ✅ 完了 |
| 6 | `tomkey.keymap` へ `&studio_unlock` 追加 | ✅ 完了 |
| 7 | ビルド & 書き込み | ✅ 完了 |
| 8 | DYA Studio 接続確認 | ✅ 完了 |

### Level 3（実験中）

`runtime-combo`を含むPR #4相当の機能は、安定経路とは別manifestで検証する。
実ビルドと実機確認が完了するまでは、通常の`config/west.yml`へ統合しない。

ローカルビルドは`./scripts/dya-local-build.sh`で実行する。DYA Studioへ設定を保存するには、通常の`xiao_ble`ではなくZMKバリアント`xiao_ble//zmk`が必要である。スクリプトはこの指定を固定し、NVS設定を含む次の3ファイルを生成する。

- `settings_reset-seeeduino_xiao_ble-zmk.uf2`: 設定消去専用。必要な場合だけ一度使用する
- `tomkey_L3-tom_oled-seeeduino_xiao_ble-zmk.uf2`: 左手Central
- `tomkey_R3-tom_oled-seeeduino_xiao_ble-zmk.uf2`: 右手Peripheral

Level 3は安定版と異なり、左右とも`tom_oled`表示を使う。安定版の`dongle_display`にあった左右アイコンや配置が表示されない場合があるが、これは表示構成の差分であり、runtime Combo対応の有無とは別である。右手側では`CONN OK`を左右接続の確認材料にする。PMW3610は水平移動を含め安定版と同じ外部ドライバーへ揃えている。

設定保存・左右接続・DYA Studio認識・runtime機能・LCD表示は実機で段階確認する。問題が出た場合はLevel 3の3ファイルを再適用する前に、安定版Actionの成功成果物へ戻せるよう、下記の切り戻し手順を使う。
