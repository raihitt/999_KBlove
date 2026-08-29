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

2026-08-19時点では、L3 central / R3 peripheral のローカルビルドとUF2生成まで確認済み。実機書き込み、左右接続、DYA Studio認識、runtime機能の動作は未確認。
