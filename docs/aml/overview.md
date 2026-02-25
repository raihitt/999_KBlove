# AML運用ガイド（Stage別）

このドキュメントは入口です。AML依存設定は Stage 別ファイルで管理します。

## 固有値ポリシー

- `MOUSE` / `SCROLL` は `Tomkey` レイアウト依存の固有値として扱う
- AML切替先レイヤー（`zip_temp_layer 1 ...` の `1`）は `Tomkey` 定義を正とする
- `monokey` など他実装は、設定アイデアの参照に限定する

## 各 Stage の読み方

1. Stage 1（現行仕様と依存の事実確認）
   - `docs/aml/stage1_current_state.md`
2. Stage 2（改変ポイント整理）
   - `docs/aml/stage2_change_points.md`
3. Stage 3（実行手順）
   - `docs/aml/stage3_rebuild_steps.md`

## 既存運用上の要点

- AMLは `trackball_listener` の `zip_temp_layer` で制御する
- `MOUSE`（AML）と `SCROLL`（スクロール変換）の役割は分離維持する
- 挙動変更時は `keymap` だけでなく `overlay` / `conf` を同時確認する

## 参考（思想オリジナル）

- オリジナル参考: https://zenn.dev/kot149/articles/zmk-auto-mouse-layer
- 本リポジトリでは、上記思想を参照しつつ `Tomkey` 固有値（`MOUSE` / `SCROLL` / AML切替先レイヤー）を維持して適用する
