## 1. Implementation
- [ ] 1.0 `openspec/irbank-scraper/references.md`に記載された指標ページURLを確認し、エンドポイント定義に反映する。
- [ ] 1.1 プロジェクト構造と依存関係ファイル（`irbank_scraper/src`, `requirements.txt`, CLIエントリポイント）を整備する。
- [ ] 1.2 IRBANKページ取得のHTTPクライアントを実装し、指数バックオフ・カスタムヘッダ・メモリキャッシュを組み込む。
- [ ] 1.3 HTMLパーサとセレクタモジュールを用意し、年度フィルタリングと単位変換ロジックを実装する。
- [ ] 1.4 取得データのマージ、派生指標計算、CSV永続化パイプラインを構築する。
- [ ] 1.5 CLIオプション（`--stock-code`, `--output`, `--timeout` 等）と`run_pipeline` APIを実装する。

## 2. Quality
- [ ] 2.1 録画HTMLフィクスチャを追加し、セレクタ・正規化・派生指標計算のpytestを作成する。
- [ ] 2.2 サンプル銘柄（例: 6758）での統合スモークテストとCSVスキーマ検証を追加する。
- [ ] 2.3 READMEや開発手順、テスト実行例を整備する。
