#!/usr/bin/env node

/**
 * MetaEgg システム - 評価期間指定CLIコマンド
 * 三軸評価システムによる期間別投資分析
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EvaluateOptions {
  input?: string;
  output?: string;
  timeframe?: 'short' | 'medium' | 'long' | 'all';
  strategy?: string;
  minScore?: number;
  maxResults?: number;
  format?: 'json' | 'csv' | 'html';
  verbose?: boolean;
}

class TimeframeEvaluator {
  private readonly program: Command;
  private readonly defaultInputDir = path.resolve(process.cwd(), 'output');
  private readonly defaultOutputDir = path.resolve(process.cwd(), 'output');

  private readonly TIMEFRAME_CONFIGS = {
    short: { name: '短期（3-6ヶ月）', weights: { momentum: 0.4, growth: 0.3, safety: 0.3 } },
    medium: { name: '中期（6-18ヶ月）', weights: { growth: 0.3, dividend: 0.3, momentum: 0.4 } },
    long: { name: '長期（18ヶ月以上）', weights: { dividend: 0.4, safety: 0.4, growth: 0.2 } }
  };

  constructor() {
    this.program = new Command();
    this.setupCommand();
  }

  private setupCommand(): void {
    this.program
      .name('evaluate-timeframe')
      .description('📊 MetaEgg - 期間別投資評価ツール')
      .version('1.0.0')
      .option('-i, --input <path>', 'エンリッチデータファイル', this.defaultInputDir)
      .option('-o, --output <path>', '出力ディレクトリ', this.defaultOutputDir)
      .option('-t, --timeframe <frame>', '投資期間 (short|medium|long|all)', 'all')
      .option('-s, --strategy <strategy>', '投資戦略', 'balanced')
      .option('--min-score <score>', '最小スコア閾値', '60')
      .option('--max-results <number>', '最大結果数', '50')
      .option('-f, --format <format>', '出力形式 (json|csv|html)', 'json')
      .option('-v, --verbose', '詳細ログを表示', false)
      .action(async (options: EvaluateOptions) => {
        await this.execute(options);
      });

    this.program.parse();
  }

  async execute(options: EvaluateOptions): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('📊 MetaEgg期間別投資評価開始');
      console.log('=' .repeat(60));

      // 1. データ読み込み
      console.log('\n📂 1. エンリッチデータ読み込み');
      const inputData = await this.loadEnrichedData(options.input!);

      // 2. 評価実行
      console.log('\n📊 2. 期間別評価実行');
      const results = await this.performEvaluations(inputData, options);

      // 3. レポート生成
      console.log('\n📄 3. 評価レポート生成');
      await this.generateReport(results, options);

      console.log('\n✅ 期間別投資評価完了');
      console.log(`   ⏱️ 実行時間: ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('\n❌ 評価失敗:', error);
      process.exit(1);
    }
  }

  private async loadEnrichedData(inputPath: string): Promise<any[]> {
    try {
      const stats = await fs.stat(inputPath);
      let filePath: string;

      if (stats.isDirectory()) {
        const files = await fs.readdir(inputPath);
        const enrichedFiles = files.filter(f => f.startsWith('enriched-data') && f.endsWith('.json'));
        if (enrichedFiles.length === 0) throw new Error('エンリッチデータが見つかりません');
        filePath = path.join(inputPath, enrichedFiles.sort().reverse()[0]);
      } else {
        filePath = inputPath;
      }

      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      console.log(`   ✓ データ読み込み: ${data.length}レコード`);
      return data;
    } catch (error) {
      throw new Error(`データ読み込みエラー: ${error.message}`);
    }
  }

  private async performEvaluations(data: any[], options: EvaluateOptions): Promise<any> {
    const timeframes = options.timeframe === 'all' ? ['short', 'medium', 'long'] : [options.timeframe!];
    const results: any = { evaluations: [], summary: {} };

    for (const timeframe of timeframes) {
      console.log(`   📊 ${this.TIMEFRAME_CONFIGS[timeframe as keyof typeof this.TIMEFRAME_CONFIGS].name}評価中...`);
      
      const evaluation = await this.evaluateTimeframe(data, timeframe, options);
      results.evaluations.push(evaluation);
      
      console.log(`     ✓ 完了: ${evaluation.topStocks.length}件の推奨銘柄`);
    }

    results.summary = this.calculateSummary(results.evaluations);
    return results;
  }

  private async evaluateTimeframe(data: any[], timeframe: string, options: EvaluateOptions): Promise<any> {
    const config = this.TIMEFRAME_CONFIGS[timeframe as keyof typeof this.TIMEFRAME_CONFIGS];
    const evaluatedStocks = [];

    for (const stock of data) {
      if (!stock.stockCode) continue;

      try {
        const score = this.calculateScore(stock, config);
        if (score >= parseFloat(options.minScore!)) {
          evaluatedStocks.push({
            ...stock,
            evaluation: {
              overallScore: score,
              recommendation: this.getRecommendation(score),
              timeframe,
              riskLevel: this.assessRisk(stock)
            }
          });
        }
      } catch (error) {
        if (options.verbose) console.warn(`     ⚠️ 評価エラー (${stock.stockCode})`);
      }
    }

    const topStocks = evaluatedStocks
      .sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore)
      .slice(0, parseInt(options.maxResults!));

    return {
      timeframe,
      config: config.name,
      totalEvaluated: evaluatedStocks.length,
      topStocks,
      avgScore: evaluatedStocks.reduce((sum, s) => sum + s.evaluation.overallScore, 0) / evaluatedStocks.length || 0,
      recommendations: this.countRecommendations(evaluatedStocks)
    };
  }

  private calculateScore(stock: any, config: any): number {
    let score = 50; // ベーススコア

    // Yahoo Financeデータ評価
    if (stock.yahooData) {
      const dividendYield = stock.yahooData.dividendYield || 0;
      const per = stock.yahooData.per || 0;
      const pbr = stock.yahooData.pbr || 0;

      score += Math.min(20, dividendYield * 4); // 配当利回り
      score += per > 0 && per < 15 ? 15 : per < 25 ? 10 : 0; // PER
      score += pbr > 0 && pbr < 1.5 ? 15 : pbr < 2.5 ? 10 : 0; // PBR
    }

    // IRBANKデータ評価
    if (stock.irbankData) {
      const roe = stock.irbankData.roe || 0;
      const equityRatio = stock.irbankData.equityRatio || 0;

      score += Math.min(15, roe * 1.5); // ROE
      score += equityRatio > 50 ? 15 : equityRatio > 30 ? 10 : 0; // 自己資本比率
    }

    // 株予報データ評価
    if (stock.kabuyohoData) {
      const rec = stock.kabuyohoData.recommendation;
      if (rec === 'STRONG_BUY') score += 20;
      else if (rec === 'BUY') score += 15;
      else if (rec === 'HOLD') score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  private getRecommendation(score: number): string {
    if (score >= 85) return 'STRONG_BUY';
    if (score >= 70) return 'BUY';
    if (score >= 50) return 'HOLD';
    return 'SELL';
  }

  private assessRisk(stock: any): string {
    const per = stock.yahooData?.per || 0;
    const equityRatio = stock.irbankData?.equityRatio || 0;
    
    if (per > 25 || equityRatio < 30) return 'HIGH';
    if (per > 15 || equityRatio < 50) return 'MEDIUM';
    return 'LOW';
  }

  private countRecommendations(stocks: any[]): any {
    const counts = { STRONG_BUY: 0, BUY: 0, HOLD: 0, SELL: 0 };
    stocks.forEach(stock => {
      const rec = stock.evaluation.recommendation;
      if (counts.hasOwnProperty(rec)) counts[rec as keyof typeof counts]++;
    });
    return counts;
  }

  private calculateSummary(evaluations: any[]): any {
    const bestEval = evaluations.reduce((best, current) => 
      current.avgScore > (best?.avgScore || 0) ? current : best, null);

    return {
      totalEvaluations: evaluations.length,
      bestTimeframe: bestEval?.timeframe || 'none',
      bestAverageScore: bestEval?.avgScore || 0,
      totalRecommendations: evaluations.reduce((sum, e) => 
        sum + Object.values(e.recommendations).reduce((a: any, b: any) => a + b, 0), 0)
    };
  }

  private async generateReport(results: any, options: EvaluateOptions): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(options.output!, `evaluation-report-${timestamp}.${options.format}`);

    try {
      if (options.format === 'json') {
        await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');
      } else if (options.format === 'csv') {
        const csvContent = this.convertToCSV(results);
        await fs.writeFile(reportPath, csvContent, 'utf8');
      } else if (options.format === 'html') {
        const htmlContent = this.generateHTML(results);
        await fs.writeFile(reportPath, htmlContent, 'utf8');
      }

      console.log(`   ✓ レポート生成: ${reportPath}`);
      console.log(`   📊 最優秀期間: ${results.summary.bestTimeframe} (平均スコア: ${results.summary.bestAverageScore.toFixed(1)})`);

    } catch (error) {
      console.warn(`   ⚠️ レポート生成エラー: ${error.message}`);
    }
  }

  private convertToCSV(results: any): string {
    const rows = ['期間,銘柄コード,企業名,スコア,推奨,配当利回り,PER,ROE'];
    
    for (const evaluation of results.evaluations) {
      for (const stock of evaluation.topStocks) {
        const row = [
          evaluation.timeframe,
          stock.stockCode,
          stock.companyName || '',
          stock.evaluation.overallScore.toFixed(1),
          stock.evaluation.recommendation,
          (stock.yahooData?.dividendYield || 0).toFixed(2),
          (stock.yahooData?.per || 0).toFixed(1),
          (stock.irbankData?.roe || 0).toFixed(1)
        ];
        rows.push(row.join(','));
      }
    }
    
    return rows.join('\n');
  }

  private generateHTML(results: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>MetaEgg 期間別評価レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .strong-buy { color: #28a745; font-weight: bold; }
        .buy { color: #007bff; }
    </style>
</head>
<body>
    <h1>📊 MetaEgg 期間別評価レポート</h1>
    
    <div class="summary">
        <h2>📈 サマリー</h2>
        <p>最優秀期間: ${results.summary.bestTimeframe}</p>
        <p>最高平均スコア: ${results.summary.bestAverageScore.toFixed(1)}</p>
        <p>総推奨銘柄数: ${results.summary.totalRecommendations}</p>
    </div>
    
    ${results.evaluations.map((eval: any) => `
        <h2>${eval.config}</h2>
        <p>評価銘柄数: ${eval.totalEvaluated}, 平均スコア: ${eval.avgScore.toFixed(1)}</p>
        <table>
            <tr><th>銘柄コード</th><th>企業名</th><th>スコア</th><th>推奨</th></tr>
            ${eval.topStocks.slice(0, 10).map((stock: any) => `
                <tr>
                    <td>${stock.stockCode}</td>
                    <td>${stock.companyName || ''}</td>
                    <td>${stock.evaluation.overallScore.toFixed(1)}</td>
                    <td class="${stock.evaluation.recommendation.toLowerCase().replace('_', '-')}">${stock.evaluation.recommendation}</td>
                </tr>
            `).join('')}
        </table>
    `).join('')}
</body>
</html>`;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  new TimeframeEvaluator();
}

export { TimeframeEvaluator };