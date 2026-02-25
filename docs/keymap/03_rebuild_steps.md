# keymap Stage 3: 再構築手順

## 手順0: 前提確認

1. 参照事実を確認する
- `docs/keymap/01_evidence.md`
2. 比較判断を確認する
- `docs/keymap/02_comparison.md`
3. AML依存を確認する
- `docs/aml/overview.md`（入口）
- `docs/aml/01_current_state.md`
- `docs/aml/02_change_points.md`
- `docs/aml/03_rebuild_steps.md`

## 手順1: 小さく試す

1. 変更対象を1つに絞る（例: `quick-tap-ms` のみ）
2. 変更内容を具体的にテキスト化する
- レイヤーとキー位置
- `Before -> After` の値の変化
- **変更による確認ポイント（Before/Afterで挙動がどう変わるべきか）**
- 変更しない範囲（影響を与えない範囲）
3. 固有値制約を固定する
- `MOUSE` / `SCROLL` は `Tomkey` レイアウト依存の固有値として変更しない

## 手順2: `tomkey.keymap` へ反映

1. `config/tomkey.keymap` に最小差分で反映
2. 反映時のチェック
- `default_layer` の主要配列を壊していない
- `MOUSE` / `SCROLL` の定義（番号・役割・配列方針）を変更していない
- `MOUSE` / `SCROLL` の `&trans` 整合が崩れていない
- `&lt` / `&mt` の置換ミスがない

## 手順3: 履歴化とビルド開始

1. 1コミット1目的で記録
2. コミットメッセージに次を含める
- 変更理由
- 影響レイヤー
- `Before -> After` の内容
- **変更確認ポイント（この変更で何が解決/変化するかの具体的な確認方法）**
3. `git push` して GitHub Actions のビルドを開始する

## 手順4: 動作検証（ビルド後）

1. Actions 完了後、最新の左右 `uf2` をダウンロードして更新
2. 実機で確認
- タップ/ホールド境界
- AML遷移との衝突有無
- マウスクリック/スクロール操作
