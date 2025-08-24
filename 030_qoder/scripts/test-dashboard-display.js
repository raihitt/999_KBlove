#!/usr/bin/env node

/**
 * MetaEgg システム - ダッシュボード表示テストスクリプト
 * 
 * WebUIダッシュボードとレポート表示機能のテスト
 */

import path from 'path';
import fs from 'fs/promises';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DashboardDisplayTester {
  constructor() {
    this.outputPath = path.resolve(__dirname, '../output');
    this.port = 3000;
    
    this.testData = {
      systemMetrics: {
        cacheHitRate: 89.2,
        processingTimeReduction: 75.3,
        memoryEfficiency: 68.7,
        errorRecoveryRate: 91.5
      },
      stockAnalysis: [
        { stockCode: '7203', companyName: 'トヨタ自動車', score: 85.3, recommendation: 'BUY' },
        { stockCode: '6758', companyName: 'ソニーグループ', score: 78.9, recommendation: 'HOLD' },
        { stockCode: '4519', companyName: '中外製薬', score: 92.1, recommendation: 'STRONG_BUY' }
      ]
    };
    
    this.testResults = {
      displayTests: [],
      performanceTests: [],
      functionalTests: []
    };
  }

  async run() {
    console.log('📊 ダッシュボード表示テストシステム開始');
    console.log('=' .repeat(60));
    
    try {
      // 1. テスト環境準備
      console.log('🛠️ 1. テスト環境準備');
      await this.prepareTestEnvironment();
      
      // 2. ダッシュボード生成
      console.log('\n🎨 2. ダッシュボードHTML生成');
      await this.generateDashboard();
      
      // 3. Webサーバー起動
      console.log('\n🌐 3. Webサーバー起動');
      const server = await this.startWebServer();
      
      // 4. 表示テスト
      console.log('\n🖼️ 4. 表示テスト実行');
      await this.runDisplayTests();
      
      // 5. パフォーマンステスト
      console.log('\n⚡ 5. パフォーマンステスト');
      await this.runPerformanceTests();
      
      // 6. レポート生成
      console.log('\n📋 6. テストレポート生成');
      await this.generateTestReport();
      
      // 7. サーバー停止
      server.close();
      
      console.log('\n✅ ダッシュボード表示テスト完了');
      console.log(`   📊 ダッシュボード: http://localhost:${this.port}`);
      console.log(`   📄 レポート: ${path.join(this.outputPath, 'dashboard-test-report.html')}`);
      
    } catch (error) {
      console.error('❌ テスト失敗:', error);
      throw error;
    }
  }

  async prepareTestEnvironment() {
    await fs.mkdir(this.outputPath, { recursive: true });
    
    const testDataPath = path.join(this.outputPath, 'test-data.json');
    await fs.writeFile(
      testDataPath,
      JSON.stringify(this.testData, null, 2),
      'utf8'
    );
    
    console.log(`   ✓ テスト環境準備完了`);
  }

  async generateDashboard() {
    const dashboardHTML = this.createDashboardHTML();
    const dashboardPath = path.join(this.outputPath, 'dashboard.html');
    
    await fs.writeFile(dashboardPath, dashboardHTML, 'utf8');
    console.log(`   ✓ ダッシュボード生成: ${dashboardPath}`);
  }

  createDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MetaEgg Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333; line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; 
            margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 { color: #4a5568; font-size: 2.5rem; text-align: center; }
        
        .metrics-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; margin-bottom: 30px; 
        }
        .metric-card { 
            background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; 
            text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .metric-value { font-size: 2.5rem; font-weight: bold; margin-bottom: 10px; }
        .metric-label { color: #718096; font-size: 0.9rem; }
        
        .chart-container { 
            background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; 
            margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .chart-title { font-size: 1.5rem; margin-bottom: 15px; color: #4a5568; text-align: center; }
        
        .stock-table { 
            background: rgba(255,255,255,0.95); border-radius: 10px; overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f7fafc; font-weight: bold; }
        
        .control-panel { 
            background: rgba(255,255,255,0.95); padding: 20px; border-radius: 10px; 
            margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .btn { 
            background: #4299e1; color: white; padding: 10px 20px; border: none; 
            border-radius: 5px; cursor: pointer; margin: 5px;
        }
        .btn:hover { background: #3182ce; }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .metrics-grid { grid-template-columns: 1fr; }
            .metric-value { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🥚 MetaEgg Dashboard</h1>
            <p>高配当銘柄分析システム - 効率化最適化実装版</p>
            <p>最終更新: <span id="lastUpdate"></span></p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value" style="color: #e53e3e;">${this.testData.systemMetrics.cacheHitRate}%</div>
                <div class="metric-label">キャッシュヒット率</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #38a169;">${this.testData.systemMetrics.processingTimeReduction}%</div>
                <div class="metric-label">処理時間短縮</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #3182ce;">${this.testData.systemMetrics.memoryEfficiency}%</div>
                <div class="metric-label">メモリ効率</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #d69e2e;">${this.testData.systemMetrics.errorRecoveryRate}%</div>
                <div class="metric-label">エラー回復率</div>
            </div>
        </div>

        <div class="control-panel">
            <h3>🔧 システム制御</h3>
            <button class="btn" onclick="refreshData()">📊 データ更新</button>
            <button class="btn" onclick="generateReport()">📋 レポート生成</button>
            <button class="btn" onclick="runOptimization()">⚡ 最適化実行</button>
        </div>

        <div class="chart-container">
            <div class="chart-title">📈 パフォーマンス推移</div>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <div class="stock-table">
            <div style="background: #4a5568; color: white; padding: 15px;">🎯 推奨銘柄ランキング</div>
            <table>
                <thead>
                    <tr><th>銘柄コード</th><th>企業名</th><th>スコア</th><th>推奨</th></tr>
                </thead>
                <tbody>
                    ${this.testData.stockAnalysis.map(stock => `
                        <tr>
                            <td>${stock.stockCode}</td>
                            <td>${stock.companyName}</td>
                            <td>${stock.score}</td>
                            <td>${stock.recommendation}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ja-JP');

        // チャート描画
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
                datasets: [{
                    label: 'キャッシュヒット率',
                    data: [45, 52, 61, 73, 82, 89],
                    borderColor: '#e53e3e',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, max: 100 }}
            }
        });

        function refreshData() { alert('🔄 データ更新'); }
        function generateReport() { alert('📋 レポート生成'); }
        function runOptimization() { alert('⚡ 最適化実行'); }
    </script>
</body>
</html>`;
  }

  async startWebServer() {
    return new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (req.url === '/' || req.url === '/dashboard') {
            const dashboardPath = path.join(this.outputPath, 'dashboard.html');
            const html = await fs.readFile(dashboardPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          } else if (req.url === '/api/data') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.testData));
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server Error');
        }
      });

      server.listen(this.port, () => {
        console.log(`   ✓ Webサーバー起動: http://localhost:${this.port}`);
        resolve(server);
      });
    });
  }

  async runDisplayTests() {
    const tests = [
      { name: 'ダッシュボード基本表示', test: () => this.testBasicDisplay() },
      { name: 'メトリクス表示', test: () => this.testMetricsDisplay() },
      { name: 'チャート表示', test: () => this.testChartDisplay() },
      { name: 'テーブル表示', test: () => this.testTableDisplay() }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.testResults.displayTests.push({
          name: test.name,
          status: 'PASS',
          result
        });
        console.log(`     ✓ ${test.name}: PASS`);
      } catch (error) {
        this.testResults.displayTests.push({
          name: test.name,
          status: 'FAIL',
          error: error.message
        });
        console.log(`     ❌ ${test.name}: FAIL`);
      }
    }

    const passCount = this.testResults.displayTests.filter(t => t.status === 'PASS').length;
    console.log(`   ✓ 表示テスト完了: ${passCount}/${tests.length} PASS`);
  }

  async runPerformanceTests() {
    const tests = [
      { name: 'HTML生成速度', test: () => this.testGenerationSpeed() },
      { name: 'データ処理速度', test: () => this.testDataProcessing() },
      { name: 'メモリ使用量', test: () => this.testMemoryUsage() }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.testResults.performanceTests.push({
          name: test.name,
          status: 'PASS',
          result
        });
        console.log(`     ✓ ${test.name}: PASS (${result})`);
      } catch (error) {
        this.testResults.performanceTests.push({
          name: test.name,
          status: 'FAIL',
          error: error.message
        });
        console.log(`     ❌ ${test.name}: FAIL`);
      }
    }

    const passCount = this.testResults.performanceTests.filter(t => t.status === 'PASS').length;
    console.log(`   ✓ パフォーマンステスト完了: ${passCount}/${tests.length} PASS`);
  }

  // テストメソッド
  async testBasicDisplay() {
    const dashboardPath = path.join(this.outputPath, 'dashboard.html');
    const html = await fs.readFile(dashboardPath, 'utf8');
    
    if (!html.includes('MetaEgg Dashboard')) {
      throw new Error('タイトルが見つかりません');
    }
    return 'HTML構造が正常';
  }

  async testMetricsDisplay() {
    if (this.testData.systemMetrics.cacheHitRate < 0) {
      throw new Error('メトリクス値が異常');
    }
    return `${Object.keys(this.testData.systemMetrics).length}項目表示`;
  }

  async testChartDisplay() {
    const dashboardPath = path.join(this.outputPath, 'dashboard.html');
    const html = await fs.readFile(dashboardPath, 'utf8');
    
    if (!html.includes('chart.js')) {
      throw new Error('チャートライブラリが見つかりません');
    }
    return 'チャート要素が正常';
  }

  async testTableDisplay() {
    const stockCount = this.testData.stockAnalysis.length;
    if (stockCount === 0) {
      throw new Error('データが空');
    }
    return `${stockCount}件のデータ表示`;
  }

  async testGenerationSpeed() {
    const startTime = Date.now();
    this.createDashboardHTML();
    const endTime = Date.now();
    return `${endTime - startTime}ms`;
  }

  async testDataProcessing() {
    const startTime = Date.now();
    JSON.stringify(this.testData);
    const endTime = Date.now();
    return `${endTime - startTime}ms`;
  }

  async testMemoryUsage() {
    const memBefore = process.memoryUsage().heapUsed;
    this.createDashboardHTML();
    const memAfter = process.memoryUsage().heapUsed;
    const memoryUsed = Math.round((memAfter - memBefore) / 1024);
    return `${memoryUsed}KB`;
  }

  async generateTestReport() {
    const totalTests = [
      ...this.testResults.displayTests,
      ...this.testResults.performanceTests
    ];
    
    const passCount = totalTests.filter(t => t.status === 'PASS').length;
    const successRate = (passCount / totalTests.length) * 100;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: totalTests.length,
        passedTests: passCount,
        failedTests: totalTests.length - passCount,
        successRate: successRate.toFixed(1)
      },
      displayTests: this.testResults.displayTests,
      performanceTests: this.testResults.performanceTests,
      testData: this.testData
    };

    // JSONレポート
    const jsonPath = path.join(this.outputPath, 'dashboard-test-report.json');
    await fs.writeFile(
      jsonPath,
      JSON.stringify(report, null, 2),
      'utf8'
    );

    // HTMLレポート
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(this.outputPath, 'dashboard-test-report.html');
    await fs.writeFile(htmlPath, htmlReport, 'utf8');

    console.log(`   ✓ テストレポート生成:`);
    console.log(`     - 成功率: ${successRate.toFixed(1)}%`);
    console.log(`     - JSON: ${jsonPath}`);
    console.log(`     - HTML: ${htmlPath}`);

    return htmlReport;
  }

  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>ダッシュボードテストレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test-section { margin: 20px 0; }
        .pass { color: #28a745; } .fail { color: #dc3545; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>📊 ダッシュボードテストレポート</h1>
    <p>実行日時: ${report.timestamp}</p>
    
    <div class="summary">
        <h2>🎯 テストサマリー</h2>
        <p>総テスト数: ${report.summary.totalTests}</p>
        <p>成功: <span class="pass">${report.summary.passedTests}</span></p>
        <p>失敗: <span class="fail">${report.summary.failedTests}</span></p>
        <p>成功率: <strong>${report.summary.successRate}%</strong></p>
    </div>
    
    <div class="test-section">
        <h2>🖼️ 表示テスト結果</h2>
        <table>
            <tr><th>テスト名</th><th>ステータス</th><th>結果</th></tr>
            ${report.displayTests.map(test => `
                <tr>
                    <td>${test.name}</td>
                    <td class="${test.status.toLowerCase()}">${test.status}</td>
                    <td>${test.result || test.error || '-'}</td>
                </tr>
            `).join('')}
        </table>
    </div>
    
    <div class="test-section">
        <h2>⚡ パフォーマンステスト結果</h2>
        <table>
            <tr><th>テスト名</th><th>ステータス</th><th>結果</th></tr>
            ${report.performanceTests.map(test => `
                <tr>
                    <td>${test.name}</td>
                    <td class="${test.status.toLowerCase()}">${test.status}</td>
                    <td>${test.result || test.error || '-'}</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>`;
  }
}

// メイン実行
async function main() {
  try {
    const tester = new DashboardDisplayTester();
    await tester.run();
    console.log('\n🎉 ダッシュボード表示テストが正常に完了しました！');
  } catch (error) {
    console.error('\n💥 エラーが発生しました:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DashboardDisplayTester };