# ZYA / DYA Studio 対応ドキュメント

tomkey を [DYA Studio](https://studio.dya.cormoran.works/) に対応させるための作業ドキュメント群。

## ファイル構成

| ファイル | 内容 |
|---|---|
| [00_roadmap.md](./00_roadmap.md) | 変更ステップ一覧・具体的な diff・リスク整理 |
| [01_work_log.md](./01_work_log.md) | 作業ログ（日付ごとに追記） |
| [02_references.md](./02_references.md) | 参考記事・モジュール URL まとめ |

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
