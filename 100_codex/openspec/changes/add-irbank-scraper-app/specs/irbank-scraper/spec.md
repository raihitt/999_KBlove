## ADDED Requirements

### Requirement: Fetch IRBANK Metrics
IRBANKの公開ページから対象銘柄の財務データを信頼性高く取得しなければならない (MUST)。

#### Scenario: Retry with backoff
- **GIVEN** IRBANKの`results`, `profitability`, `efficiency`など各カテゴリのURL
- **WHEN** HTTPリクエストを送信する
- **THEN** カスタムUser-Agentを付与し、指数バックオフと1〜2秒のジッター付きで最大リトライ回数まで再試行する

#### Scenario: Follow documented endpoints
- **WHEN** スクリプトで各指標ページを参照する
- **THEN** `openspec/irbank-scraper/references.md`に記載されたURLを基準にエンドポイントを構成する

#### Scenario: Respect robots and caching
- **WHEN** ページを連続取得する
- **THEN** robots.txtに反しない頻度でアクセスし、同一URLはプロセス内キャッシュを用いて重複リクエストを避ける

### Requirement: Normalize Annual Data
取得した年度別財務データを整形し、今年度を除外した最新10期分の正規化テーブルを生成しなければならない (MUST)。

#### Scenario: Filter confirmed fiscal years
- **WHEN** テーブルに予想行や四半期行が含まれている
- **THEN** 確定済み年度のみを抽出し、西暦キーに正規化する

#### Scenario: Merge datasets
- **GIVEN** results, efficiency, safetyなど複数データセット
- **WHEN** 年度をキーにDataFrameへ結合する
- **THEN** 定義済みカラム順に整列し、今年度を除外した最新10期分に切り詰める

#### Scenario: Handle missing tables
- **WHEN** 想定テーブルやカラムが存在しない
- **THEN** 警告ログを出して該当指標を`None`として扱い、処理は継続する

### Requirement: Normalize Units and Values
IRBANK独自の単位表現やフォーマットを統一的に数値化しなければならない (MUST)。

#### Scenario: Convert monetary units
- **GIVEN** `兆円`, `億円`, `百万円`, `千円`, `円` の値
- **WHEN** 単位を解析する
- **THEN** すべて円単位の浮動小数に変換する

#### Scenario: Parse percentages and negatives
- **WHEN** `%`付き割合や括弧付きマイナスが提供される
- **THEN** `%`を除去し、符号を保持した数値として保存する

### Requirement: Compute Derived Metrics
取得データから派生指標を計算し、必要データが欠落する場合は安全にスキップしなければならない (MUST)。

#### Scenario: Calculate cash conversion cycle
- **GIVEN** 売上債権、たな卸資産、仕入債務、売上高、売上原価が揃っている
- **WHEN** 派生指標を計算する
- **THEN** 売上債権回転期間、仕入債務回転期間、たな卸資産回転期間、キャッシュ・コンバージョン・サイクルを算出する

#### Scenario: Avoid zero division
- **WHEN** 必要な分母が0または欠損
- **THEN** 派生指標は`None`を返し、警告ログを残す

### Requirement: Export Data via CLI
利用者がCLIやモジュールAPIからスクレイピングパイプラインを実行できるようにしなければならない (MUST)。

#### Scenario: Run pipeline CLI
- **GIVEN** `python -m irbank_scraper.cli --stock-code 6758 --output data/irbank_6758.csv`
- **WHEN** コマンドを実行する
- **THEN** 正規化済みCSVをUTF-8・インデックス無しで保存し、成功ログをINFOレベルで出力する

#### Scenario: Provide run_pipeline API
- **WHEN** 他モジュールから`run_pipeline(stock_code, output_path)`を呼び出す
- **THEN** DataFrameを返しつつ、指定パスへCSVを保存する

### Requirement: Offline Testability
CI環境でIRBANKへ接続せずに仕様が検証できなければならない (MUST)。

#### Scenario: Use recorded fixtures
- **WHEN** pytestを実行する
- **THEN** `tests/fixtures/html/`の録画HTMLを読み込み、ネットワークアクセスなしでセレクタ・正規化・派生指標の挙動を検証する

#### Scenario: Enforce coverage goals
- **WHEN** 派生指標や単位変換のテストを実装する
- **THEN** 計算モジュールで85%以上の行カバレッジを達成し、NaN/ゼロ除算パスを網羅する
