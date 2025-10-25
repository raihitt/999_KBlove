# Project Context

## Purpose
- IRBANKに掲載されている日本株の財務指標をスクレイピングし、今年度を除く直近10期のデータを正規化してCSVとして出力するPythonスクリプトを提供する。
- 個人投資家やアナリストが定量分析に使えるクリーンな履歴データセットを迅速に生成できるようにする。
- セレクタの抽象化と軽量なバリデーションでIRBANKのレイアウト変更に耐える保守性を確保する。

## Tech Stack
- Python 3.9+
- pandas, requests, beautifulsoup4
- pytest（ユニット／統合テスト）
- argparseベースのCLI、loggingモジュール

## Project Conventions

### Code Style
- PEP 8準拠、4スペースインデント、公開関数へ型ヒントを付与する。
- snake_caseモジュール／関数、PascalCaseクラス、ALL_CAPS定数を遵守する。
- ロギングは`logging.getLogger(__name__)`を通して集中管理し、情報レベルとデバッグレベルを使い分ける。

### Architecture Patterns
- `irbank_scraper/src/` に実装、`irbank_scraper/tests/` にテストを配置し、同名モジュールでペアにする。
- CLI (`cli.py`) からパイプラインを起動し、フェッチ、パース、マージ、派生指標計算、永続化を関数分割する。
- HTTPセレクタは `selectors.py` に集約し、派生指標や単位変換は `metrics.py` などの専用モジュールへ切り出す。
- HTMLレスポンスは実行中のみメモリキャッシュし、ディスクキャッシュは明示設定がない限り使用しない。

### Testing Strategy
- pytestでセレクタ抽出、値の正規化、派生指標計算を単体テストし、録画HTMLフィクスチャで統合スモークテストを実施する。
- テストフィクスチャは `tests/fixtures/html/` に保存し、CIでは実際のIRBANKへアクセスしない。
- 計算モジュールで85%以上の行カバレッジを維持し、NaNやゼロ除算のハンドリングを検証する。

### Git Workflow
- 機能単位のブランチを切り、コミットサマリは60文字以内の命令形で記述する（例: `Add debt table selectors`）。
- PRでは関連スペックへの参照（例: `Refs: openspec/irbank-scraper/spec.md#L1`）とテスト実行結果、必要に応じたサンプルスクレイプの証跡を記録する。
- レビュー前にlint、pytest、サンプルスクレイプ（例: `python -m irbank_scraper.cli --stock-code 6758 --output data/irbank_6758.csv`）を通す。

## Domain Context
- IRBANKの年度別財務データを信頼できる形で収集し、予想値や四半期値を除外した確定年度のみを扱う。
- 金額はすべて円へ換算し、割合表記から`%`を外して数値化するなど、日本株特有の指標表現に対応する。
- 取得対象には売上高総利益率やROEなどの比率系に加え、売上債権やたな卸資産などの残高系指標が含まれる。
- 派生指標（キャッシュ・コンバージョン・サイクル等）は必要な元データが揃った場合のみ計算し、不足時は欠損として扱う。

## Important Constraints
- IRBANKのrobots.txtとレートリミットを順守し、指数バックオフと1〜2秒のジッターでアクセスする。
- CIや自動テストではネットワークアクセスを禁止し、録画済みHTMLのみを利用する。
- 欠損データやゼロ除算が発生した場合は例外ではなく警告／デバッグログで通知し、CSVでは空欄として出力する。
- 出力CSVはUTF-8、インデックス無しで保存し、必須カラムが欠ける場合は処理を中断する。

## External Dependencies
- IRBANK（https://irbank.net/）の公開ページ
- pandas、requests、beautifulsoup4 を含むPythonライブラリ群
- Python標準の`argparse`、`logging`、`functools`などのユーティリティ
