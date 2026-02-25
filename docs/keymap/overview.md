# keymap運用ガイド（Stage別）

このドキュメントは入口です。詳細は Stage ごとのファイルを参照してください。

## 結論

- 恒久変更は `config/tomkey.keymap` に反映して管理する
- ZMK Studio は試行用、確定後に keymap へ転記する
- 変更時は AML 関連の `overlay` / `conf` 依存も確認する
- `MOUSE` / `SCROLL` は `Tomkey` レイアウト依存の固有値として扱う

1. Stage 1（参照の事実確認）: `docs/keymap/01_evidence.md`
2. Stage 2（現行との差分判断）: `docs/keymap/02_comparison.md`
3. Stage 3（実行手順）: `docs/keymap/03_rebuild_steps.md`
4. レイヤー構成: [05_layer_functions.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/05_layer_functions.md)
5. 将来の拡張案: [06_future_ideas.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/06_future_ideas.md)

## AML前提の確認
- 入口: `docs/aml/overview.md`

## 使い分け早見表

| 観点 | `config/tomkey.keymap` 編集 | ZMK Studio 編集 |
|---|---|---|
| 変更履歴（Git） | 残しやすい | 残りにくい |
| 再現性（別PC/将来） | 高い | 低め（運用依存） |
| 試行速度 | 低〜中 | 高い |
| 大きな構成変更（レイヤー設計） | 向いている | 向いていないことがある |
| 緊急の一時変更 | 手間がかかる | 向いている |
