# keymap運用ガイド（2026-02 改訂版）

このディレクトリは、tomkey のキー配置と操作体験の最適化に関する資料を管理します。

## 📖 インデックス

日常の操作確認には **01** を、追加設定には **02** を参照してください。

1. **[01_Layer_and_Combo_Reference.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/01_Layer_and_Combo_Reference.md)**
   - 全レイヤーの機能、コンボ定義、および物理キーポジション対応図。
2. **[02_ZMK_Studio_JP_Symbols.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/02_ZMK_Studio_JP_Symbols.md)**
   - 日本語 Windows 環境で ZMK Studio を使う際の特殊記号対応表。
3. **[03_Future_Expansion.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/03_Future_Expansion.md)**
   - 将来的な拡張（編集キー系、記号系コンボ等）のアイデア集。
4. **[04_Refactoring_History.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/04_Refactoring_History.md)**
   - 2026年2月のリファクタリング（AML/Quick-tap/Combo実装）の背景と履歴。
5. **[05_Trackball_Settings.md](file:///Users/raihi/local_repo/999_KBlove/docs/keymap/05_Trackball_Settings.md)**
   - CPI、軸反転、スクロール倍率等のハードウェア的な固定設定。

---

## 💡 メンテナンスの原則

- 基本設定は `config/tomkey.keymap` を正とする。
- ZMK Studio は試行用に使用し、確定後は keymap ファイルへ転記する。
- 物理構造に変更があった場合は `01_Layer_and_Combo_Reference.md` のポジション図を更新すること。
