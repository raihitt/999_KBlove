/**
 * MetaEgg システム - 評価基準実装エンジン
 * 
 * 高配当銘柄分析のための6つの核心評価基準
 * - 配当利回り（Dividend Yield）: 配当投資の収益性
 * - 自己資本比率（Equity Ratio）: 財務安定性
 * - PER（Price Earnings Ratio）: 株価妥当性
 * - PBR（Price Book Ratio）: 資産価値評価
 * - 営業利益率（Operating Margin）: 事業効率性
 * - ROE（Return on Equity）: 資本効率性
 */

import { EventEmitter } from 'events';
import type { 
  StockData, 
  EvaluationCriteria, 
  CriteriaScore, 
  EvaluationResult,
  SectorBenchmarks,
  CriteriaWeights 
} from '../../schema/types.js';

export interface CriteriaDefinition {
  name: string;
  description: string;
  unit: string;
  optimalRange: { min: number; max: number };
  scoringMethod: 'LINEAR' | 'LOGARITHMIC' | 'THRESHOLD' | 'INVERSE';
  weight: number;
  sectorAdjustment: boolean;
  qualityThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface CriteriaEvaluationContext {
  stockCode: string;
  sector: string;
  marketCap: number;
  currentData: StockData;
  historicalData?: StockData[];
  benchmarkData?: SectorBenchmarks;
  evaluationDate: Date;
}

export interface DetailedCriteriaResult {
  criteriaName: string;
  rawValue: number;
  normalizedScore: number;
  qualityLevel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  sectorRank: number;
  sectorPercentile: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  strengths: string[];
  concerns: string[];
}

export class EvaluationCriteriaEngine extends EventEmitter {
  private criteriaDefinitions = new Map<string, CriteriaDefinition>();
  private sectorBenchmarks = new Map<string, SectorBenchmarks>();
  private evaluationHistory: EvaluationResult[] = [];
  
  // 評価基準定義
  private readonly CRITERIA_DEFINITIONS: CriteriaDefinition[] = [
    {
      name: 'dividendYield',
      description: '配当利回り - 配当投資の収益性を示す指標',
      unit: '%',
      optimalRange: { min: 3.0, max: 6.0 },
      scoringMethod: 'LINEAR',
      weight: 0.25,
      sectorAdjustment: true,
      qualityThresholds: {
        excellent: 5.0,  // 5%以上
        good: 3.5,       // 3.5%以上
        fair: 2.0,       // 2%以上
        poor: 0.0        // 2%未満
      }
    },
    {
      name: 'equityRatio',
      description: '自己資本比率 - 財務安定性を示す指標',
      unit: '%',
      optimalRange: { min: 40.0, max: 80.0 },
      scoringMethod: 'LINEAR',
      weight: 0.20,
      sectorAdjustment: true,
      qualityThresholds: {
        excellent: 60.0,  // 60%以上
        good: 45.0,       // 45%以上
        fair: 30.0,       // 30%以上
        poor: 0.0         // 30%未満
      }
    },
    {
      name: 'per',
      description: 'PER - 株価妥当性を示す指標',
      unit: '倍',
      optimalRange: { min: 8.0, max: 20.0 },
      scoringMethod: 'INVERSE',
      weight: 0.15,
      sectorAdjustment: true,
      qualityThresholds: {
        excellent: 12.0,  // 12倍以下
        good: 18.0,       // 18倍以下
        fair: 25.0,       // 25倍以下
        poor: 999.0       // 25倍超
      }
    },
    {
      name: 'pbr',
      description: 'PBR - 資産価値評価を示す指標',
      unit: '倍',
      optimalRange: { min: 0.5, max: 2.0 },
      scoringMethod: 'INVERSE',
      weight: 0.10,
      sectorAdjustment: true,
      qualityThresholds: {
        excellent: 1.0,   // 1.0倍以下
        good: 1.5,        // 1.5倍以下
        fair: 2.5,        // 2.5倍以下
        poor: 999.0       // 2.5倍超
      }
    },
    {
      name: 'operatingMargin',
      description: '営業利益率 - 事業効率性を示す指標',
      unit: '%',
      optimalRange: { min: 8.0, max: 25.0 },
      scoringMethod: 'LINEAR',
      weight: 0.15,
      sectorAdjustment: true,
      qualityThresholds: {
        excellent: 15.0,  // 15%以上
        good: 10.0,       // 10%以上
        fair: 5.0,        // 5%以上
        poor: 0.0         // 5%未満
      }
    },
    {
      name: 'roe',
      description: 'ROE - 資本効率性を示す指標',
      unit: '%',
      optimalRange: { min: 10.0, max: 25.0 },
      scoringMethod: 'LINEAR',
      weight: 0.15,
      sectorAdjustment: true,
      qualityThresholds: {
        excellent: 15.0,  // 15%以上
        good: 10.0,       // 10%以上
        fair: 5.0,        // 5%以上
        poor: 0.0         // 5%未満
      }
    }
  ];

  // セクター別ベンチマーク（例）
  private readonly SECTOR_BENCHMARKS = {
    '情報・通信': {
      dividendYield: 2.1, equityRatio: 65.5, per: 28.4, pbr: 2.8, operatingMargin: 12.3, roe: 9.2
    },
    '輸送用機器': {
      dividendYield: 2.8, equityRatio: 42.1, per: 15.2, pbr: 1.1, operatingMargin: 6.8, roe: 7.4
    },
    '医薬品': {
      dividendYield: 3.2, equityRatio: 71.8, per: 22.6, pbr: 1.9, operatingMargin: 18.4, roe: 8.9
    },
    '卸売業': {
      dividendYield: 2.5, equityRatio: 38.9, per: 12.8, pbr: 1.3, operatingMargin: 2.1, roe: 11.2
    }
  };

  constructor() {
    super();
    this.initializeCriteriaDefinitions();
    this.initializeSectorBenchmarks();
    
    console.log(`📊 評価基準エンジン初期化完了`);
    console.log(`   - 評価基準数: ${this.criteriaDefinitions.size}`);
    console.log(`   - セクター数: ${this.sectorBenchmarks.size}`);
  }

  /**
   * 包括的評価実行
   */
  async evaluateStock(context: CriteriaEvaluationContext): Promise<EvaluationResult> {
    const startTime = Date.now();
    
    console.log(`📈 銘柄評価開始: ${context.stockCode} (${context.sector})`);

    try {
      // 1. 各評価基準の詳細評価
      const criteriaResults = await this.evaluateAllCriteria(context);
      
      // 2. 総合スコア計算
      const overallScore = this.calculateOverallScore(criteriaResults);
      
      // 3. リスク評価
      const riskAssessment = this.assessRisk(criteriaResults, context);
      
      // 4. 投資推奨の生成
      const recommendation = this.generateRecommendation(overallScore, criteriaResults, riskAssessment);
      
      // 5. 評価結果の生成
      const result: EvaluationResult = {
        stockCode: context.stockCode,
        sector: context.sector,
        evaluationDate: context.evaluationDate,
        overallScore,
        criteriaScores: criteriaResults,
        riskLevel: riskAssessment.level,
        recommendation: recommendation.action,
        confidenceLevel: recommendation.confidence,
        strengths: this.identifyStrengths(criteriaResults),
        weaknesses: this.identifyWeaknesses(criteriaResults),
        sectorComparison: this.generateSectorComparison(criteriaResults, context.sector),
        executionTime: Date.now() - startTime
      };

      // 6. 評価履歴に記録
      this.recordEvaluation(result);

      console.log(`✅ 銘柄評価完了: ${context.stockCode}`);
      console.log(`   - 総合スコア: ${overallScore.toFixed(1)}/100`);
      console.log(`   - 推奨: ${recommendation.action}`);
      console.log(`   - 実行時間: ${result.executionTime}ms`);

      return result;

    } catch (error) {
      console.error(`❌ 銘柄評価失敗: ${context.stockCode}`, error);
      throw error;
    }
  }

  /**
   * 単一基準評価
   */
  async evaluateCriteria(
    criteriaName: string, 
    value: number, 
    context: CriteriaEvaluationContext
  ): Promise<DetailedCriteriaResult> {
    
    const definition = this.criteriaDefinitions.get(criteriaName);
    if (!definition) {
      throw new Error(`未知の評価基準: ${criteriaName}`);
    }

    console.log(`🔍 基準評価: ${criteriaName} = ${value} ${definition.unit}`);

    // 1. 正規化スコア計算
    const normalizedScore = this.calculateNormalizedScore(value, definition);
    
    // 2. 品質レベル判定
    const qualityLevel = this.determineQualityLevel(value, definition);
    
    // 3. セクター比較
    const sectorComparison = this.calculateSectorComparison(
      criteriaName, 
      value, 
      context.sector
    );
    
    // 4. トレンド分析
    const trend = this.analyzeTrend(criteriaName, value, context.historicalData);
    
    // 5. リスク評価
    const riskLevel = this.assessCriteriaRisk(criteriaName, value, definition);
    
    // 6. 推奨とコメント生成
    const insights = this.generateCriteriaInsights(criteriaName, value, definition, qualityLevel);

    return {
      criteriaName,
      rawValue: value,
      normalizedScore,
      qualityLevel,
      sectorRank: sectorComparison.rank,
      sectorPercentile: sectorComparison.percentile,
      trend,
      riskLevel,
      recommendation: insights.recommendation,
      strengths: insights.strengths,
      concerns: insights.concerns
    };
  }

  /**
   * セクター基準更新
   */
  updateSectorBenchmarks(sector: string, benchmarks: SectorBenchmarks): void {
    this.sectorBenchmarks.set(sector, benchmarks);
    console.log(`📊 セクター基準更新: ${sector}`);
    
    this.emit('sector-benchmarks-updated', { sector, benchmarks });
  }

  /**
   * 評価統計取得
   */
  getEvaluationStatistics(): any {
    const recentEvaluations = this.evaluationHistory.slice(-100);
    
    return {
      totalEvaluations: this.evaluationHistory.length,
      averageScore: recentEvaluations.reduce((sum, e) => sum + e.overallScore, 0) / recentEvaluations.length,
      scoreDistribution: this.calculateScoreDistribution(recentEvaluations),
      sectorPerformance: this.calculateSectorPerformance(recentEvaluations),
      criteriaAnalysis: this.analyzeCriteriaPerformance(recentEvaluations),
      recommendationBreakdown: this.calculateRecommendationBreakdown(recentEvaluations)
    };
  }

  /**
   * プライベートメソッド
   */
  private async evaluateAllCriteria(context: CriteriaEvaluationContext): Promise<Map<string, DetailedCriteriaResult>> {
    const results = new Map<string, DetailedCriteriaResult>();
    
    for (const [criteriaName, definition] of this.criteriaDefinitions) {
      const value = this.extractCriteriaValue(criteriaName, context.currentData);
      if (value !== undefined && value !== null) {
        const result = await this.evaluateCriteria(criteriaName, value, context);
        results.set(criteriaName, result);
      }
    }
    
    return results;
  }

  private extractCriteriaValue(criteriaName: string, data: StockData): number | undefined {
    switch (criteriaName) {
      case 'dividendYield':
        return data.dividendYield;
      case 'equityRatio':
        return data.equityRatio;
      case 'per':
        return data.per;
      case 'pbr':
        return data.pbr;
      case 'operatingMargin':
        return data.operatingMargin;
      case 'roe':
        return data.roe;
      default:
        return undefined;
    }
  }

  private calculateNormalizedScore(value: number, definition: CriteriaDefinition): number {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }

    const { min, max } = definition.optimalRange;
    
    switch (definition.scoringMethod) {
      case 'LINEAR':
        // 値が高いほど良い指標（配当利回り、自己資本比率、営業利益率、ROE）
        if (value >= max) return 100;
        if (value <= min) return 20;
        return 20 + ((value - min) / (max - min)) * 80;
        
      case 'INVERSE':
        // 値が低いほど良い指標（PER、PBR）
        if (value <= min) return 100;
        if (value >= max) return 20;
        return 100 - ((value - min) / (max - min)) * 80;
        
      case 'THRESHOLD':
        // しきい値ベース
        if (value >= definition.qualityThresholds.excellent) return 100;
        if (value >= definition.qualityThresholds.good) return 75;
        if (value >= definition.qualityThresholds.fair) return 50;
        return 25;
        
      case 'LOGARITHMIC':
        // 対数スケール
        const logValue = Math.log(Math.max(0.1, value));
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        return Math.max(0, Math.min(100, ((logValue - logMin) / (logMax - logMin)) * 100));
        
      default:
        return 50; // デフォルト
    }
  }

  private determineQualityLevel(value: number, definition: CriteriaDefinition): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    const thresholds = definition.qualityThresholds;
    
    if (definition.scoringMethod === 'INVERSE') {
      // 値が低いほど良い指標
      if (value <= thresholds.excellent) return 'EXCELLENT';
      if (value <= thresholds.good) return 'GOOD';
      if (value <= thresholds.fair) return 'FAIR';
      return 'POOR';
    } else {
      // 値が高いほど良い指標
      if (value >= thresholds.excellent) return 'EXCELLENT';
      if (value >= thresholds.good) return 'GOOD';
      if (value >= thresholds.fair) return 'FAIR';
      return 'POOR';
    }
  }

  private calculateSectorComparison(criteriaName: string, value: number, sector: string): { rank: number; percentile: number } {
    const benchmark = this.sectorBenchmarks.get(sector);
    if (!benchmark) {
      return { rank: 50, percentile: 50 }; // デフォルト中位
    }
    
    const sectorAverage = benchmark[criteriaName as keyof SectorBenchmarks] as number;
    if (!sectorAverage) {
      return { rank: 50, percentile: 50 };
    }
    
    // 簡易的なパーセンタイル計算
    const ratio = value / sectorAverage;
    let percentile: number;
    
    if (ratio >= 1.5) percentile = 90;
    else if (ratio >= 1.2) percentile = 75;
    else if (ratio >= 0.8) percentile = 50;
    else if (ratio >= 0.6) percentile = 25;
    else percentile = 10;
    
    return {
      rank: Math.round(percentile),
      percentile
    };
  }

  private analyzeTrend(criteriaName: string, currentValue: number, historicalData?: StockData[]): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    if (!historicalData || historicalData.length < 2) {
      return 'STABLE';
    }
    
    const pastValues = historicalData
      .map(data => this.extractCriteriaValue(criteriaName, data))
      .filter(value => value !== undefined && value !== null) as number[];
    
    if (pastValues.length < 2) {
      return 'STABLE';
    }
    
    const pastAverage = pastValues.reduce((sum, val) => sum + val, 0) / pastValues.length;
    const changeRatio = (currentValue - pastAverage) / pastAverage;
    
    if (changeRatio > 0.1) return 'IMPROVING';
    if (changeRatio < -0.1) return 'DECLINING';
    return 'STABLE';
  }

  private assessCriteriaRisk(criteriaName: string, value: number, definition: CriteriaDefinition): 'LOW' | 'MEDIUM' | 'HIGH' {
    const normalizedScore = this.calculateNormalizedScore(value, definition);
    
    if (normalizedScore >= 75) return 'LOW';
    if (normalizedScore >= 50) return 'MEDIUM';
    return 'HIGH';
  }

  private generateCriteriaInsights(
    criteriaName: string, 
    value: number, 
    definition: CriteriaDefinition, 
    qualityLevel: string
  ): { recommendation: string; strengths: string[]; concerns: string[] } {
    
    const strengths: string[] = [];
    const concerns: string[] = [];
    let recommendation = '';

    switch (criteriaName) {
      case 'dividendYield':
        if (qualityLevel === 'EXCELLENT') {
          strengths.push('優秀な配当利回り', '安定した配当収入が期待できる');
          recommendation = '配当投資として魅力的';
        } else if (qualityLevel === 'POOR') {
          concerns.push('配当利回りが低い', '配当収入が限定的');
          recommendation = '配当以外の成長性に注目';
        }
        break;
        
      case 'equityRatio':
        if (qualityLevel === 'EXCELLENT') {
          strengths.push('優秀な財務安定性', '借入依存度が低い');
          recommendation = '安定した投資対象';
        } else if (qualityLevel === 'POOR') {
          concerns.push('財務レバレッジが高い', '財務リスクに注意');
          recommendation = '財務改善の進捗を監視';
        }
        break;
        
      case 'per':
        if (qualityLevel === 'EXCELLENT') {
          strengths.push('割安な株価水準', '投資妙味が高い');
          recommendation = 'バリュー投資として魅力的';
        } else if (qualityLevel === 'POOR') {
          concerns.push('株価が割高', '期待値が高く込み');
          recommendation = '業績成長性を慎重に評価';
        }
        break;
        
      default:
        recommendation = `${definition.description}を継続監視`;
        break;
    }

    return { recommendation, strengths, concerns };
  }

  private calculateOverallScore(criteriaResults: Map<string, DetailedCriteriaResult>): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [criteriaName, result] of criteriaResults) {
      const definition = this.criteriaDefinitions.get(criteriaName);
      if (definition) {
        weightedSum += result.normalizedScore * definition.weight;
        totalWeight += definition.weight;
      }
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private assessRisk(
    criteriaResults: Map<string, DetailedCriteriaResult>, 
    context: CriteriaEvaluationContext
  ): { level: 'LOW' | 'MEDIUM' | 'HIGH'; factors: string[] } {
    
    const riskFactors: string[] = [];
    let riskScore = 0;
    
    for (const [criteriaName, result] of criteriaResults) {
      if (result.riskLevel === 'HIGH') {
        riskScore += 3;
        riskFactors.push(`${criteriaName}リスクが高い`);
      } else if (result.riskLevel === 'MEDIUM') {
        riskScore += 1;
      }
    }
    
    // セクター特有リスクの考慮
    if (context.sector === '情報・通信') {
      riskScore += 1;
      riskFactors.push('技術変化リスク');
    }
    
    let level: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskScore >= 6) level = 'HIGH';
    else if (riskScore >= 3) level = 'MEDIUM';
    else level = 'LOW';
    
    return { level, factors: riskFactors };
  }

  private generateRecommendation(
    overallScore: number, 
    criteriaResults: Map<string, DetailedCriteriaResult>, 
    riskAssessment: any
  ): { action: string; confidence: number } {
    
    let action: string;
    let confidence: number;
    
    if (overallScore >= 80 && riskAssessment.level !== 'HIGH') {
      action = 'STRONG_BUY';
      confidence = 0.9;
    } else if (overallScore >= 70) {
      action = 'BUY';
      confidence = 0.8;
    } else if (overallScore >= 60) {
      action = 'HOLD';
      confidence = 0.7;
    } else if (overallScore >= 40) {
      action = 'WEAK_HOLD';
      confidence = 0.6;
    } else {
      action = 'SELL';
      confidence = 0.8;
    }
    
    // リスクによる調整
    if (riskAssessment.level === 'HIGH') {
      confidence *= 0.8;
      if (action === 'STRONG_BUY') action = 'BUY';
      if (action === 'BUY') action = 'HOLD';
    }
    
    return { action, confidence };
  }

  private identifyStrengths(criteriaResults: Map<string, DetailedCriteriaResult>): string[] {
    const strengths: string[] = [];
    
    for (const [criteriaName, result] of criteriaResults) {
      if (result.qualityLevel === 'EXCELLENT') {
        const definition = this.criteriaDefinitions.get(criteriaName);
        if (definition) {
          strengths.push(`優秀な${definition.description}`);
        }
      }
    }
    
    return strengths;
  }

  private identifyWeaknesses(criteriaResults: Map<string, DetailedCriteriaResult>): string[] {
    const weaknesses: string[] = [];
    
    for (const [criteriaName, result] of criteriaResults) {
      if (result.qualityLevel === 'POOR') {
        const definition = this.criteriaDefinitions.get(criteriaName);
        if (definition) {
          weaknesses.push(`${definition.description}に課題`);
        }
      }
    }
    
    return weaknesses;
  }

  private generateSectorComparison(criteriaResults: Map<string, DetailedCriteriaResult>, sector: string): any {
    const comparison: any = {
      sector,
      aboveAverage: 0,
      belowAverage: 0,
      details: {}
    };
    
    for (const [criteriaName, result] of criteriaResults) {
      comparison.details[criteriaName] = {
        percentile: result.sectorPercentile,
        aboveAverage: result.sectorPercentile > 50
      };
      
      if (result.sectorPercentile > 50) {
        comparison.aboveAverage++;
      } else {
        comparison.belowAverage++;
      }
    }
    
    return comparison;
  }

  private initializeCriteriaDefinitions(): void {
    this.CRITERIA_DEFINITIONS.forEach(definition => {
      this.criteriaDefinitions.set(definition.name, definition);
    });
  }

  private initializeSectorBenchmarks(): void {
    Object.entries(this.SECTOR_BENCHMARKS).forEach(([sector, benchmarks]) => {
      this.sectorBenchmarks.set(sector, benchmarks);
    });
  }

  private recordEvaluation(result: EvaluationResult): void {
    this.evaluationHistory.push(result);
    
    // 履歴サイズ制限
    if (this.evaluationHistory.length > 1000) {
      this.evaluationHistory = this.evaluationHistory.slice(-500);
    }
  }

  private calculateScoreDistribution(evaluations: EvaluationResult[]): any {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    evaluations.forEach(eval => {
      if (eval.overallScore >= 80) distribution.excellent++;
      else if (eval.overallScore >= 70) distribution.good++;
      else if (eval.overallScore >= 60) distribution.fair++;
      else distribution.poor++;
    });
    
    return distribution;
  }

  private calculateSectorPerformance(evaluations: EvaluationResult[]): any {
    const sectorPerformance = new Map<string, { count: number; avgScore: number }>();
    
    evaluations.forEach(eval => {
      const existing = sectorPerformance.get(eval.sector) || { count: 0, avgScore: 0 };
      existing.count++;
      existing.avgScore = ((existing.avgScore * (existing.count - 1)) + eval.overallScore) / existing.count;
      sectorPerformance.set(eval.sector, existing);
    });
    
    return Object.fromEntries(sectorPerformance);
  }

  private analyzeCriteriaPerformance(evaluations: EvaluationResult[]): any {
    // 基準別パフォーマンス分析（実装簡略化）
    return {};
  }

  private calculateRecommendationBreakdown(evaluations: EvaluationResult[]): any {
    const breakdown = new Map<string, number>();
    
    evaluations.forEach(eval => {
      breakdown.set(eval.recommendation, (breakdown.get(eval.recommendation) || 0) + 1);
    });
    
    return Object.fromEntries(breakdown);
  }
}

// シングルトンインスタンスのエクスポート
export const evaluationCriteriaEngine = new EvaluationCriteriaEngine();