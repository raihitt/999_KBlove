# ZYA Studio 対応 作業ログ

---

## 2026-02-26 — 調査・計画フェーズ

### やったこと
- 参考記事を調査し、tomkey 固有の対応差分を整理した
  - [Compatible DYAStudio (RaZiLy)](https://note.com/razily/n/n7a23e5a7512c)
  - [moNa2編 (heace)](https://note.com/heace/n/nf06b797ffa79)
  - [zmk-keyboard-dya2 (cormoran)](https://github.com/cormoran/zmk-keyboard-dya2)
- `00_roadmap.md` を作成し、STEP 1〜8 の変更手順を策定

### 確認した現状スナップショット

| ファイル | 現状の重要設定 |
|---|---|
| `config/west.yml` | `zmkfirmware/zmk @ v0.3`、モジュール: pmw3610, dongle-display のみ |
| `tomkey_L.conf` | Central。`STUDIO=y` / `LOCKING=n` のみ。DYA モジュールなし |
| `tomkey_R.conf` | Peripheral。`STUDIO=y` / `LOCKING=n`。PMW3610 設定あり |
| `tomkey_L.overlay` | `trackball_listener` を Central で定義（AML / scroll / scroll_v） |
| `tomkey_R.overlay` | `trackball` (PMW3610 実デバイス) / `trackball_split` を定義 |
| `tomkey.keymap` | `&studio_unlock` なし。include に DYA Studio 系なし |
| `.github/workflows/build.yml` | `zmkfirmware/zmk@v0.3` 参照 |

### 気づいた tomkey 固有の注意点

- tomkey は **左 (L) = Central / 右 (R) = Peripheral**（moNa2 とは L/R 逆）
- `trackball_listener` が Central (L) overlay にある → Peripheral (R) overlay に移す必要あり
- 現状の AML は `&zip_temp_layer`（ZMK 標準機能）。DYA Studio の AML とは別物
- `zmk-dongle-display` (te9no) が cormoran ZMK と互換かは未確認

### 次のアクション
→ `00_roadmap.md` の STEP 1（`west.yml` 書き換え）から着手予定

---

## 2026-02-26 — 実装フェーズ

### やったこと（コミット: fc6c429）

| ファイル | 変更内容 |
|---|---|
| `config/west.yml` | cormoran fork (v0.3-branch+dya) に変更 / DYA モジュール4本追加 |
| `.github/workflows/build.yml` | cormoran ワークフローに切り替え |
| `tomkey_L.conf` | DYA Studio Central 用 Kconfig 追加（BLE管理・バッテリー履歴・Settings RPC・runtime-input-processor・フリーズ対策）/ LOCKING n→y |
| `tomkey_R.conf` | DYA Studio Peripheral 用 Kconfig 追加（バッテリー履歴・Settings RPC・Splitリレー）/ LOCKING n→y |
| `tomkey.keymap` | DYA include 3本追加 / `&studio_unlock` を layer_6 の BT_PRV と差し替え |
| `tomkey_R.overlay` | `trackball_listener` を `runtime-input-processor` 方式に移植（scroller は layer 2） |
| `tomkey_L.overlay` | DYA Studio include 追加・コメント整理 |

### 次のアクション
- [x] GitHub Actions のビルド成功を確認
- [x] 実機書き込み完了
- [x] DYA Studio 接続成功（アンロック完了）

---

## 2026-02-26 — 最終確認・トラブルシューティング

### やったこと（コミット: 2b4fd54）
- `tomkey_R.overlay` の修正
  - ZYA対応時に誤って削除されていた `&trackball` の有効化ブロック（`status = "okay"`）を復元。
  - ビルドエラー `__device_dts_ord_157 undeclared` を解消。
- DYA Studio への接続
  - `&studio_unlock` キー（Layer 6 + Y）により、Studio のアンロックに成功。
  - 正常にログインできることを確認。

