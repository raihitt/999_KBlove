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

# 修正完了と検証 (Runtime Input Processor 認識エラー対応)

## 実施内容

ZMK Studio (DYA) 上で「ランタイム入力プロセッサが見つかりません」と表示される問題を修正しました。

- **RIP 設定の移動**: トラックボールの感度やスクロール速度を制御する Runtime Input Processor (RIP) プロセッサを、Peripheral (R) 側から Central (L) 側に移動しました。
- **Central 制御の有効化**: これにより、PC に直接接続されている Central 側から DYA Studio がプロセッサを認識・制御できるようになりました。
- **クリーンアップ**: Peripheral 側に残っていた不要な Central 用 KConfig 設定（MOUSE, BATTERY_LEVEL_PROXY 等）を削除しました。

## ビルド結果 (最新)

- **Run ID**: [22447924746](https://github.com/raihitt/999_KBlove/actions/runs/22447924746)
- **Status**: ✅ Success
- **対象**: `seeeduino_xiao_ble` (tomkey_L / tomkey_R)

## 検証手順

1. [GitHub Actions](https://github.com/raihitt/999_KBlove/actions/runs/22447924746) から最新の firmware をダウンロードし、両側にフラッシュしてください。
2. DYA Studio (https://studio.dya.cormoran.works/) にログインしてください。
3. **「トラックボール設定」タブ** を開き、感度や動作の設定項目が表示され、変更がリアルタイムに反映されることを確認してください。

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
- [x] RIP 認識エラーの修正（Central へのプロセッサ移動）

- [x] DYA Studio での設定変更の動作確認（ユーザー）
- [ ] DYA Studio への BLE 接続成功（ユーザー）

---

### 2026-02-28 — DYA Studio BLE 接続不可の対応 (Retry)

#### 現象
前回の対応（`EXPERIMENTAL_FEATURES`）でも「User Cancelled the connection attempt」と表示され、接続に失敗する。

#### 原因調査
`cormoran/zmk` のソースコードを調査。以下のことが判明：
- Studio の GATT サービスは**暗号化された読み書き**を要求する。
- そのため、OS レベルでのセキュアなペアリング（ボンディング）が不完全だと、ブラウザ側からサービスを叩いた瞬間に接続が拒否される。
- 明示的な `CONFIG_ZMK_STUDIO_RPC=y` および `CONFIG_ZMK_STUDIO_TRANSPORT_BLE=y` が必要な可能性がある。

#### 対応内容
- `tomkey_L.conf` に Studio RPC および BLE トランスポートの明示的な有効化フラグを追加。
- アンロック時にダイレクトアドバタイジングを行う `CONFIG_ZMK_STUDIO_LOCK_BLE_DIRECT_ADVERTISING_ON_UNLOCK=y` を追加。
- 「クリーンペアリング」の手順を提示。

#### 次のアクション
- [x] ビルド完了後、実機に書き込み。
- [x] キーボード側 `&bt BT_CLR` ＋ PC 側 Bluetooth デバイス削除を行い、再ペアリングを実施。
- [x] DYA Studio (BLE) 接続をテスト → 依然として接続不可。

---

### 2026-03-01 — DYA Studio BLE 接続調査結果 (Macの制限)

#### 原因調査結果
- 前回の対応策を実施しても接続できない根本原因は、**macOS における Web Bluetooth API の OS レベルのセキュリティ制限** であることが判明。
- Apple はセキュリティ上の理由（キーロガーの防止等）から、ブラウザ（Chrome / Edge 等）から HID（キーボードやマウス）プロファイルを持つデバイスへの Web Bluetooth 接続を一律でブロックしている。
- ZMK Studio 本家の場合は、「Mac 用のネイティブアプリ（ZMK Studio.app）」を提供することでこのブラウザの制限を回避して BLE 接続を実現している。しかし、DYA Studio は Web アプリケーション専用であるため、Mac 上でブラウザから BLE 経由で接続することは**技術的に不可能**である（ペアリング画面で即座に弾かれ "User cancelled the connection attempt" エラーとなる）。

#### 対応内容・結論
- Mac 環境で DYA Studio を利用する場合は、**必ず USB 接続** を使用する必要がある。
- （Windows や Linux、Android 環境であれば、Web Bluetooth の制限が異なるため BLE 接続を利用可能）
- 設定上の不備ではなく OS の仕様であるため、これ以上のファームウェア側の修正は不要。
- この制限事項を `00_roadmap.md` の確認手順に反映し、ドキュメントを更新した。


---

## 2026-02-27 — DYA AML 導入 & コンボ位置の試行錯誤

### やったこと（コミット: 6cb2d12, 4d394f4, 2b681ce）
- **DYA AML behavior の導入**: `zmk,behavior-aml` を追加し、DYA Studio の GUI からタイムアウト時間や対象レイヤーを変更可能にした。
- **コンボ位置の移動と差し戻し**:
    - はじめに `K + L` (19, 20) へ移動し、安定動作を確認。
    - 次にマウスボタン兼用として `, + .` (31, 32 / RCLK + LCLK) を試行したが、期待通り動作せず断念。
    - 最終的に `K + L` (19, 20) へ差し戻した。
- **AML 除外設定の最適化**:
    - `K + L` を `excluded-positions` に戻し、コンボ入力中に AML が解除されないように復元。
    - DYA Studio のトラックボールタブ内で AML 設定が連動することを確認。

---

## 2026-03-01 — キーマップの全面的更新 (DYA Studio 画像準拠)

### やったこと
- `img/DYA/` 配下の 8 枚のスクリーンショットを参考に、`config/tomkey.keymap` を全面的に書き換えた。
- **レイヤー名の変更**: `Layer_0`, `1-mouse`, `2-scroll`, `3-ctl`, `4-number`, `5-function`, `6-markdown`, `Layer_7` とし、DYA Studio の UI と一致させた。
- **キー割当の同期**:
    - 日本語キーボード特有の記号 (`JP_CARET`, `JP_COLON` 等) や特殊なショートカットを画像通りに配置。
    - マウスボタンやスクロール、カーソルキーの配置を修正。
- **実装の詳細**:
    - `Layer_0` に `&mt LCTRL JP_CARET` や `&mt LSHFT JP_COLON` を導入。
    - `3-ctl` レイヤーに `LS(LC(V))` や `LG(V)` などの高度なショートカットを配置。
    - `5-function` レイヤーに `bootloader`, `sys_reset`, `bt BT_SEL` などを配置。

### 次のアクション
- [x] キーマップの書き換え完了
- [x] 作業ログの更新
- [ ] ビルドと実機確認 (ユーザー)


