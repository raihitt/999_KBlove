/**
 * MetaEgg システム - 6投資戦略実装エンジン
 * 
 * 多様な投資ニーズに対応した6つの投資戦略
 * - Balanced: バランス型投資戦略（安定性と成長のバランス）
 * - Growth: 成長型投資戦略（高成長企業重視）
 * - Income: インカム型投資戦略（配当収入重視）
 * - Momentum: モメンタム型投資戦略（価格動向重視）
 * - Value: バリュー型投資戦略（割安株重視）
 * - Quality: クオリティ型投資戦略（高品質企業重視）
 */

import { EventEmitter } from 'events';
import { evaluationCriteriaEngine } from './EvaluationCriteriaEngine.js';
import type { 
  StockData, 
  InvestmentStrategy, 
  StrategyResult, 
  StrategyWeights,
  PortfolioAllocation,
  RiskProfile 
} from '../../schema/types.js';

export interface StrategyDefinition {
  name: string;
  description: string;
  objective: string;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
  criteriaWeights: StrategyWeights;
  selectionCriteria: StrategySelectionCriteria;
  riskConstraints: RiskConstraints;
  performanceMetrics: string[];
}

export interface StrategySelectionCriteria {
  minimumCriteria: { [key: string]: number };
  exclusionCriteria: { [key: string]: number };
  preferredRanges: { [key: string]: { min: number; max: number } };
  sectorConstraints?: { [key: string]: number };
}

export interface RiskConstraints {
  maxVolatility: number;
  maxDrawdown: number;
  maxSectorConcentration: number;
  minDiversification: number;
  liquidityRequirement: number;
}

export interface StrategyAnalysisResult {
  strategyName: string;
  score: number;
  rank: number;
  suitability: 'HIGHLY_SUITABLE' | 'SUITABLE' | 'MODERATELY_SUITABLE' | 'NOT_SUITABLE';
  matchingFactors: string[];
  riskFactors: string[];
  expectedReturn: number;
  expectedRisk: number;
  recommendation: string;
}

export class InvestmentStrategiesEngine extends EventEmitter {
  private strategies = new Map<string, StrategyDefinition>();
  private strategyResults = new Map<string, StrategyResult[]>();
  private performanceHistory = new Map<string, any[]>();
  
  // 6つの投資戦略定義
  private readonly STRATEGY_DEFINITIONS: StrategyDefinition[] = [
    {
      name: 'Balanced',
      description: 'バランス型投資戦略',
      objective: '安定性と成長のバランスを重視した投資アプローチ',
      riskLevel: 'MODERATE',
      timeHorizon: 'MEDIUM',
      criteriaWeights: {
        dividendYield: 0.20,
        equityRatio: 0.25,
        per: 0.15,
        pbr: 0.10,
        operatingMargin: 0.15,
        roe: 0.15
      },
      selectionCriteria: {
        minimumCriteria: {
          dividendYield: 2.0,
          equityRatio: 35.0,
          operatingMargin: 5.0
        },
        exclusionCriteria: {
          per: 30.0,
          debtRatio: 60.0
        },
        preferredRanges: {
          dividendYield: { min: 2.5, max: 5.0 },
          per: { min: 10.0, max: 20.0 },
          roe: { min: 8.0, max: 20.0 }
        }
      },
      riskConstraints: {
        maxVolatility: 20.0,
        maxDrawdown: 15.0,
        maxSectorConcentration: 30.0,
        minDiversification: 8,
        liquidityRequirement: 0.8
      },
      performanceMetrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'dividendYield']
    },
    {
      name: 'Growth',
      description: '成長型投資戦略',
      objective: '高成長企業への投資による資本成長を重視',
      riskLevel: 'AGGRESSIVE',
      timeHorizon: 'LONG',
      criteriaWeights: {
        dividendYield: 0.05,
        equityRatio: 0.15,
        per: 0.10,
        pbr: 0.15,
        operatingMargin: 0.25,
        roe: 0.30
      },
      selectionCriteria: {
        minimumCriteria: {
          roe: 12.0,
          operatingMargin: 10.0,
          revenueGrowth: 8.0
        },
        exclusionCriteria: {
          per: 50.0,
          dividendPayout: 80.0
        },
        preferredRanges: {
          roe: { min: 15.0, max: 40.0 },
          operatingMargin: { min: 12.0, max: 35.0 },
          revenueGrowth: { min: 10.0, max: 50.0 }
        }
      },
      riskConstraints: {
        maxVolatility: 35.0,
        maxDrawdown: 25.0,
        maxSectorConcentration: 40.0,
        minDiversification: 6,
        liquidityRequirement: 0.9
      },
      performanceMetrics: ['capitalAppreciation', 'revenueGrowth', 'earningsGrowth', 'roe']
    },
    {
      name: 'Income',
      description: 'インカム型投資戦略',
      objective: '安定した配当収入の確保を最優先',
      riskLevel: 'CONSERVATIVE',
      timeHorizon: 'LONG',
      criteriaWeights: {
        dividendYield: 0.40,
        equityRatio: 0.25,
        per: 0.10,
        pbr: 0.05,
        operatingMargin: 0.10,
        roe: 0.10
      },
      selectionCriteria: {
        minimumCriteria: {
          dividendYield: 3.5,
          equityRatio: 40.0,
          dividendContinuity: 5
        },
        exclusionCriteria: {
          dividendPayout: 100.0,
          per: 25.0
        },
        preferredRanges: {
          dividendYield: { min: 4.0, max: 8.0 },
          equityRatio: { min: 50.0, max: 80.0 },
          operatingMargin: { min: 8.0, max: 25.0 }
        }
      },
      riskConstraints: {
        maxVolatility: 15.0,
        maxDrawdown: 10.0,
        maxSectorConcentration: 25.0,
        minDiversification: 10,
        liquidityRequirement: 0.7
      },
      performanceMetrics: ['dividendYield', 'dividendGrowth', 'payoutRatio', 'stability']
    },
    {
      name: 'Momentum',
      description: 'モメンタム型投資戦略',
      objective: '価格動向と市場のモメンタムを活用',
      riskLevel: 'AGGRESSIVE',
      timeHorizon: 'SHORT',
      criteriaWeights: {
        dividendYield: 0.05,
        equityRatio: 0.10,
        per: 0.15,
        pbr: 0.20,
        operatingMargin: 0.20,
        roe: 0.30
      },
      selectionCriteria: {
        minimumCriteria: {
          pricePerformance3M: 5.0,
          volume: 100000,
          marketCap: 10000000000
        },
        exclusionCriteria: {
          per: 60.0,
          volatility: 50.0
        },
        preferredRanges: {
          pricePerformance3M: { min: 10.0, max: 40.0 },
          relativeStrength: { min: 70.0, max: 95.0 },
          volume: { min: 500000, max: 10000000 }
        }
      },
      riskConstraints: {
        maxVolatility: 40.0,
        maxDrawdown: 30.0,
        maxSectorConcentration: 50.0,
        minDiversification: 5,
        liquidityRequirement: 0.95
      },
      performanceMetrics: ['pricePerformance', 'relativeStrength', 'momentum', 'volatility']
    },
    {
      name: 'Value',
      description: 'バリュー型投資戦略',
      objective: '割安株の発掘と長期保有による価値実現',
      riskLevel: 'MODERATE',
      timeHorizon: 'LONG',
      criteriaWeights: {
        dividendYield: 0.15,
        equityRatio: 0.20,
        per: 0.25,
        pbr: 0.25,
        operatingMargin: 0.10,
        roe: 0.05
      },
      selectionCriteria: {
        minimumCriteria: {
          equityRatio: 30.0,
          operatingMargin: 3.0
        },
        exclusionCriteria: {
          per: 25.0,
          pbr: 3.0,
          debtRatio: 70.0
        },
        preferredRanges: {
          per: { min: 5.0, max: 15.0 },
          pbr: { min: 0.3, max: 1.5 },
          priceToSales: { min: 0.5, max: 2.0 }
        }
      },
      riskConstraints: {
        maxVolatility: 25.0,
        maxDrawdown: 20.0,
        maxSectorConcentration: 35.0,
        minDiversification: 8,
        liquidityRequirement: 0.6
      },
      performanceMetrics: ['priceToBook', 'priceToEarnings', 'priceToSales', 'fcfYield']
    },
    {
      name: 'Quality',
      description: 'クオリティ型投資戦略',
      objective: '高品質企業への厳選投資',
      riskLevel: 'MODERATE',
      timeHorizon: 'LONG',
      criteriaWeights: {
        dividendYield: 0.10,
        equityRatio: 0.25,
        per: 0.10,
        pbr: 0.10,
        operatingMargin: 0.25,
        roe: 0.20
      },
      selectionCriteria: {
        minimumCriteria: {
          roe: 15.0,
          operatingMargin: 12.0,
          equityRatio: 50.0,
          debtToEquity: 0.5
        },
        exclusionCriteria: {
          per: 40.0,
          volatility: 30.0
        },
        preferredRanges: {
          roe: { min: 18.0, max: 35.0 },
          operatingMargin: { min: 15.0, max: 30.0 },
          equityRatio: { min: 60.0, max: 85.0 }
        }
      },
      riskConstraints: {
        maxVolatility: 18.0,
        maxDrawdown: 12.0,
        maxSectorConcentration: 25.0,
        minDiversification: 10,
        liquidityRequirement: 0.8
      },
      performanceMetrics: ['roe', 'roic', 'operatingMargin', 'consistentEarnings']
    }
  ];

  constructor() {
    super();
    this.initializeStrategies();
    
    console.log(`🎯 投資戦略エンジン初期化完了`);
    console.log(`   - 戦略数: ${this.strategies.size}`);
  }

  /**
   * 全戦略による銘柄分析
   */
  async analyzeStockForAllStrategies(stockData: StockData): Promise<Map<string, StrategyAnalysisResult>> {
    const results = new Map<string, StrategyAnalysisResult>();
    
    console.log(`🔍 全戦略分析開始: ${stockData.stockCode}`);

    for (const [strategyName, strategy] of this.strategies) {
      const analysisResult = await this.analyzeStockForStrategy(stockData, strategy);
      results.set(strategyName, analysisResult);
    }

    // 戦略別ランキング
    const sortedResults = Array.from(results.values()).sort((a, b) => b.score - a.score);
    sortedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    console.log(`✅ 全戦略分析完了: ${stockData.stockCode}`);
    console.log(`   - 最適戦略: ${sortedResults[0].strategyName} (スコア: ${sortedResults[0].score.toFixed(1)})`);

    return results;
  }

  /**
   * 特定戦略による銘柄分析
   */
  async analyzeStockForStrategy(stockData: StockData, strategy: StrategyDefinition): Promise<StrategyAnalysisResult> {
    console.log(`📊 戦略分析: ${strategy.name} - ${stockData.stockCode}`);

    // 1. 基準適合性チェック
    const criteriaCompliance = this.checkCriteriaCompliance(stockData, strategy);
    
    // 2. 戦略スコア計算
    const strategyScore = this.calculateStrategyScore(stockData, strategy);
    
    // 3. 適合性評価
    const suitability = this.assessSuitability(strategyScore, criteriaCompliance);
    
    // 4. マッチング要因特定
    const matchingFactors = this.identifyMatchingFactors(stockData, strategy);
    
    // 5. リスク要因評価
    const riskFactors = this.evaluateRiskFactors(stockData, strategy);
    
    // 6. 期待収益・リスク算出
    const { expectedReturn, expectedRisk } = this.calculateExpectedMetrics(stockData, strategy);
    
    // 7. 推奨生成
    const recommendation = this.generateStrategyRecommendation(
      strategyScore, 
      suitability, 
      strategy
    );

    return {
      strategyName: strategy.name,
      score: strategyScore,
      rank: 0, // 後で設定
      suitability,
      matchingFactors,
      riskFactors,
      expectedReturn,
      expectedRisk,
      recommendation
    };
  }

  /**
   * ポートフォリオ最適化
   */
  async optimizePortfolio(
    stocks: StockData[], 
    strategyName: string, 
    targetAmount: number
  ): Promise<PortfolioAllocation> {
    
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`未知の戦略: ${strategyName}`);
    }

    console.log(`📈 ポートフォリオ最適化: ${strategyName} (投資額: ¥${targetAmount.toLocaleString()})`);

    // 1. 戦略適合銘柄の選別
    const suitableStocks = await this.selectSuitableStocks(stocks, strategy);
    
    // 2. 最適ウェイト計算
    const weights = this.calculateOptimalWeights(suitableStocks, strategy);
    
    // 3. アロケーション生成
    const allocation = this.generateAllocation(suitableStocks, weights, targetAmount);
    
    // 4. リスク・リターン分析
    const portfolioMetrics = this.calculatePortfolioMetrics(allocation, strategy);

    console.log(`✅ ポートフォリオ最適化完了: ${allocation.holdings.length}銘柄選定`);

    return {
      strategyName,
      totalAmount: targetAmount,
      holdings: allocation.holdings,
      sectorAllocation: allocation.sectorAllocation,
      expectedReturn: portfolioMetrics.expectedReturn,
      expectedRisk: portfolioMetrics.expectedRisk,
      diversificationScore: portfolioMetrics.diversificationScore,
      optimizationDate: new Date()
    };
  }

  /**
   * 戦略パフォーマンス分析
   */
  analyzeStrategyPerformance(): any {
    const analysis: any = {};
    
    for (const [strategyName, strategy] of this.strategies) {
      const results = this.strategyResults.get(strategyName) || [];
      const performance = this.performanceHistory.get(strategyName) || [];
      
      analysis[strategyName] = {
        totalAnalyzes: results.length,
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
        suitabilityBreakdown: this.calculateSuitabilityBreakdown(results),
        riskProfile: {
          level: strategy.riskLevel,
          averageVolatility: this.calculateAverageVolatility(performance),
          maxDrawdown: this.calculateMaxDrawdown(performance)
        },
        topPerformingStocks: this.getTopPerformingStocks(results, 5)
      };
    }
    
    console.log(`📊 戦略パフォーマンス分析完了`);
    return analysis;
  }

  /**
   * プライベートメソッド
   */
  private checkCriteriaCompliance(stockData: StockData, strategy: StrategyDefinition): { compliance: number; violations: string[] } {
    const criteria = strategy.selectionCriteria;
    let compliantCriteria = 0;
    let totalCriteria = 0;
    const violations: string[] = [];

    // 最小基準チェック
    Object.entries(criteria.minimumCriteria).forEach(([key, minValue]) => {
      totalCriteria++;
      const actualValue = this.getStockValue(stockData, key);
      if (actualValue !== undefined && actualValue >= minValue) {
        compliantCriteria++;
      } else {
        violations.push(`${key}が最小基準${minValue}を下回る`);
      }
    });

    // 除外基準チェック
    Object.entries(criteria.exclusionCriteria).forEach(([key, maxValue]) => {
      totalCriteria++;
      const actualValue = this.getStockValue(stockData, key);
      if (actualValue !== undefined && actualValue <= maxValue) {
        compliantCriteria++;
      } else {
        violations.push(`${key}が除外基準${maxValue}を上回る`);
      }
    });

    return {
      compliance: totalCriteria > 0 ? (compliantCriteria / totalCriteria) * 100 : 0,
      violations
    };
  }

  private calculateStrategyScore(stockData: StockData, strategy: StrategyDefinition): number {
    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(strategy.criteriaWeights).forEach(([criteria, weight]) => {
      const value = this.getStockValue(stockData, criteria);
      if (value !== undefined) {
        const normalizedScore = this.normalizeValueForStrategy(value, criteria, strategy);
        weightedScore += normalizedScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
  }

  private normalizeValueForStrategy(value: number, criteria: string, strategy: StrategyDefinition): number {
    const preferred = strategy.selectionCriteria.preferredRanges[criteria];
    
    if (!preferred) {
      // デフォルト正規化
      return Math.max(0, Math.min(100, value));
    }

    const { min, max } = preferred;
    
    if (value >= min && value <= max) {
      return 100; // 最適範囲内
    } else if (value < min) {
      return Math.max(0, (value / min) * 100);
    } else {
      return Math.max(0, 100 - ((value - max) / max) * 50);
    }
  }

  private assessSuitability(score: number, compliance: { compliance: number; violations: string[] }): 'HIGHLY_SUITABLE' | 'SUITABLE' | 'MODERATELY_SUITABLE' | 'NOT_SUITABLE' {
    if (score >= 80 && compliance.compliance >= 90) {
      return 'HIGHLY_SUITABLE';
    } else if (score >= 70 && compliance.compliance >= 75) {
      return 'SUITABLE';
    } else if (score >= 60 && compliance.compliance >= 60) {
      return 'MODERATELY_SUITABLE';
    } else {
      return 'NOT_SUITABLE';
    }
  }

  private identifyMatchingFactors(stockData: StockData, strategy: StrategyDefinition): string[] {
    const factors: string[] = [];
    
    // 戦略別の強み要因
    switch (strategy.name) {
      case 'Income':
        if (stockData.dividendYield >= 4.0) {
          factors.push('高配当利回り');
        }
        if (stockData.equityRatio >= 50.0) {
          factors.push('安定した財務基盤');
        }
        break;
        
      case 'Growth':
        if (stockData.roe >= 15.0) {
          factors.push('高いROE');
        }
        if (stockData.operatingMargin >= 12.0) {
          factors.push('優秀な営業利益率');
        }
        break;
        
      case 'Value':
        if (stockData.per <= 15.0) {
          factors.push('割安なPER');
        }
        if (stockData.pbr <= 1.5) {
          factors.push('割安なPBR');
        }
        break;
    }
    
    return factors;
  }

  private evaluateRiskFactors(stockData: StockData, strategy: StrategyDefinition): string[] {
    const risks: string[] = [];
    
    // 共通リスク要因
    if (stockData.equityRatio < 30.0) {
      risks.push('財務レバレッジが高い');
    }
    
    if (stockData.per > 30.0) {
      risks.push('株価が割高水準');
    }
    
    // 戦略別リスク要因
    if (strategy.name === 'Income' && stockData.dividendYield > 8.0) {
      risks.push('配当利回りが過度に高い');
    }
    
    return risks;
  }

  private calculateExpectedMetrics(stockData: StockData, strategy: StrategyDefinition): { expectedReturn: number; expectedRisk: number } {
    // 簡易的な期待収益・リスク計算
    let expectedReturn = 0;
    let expectedRisk = 0;
    
    switch (strategy.riskLevel) {
      case 'CONSERVATIVE':
        expectedReturn = 5.0 + (stockData.dividendYield || 0);
        expectedRisk = 10.0;
        break;
      case 'MODERATE':
        expectedReturn = 8.0 + (stockData.roe || 0) * 0.3;
        expectedRisk = 15.0;
        break;
      case 'AGGRESSIVE':
        expectedReturn = 12.0 + (stockData.roe || 0) * 0.5;
        expectedRisk = 25.0;
        break;
    }
    
    return { expectedReturn, expectedRisk };
  }

  private generateStrategyRecommendation(score: number, suitability: string, strategy: StrategyDefinition): string {
    if (suitability === 'HIGHLY_SUITABLE') {
      return `${strategy.name}戦略として強く推奨`;
    } else if (suitability === 'SUITABLE') {
      return `${strategy.name}戦略として適合`;
    } else if (suitability === 'MODERATELY_SUITABLE') {
      return `${strategy.name}戦略として条件付き適合`;
    } else {
      return `${strategy.name}戦略には不適合`;
    }
  }

  private async selectSuitableStocks(stocks: StockData[], strategy: StrategyDefinition): Promise<StockData[]> {
    const suitableStocks: StockData[] = [];
    
    for (const stock of stocks) {
      const analysis = await this.analyzeStockForStrategy(stock, strategy);
      if (analysis.suitability === 'HIGHLY_SUITABLE' || analysis.suitability === 'SUITABLE') {
        suitableStocks.push(stock);
      }
    }
    
    return suitableStocks.slice(0, 20); // 上位20銘柄
  }

  private calculateOptimalWeights(stocks: StockData[], strategy: StrategyDefinition): number[] {
    // 等ウェイト（簡易実装）
    const equalWeight = 1.0 / stocks.length;
    return stocks.map(() => equalWeight);
  }

  private generateAllocation(stocks: StockData[], weights: number[], totalAmount: number): any {
    const holdings = stocks.map((stock, index) => ({
      stockCode: stock.stockCode,
      weight: weights[index],
      amount: totalAmount * weights[index],
      shares: Math.floor((totalAmount * weights[index]) / stock.price)
    }));
    
    const sectorAllocation = this.calculateSectorAllocation(holdings);
    
    return { holdings, sectorAllocation };
  }

  private calculatePortfolioMetrics(allocation: any, strategy: StrategyDefinition): any {
    // 簡易的なポートフォリオメトリクス
    return {
      expectedReturn: 8.0, // 戦略に基づく期待収益
      expectedRisk: 15.0,  // 戦略に基づく期待リスク
      diversificationScore: allocation.holdings.length * 5 // 分散スコア
    };
  }

  private calculateSectorAllocation(holdings: any[]): any {
    // セクター別配分計算（実装簡略化）
    return {};
  }

  private getStockValue(stockData: StockData, key: string): number | undefined {
    switch (key) {
      case 'dividendYield': return stockData.dividendYield;
      case 'equityRatio': return stockData.equityRatio;
      case 'per': return stockData.per;
      case 'pbr': return stockData.pbr;
      case 'operatingMargin': return stockData.operatingMargin;
      case 'roe': return stockData.roe;
      case 'debtRatio': return stockData.debtRatio;
      case 'marketCap': return stockData.marketCap;
      default: return undefined;
    }
  }

  private initializeStrategies(): void {
    this.STRATEGY_DEFINITIONS.forEach(strategy => {
      this.strategies.set(strategy.name, strategy);
    });
  }

  private calculateSuitabilityBreakdown(results: StrategyResult[]): any {
    const breakdown = { HIGHLY_SUITABLE: 0, SUITABLE: 0, MODERATELY_SUITABLE: 0, NOT_SUITABLE: 0 };
    results.forEach(result => {
      breakdown[result.suitability as keyof typeof breakdown]++;
    });
    return breakdown;
  }

  private calculateAverageVolatility(performance: any[]): number {
    return performance.length > 0 ? 
      performance.reduce((sum, p) => sum + (p.volatility || 0), 0) / performance.length : 0;
  }

  private calculateMaxDrawdown(performance: any[]): number {
    return performance.length > 0 ? 
      Math.max(...performance.map(p => p.drawdown || 0)) : 0;
  }

  private getTopPerformingStocks(results: StrategyResult[], count: number): any[] {
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(result => ({
        stockCode: result.stockCode,
        score: result.score,
        suitability: result.suitability
      }));
  }
}

// シングルトンインスタンスのエクスポート
export const investmentStrategiesEngine = new InvestmentStrategiesEngine();