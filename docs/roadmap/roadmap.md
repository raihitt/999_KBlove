# ZMKコンフィグ変更ロードマップ（低リスク段階適用）

## 目的

- いきなり `keymap` は触らず、AML関連設定から段階的に改善する
- 変更影響度が小さい項目から順に適用し、毎ステップで `git` 差分確認を行う
- 実機確認を挟みながら、安全に `tomkey` へ反映する
- AML思想の参考: https://zenn.dev/kot149/articles/zmk-auto-mouse-layer

## 前提

- 起点は `pukuhei/tomkey:main` を Fork した直後の構成
- `Tomkey` 固有値（`MOUSE` / `SCROLL` / AML切替先レイヤー）は維持する
- 1変更1目的を徹底し、変更単位を小さく保つ

## 全体方針

1. AMLの設定変更を先行する（`keymap` 変更は後段）
2. 影響度の小さい順に適用する
3. 各ステップで以下を必ず実施する
- `git diff -- <対象ファイル>` で差分確認
- 必要最小限の実機確認
- 問題なければコミットし、次ステップへ進む

## フェーズ0: ベースライン固定

1. 参照資料を固定する
- `docs/aml/stage1_current_state.md`
- `docs/aml/stage2_change_points.md`
- `docs/aml/stage3_rebuild_steps.md`
- `docs/keymap/stage1_monokey_evidence.md`

2. 作業前の状態を記録する
- `git status`
- `git log --oneline -n 5`

## フェーズ1: AML低リスク設定の段階適用（keymap非変更）

1. ステップ1（最小影響）: タイムアウト系の微調整
- 例: `zip_temp_layer` の待ち時間調整
- 期待効果: レイヤー遷移の体感改善
- 確認: AML遷移の違和感有無

2. ステップ2（小影響）: 誤爆防止設定
- 例: `require-prior-idle-ms` の導入/調整
- 期待効果: 意図しない遷移の削減
- 確認: 通常タイピング時の誤遷移率

3. ステップ3（中影響だが局所）: 入力継続性改善
- 例: `mkp_input_listener` 関連調整
- 期待効果: クリック・移動継続時の安定化
- 確認: マウス/スクロール継続操作

4. 各ステップ共通のgit確認手順
- 変更: `git add -p`
- 差分確認: `git diff --staged`
- 記録: `git commit -m "aml: <step名>"`

## フェーズ2: AML全体整合チェック（まだkeymap非変更）

1. `overlay` / `conf` 間の矛盾確認
- AML有効条件、レイヤー遷移先、入力系設定の整合を確認

2. 実機確認を再実施
- タイピング
- AML遷移
- マウス/スクロール

3. 問題があればフェーズ1へ戻し、差分を最小単位で再調整

## フェーズ3: keymap反映（最後に実施）

1. `docs/keymap/stage3_rebuild_steps.md` に沿って適用
- AMLで確定した挙動を前提に、必要最小限だけ `config/tomkey.keymap` を更新

2. 反映単位を小さく分割
- 対象キー・レイヤーごとに `before -> after` を明記
- 1変更ごとに `git diff` / 実機確認 / コミット

3. 最終確認
- AML依存設定との矛盾がないこと
- 日常入力での回帰がないこと

## 運用ルール

1. 優先順は「AML低リスク設定」→「AML整合」→「keymap反映」
2. `keymap` 先行変更は禁止（緊急修正を除く）
3. 変更記録は Stage1（事実）→ Stage2（判断）→ Stage3（実行）で残す
4. `Tomkey` 固有値に触る変更は必ず明示レビューする
