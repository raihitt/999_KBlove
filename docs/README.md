# Docs構成

## ディレクトリツリー

```text
docs/
├── roadmap/      # 変更方針・実施順序
├── aml/          # AML設定の Stage 資料（先行）
├── keymap/       # keymap反映の Stage 資料（後段）
├── zya_studio/   # ZYA / DYA Studio 対応ドキュメント
└── _archive/     # 旧版ドキュメント退避
```

## 推奨の読む順番

1. ロードマップ
- `docs/roadmap/roadmap.md`

2. AML（先行）
- 入口: `docs/aml/overview.md`
- Stage 1（現行仕様）: `docs/aml/01_current_state.md`
- Stage 2（改変ポイント）: `docs/aml/02_change_points.md`
- Stage 3（実行手順）: `docs/aml/03_rebuild_steps.md`

3. keymap（後段）
- 入口: `docs/keymap/overview.md`
- 01 レイヤー・コンボ・配置リファレンス: `docs/keymap/01_Layer_and_Combo_Reference.md`
- 02 ZMK Studio JP 記号表: `docs/keymap/02_ZMK_Studio_JP_Symbols.md`
- 03 将来の拡張案: `docs/keymap/03_Future_Expansion.md`
- 04 リファクタリング履歴: `docs/keymap/04_Refactoring_History.md`
- 05 トラックボール固定設定: `docs/keymap/05_Trackball_Settings.md`

## Archive

- 入口: `docs/_archive/README.md`

## ZYA / DYA Studio 対応

- 入口: `docs/zya_studio/README.md`
- ロードマップ: `docs/zya_studio/00_roadmap.md`
- 作業ログ: `docs/zya_studio/01_work_log.md`
- 参考資料: `docs/zya_studio/02_references.md`
