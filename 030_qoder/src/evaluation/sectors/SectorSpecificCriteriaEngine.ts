/**
 * MetaEgg システム - セクター別基準実装エンジン
 * 
 * 4つの主要セクターに特化した評価基準と分析
 * - 情報・通信: 技術革新とスケーラビリティ重視
 * - 輸送用機器: 製造効率と市場シェア重視
 * - 医薬品: 研究開発力と規制対応力重視
 * - 卸売業: 物流効率と在庫管理能力重視
 */

import { EventEmitter } from 'events';
import type { 
  StockData, 
  SectorAnalysis, 
  SectorBenchmarks,
  SectorSpecificMetrics 
} from '../../schema/types.js';

export interface SectorDefinition {
  name: string;
  description: string;
  keyCharacteristics: string[];
  criticalFactors: string[];
  riskFactors: string[];
  customCriteria: SectorCustomCriteria[];
}

export interface SectorCustomCriteria {
  name: string;
  description: string;
  weight: number;
  benchmarkValue: number;
  optimalRange: { min: number; max: number };
}

export interface SectorComparisonResult {
  sectorName: string;
  rank: number;
  percentile: number;
  relativePeerScore: number;
  competitiveAdvantages: string[];
  competitiveDisadvantages: string[];
  marketPosition: 'LEADER' | 'CHALLENGER' | 'FOLLOWER' | 'NICHE';
}

export class SectorSpecificCriteriaEngine extends EventEmitter {
  private sectorDefinitions = new Map<string, SectorDefinition>();
  private sectorBenchmarks = new Map<string, SectorBenchmarks>();
  private sectorAnalysisHistory: SectorAnalysis[] = [];
  
  // 4つの主要セクター定義
  private readonly SECTOR_DEFINITIONS: SectorDefinition[] = [
    {
      name: '情報・通信',
      description: 'ITサービス、ソフトウェア、通信機器、データセンター等',
      keyCharacteristics: ['高い技術革新性', 'スケーラビリティ', 'ネットワーク効果'],
      criticalFactors: ['研究開発費率', '売上高営業利益率', '従業員一人当たり売上'],
      riskFactors: ['技術陳腐化リスク', '人材流出リスク', 'サイバーセキュリティリスク'],
      customCriteria: [
        {
          name: 'rdIntensity',
          description: '研究開発費率（売上高に対する研究開発費の比率）',
          weight: 0.25,
          benchmarkValue: 8.5,
          optimalRange: { min: 6.0, max: 15.0 }
        },
        {
          name: 'employeeProductivity',
          description: '従業員一人当たり売上高',
          weight: 0.20,
          benchmarkValue: 25000000,
          optimalRange: { min: 15000000, max: 50000000 }
        }
      ]
    },
    {
      name: '輸送用機器',
      description: '自動車、航空機、船舶、鉄道車両等の製造業',
      keyCharacteristics: ['高い資本集約性', 'グローバル競争', '長期開発サイクル'],
      criticalFactors: ['設備投資効率', '在庫回転率', '売上原価率'],
      riskFactors: ['原材料価格変動リスク', '為替変動リスク', '環境規制強化リスク'],
      customCriteria: [
        {
          name: 'inventoryTurnover',
          description: '在庫回転率（年間）',
          weight: 0.20,
          benchmarkValue: 8.0,
          optimalRange: { min: 6.0, max: 12.0 }
        },
        {
          name: 'capexEfficiency',
          description: '設備投資効率（売上高/設備投資額）',
          weight: 0.25,
          benchmarkValue: 5.0,
          optimalRange: { min: 3.0, max: 8.0 }
        }
      ]
    },
    {
      name: '医薬品',
      description: '医薬品開発・製造、バイオテクノロジー、医療機器等',
      keyCharacteristics: ['長期研究開発', '高い規制要件', 'パテントクリフ'],
      criticalFactors: ['研究開発パイプライン', '承認取得率', '特許期間残存'],
      riskFactors: ['開発失敗リスク', '規制当局承認リスク', 'パテントクリフリスク'],
      customCriteria: [
        {
          name: 'rdPipelineStrength',
          description: '研究開発パイプラインの強さ',
          weight: 0.30,
          benchmarkValue: 5.0,
          optimalRange: { min: 3.0, max: 10.0 }
        },
        {
          name: 'patentLife',
          description: '主力製品の特許残存期間（年）',
          weight: 0.25,
          benchmarkValue: 8.0,
          optimalRange: { min: 5.0, max: 15.0 }
        }
      ]
    },
    {
      name: '卸売業',
      description: '総合商社、専門商社、流通・物流サービス等',
      keyCharacteristics: ['アセットライト', '在庫・物流効率', '取引関係の深さ'],
      criticalFactors: ['在庫回転率', '売上債権回転率', '営業キャッシュフロー'],
      riskFactors: ['中抜きリスク', '在庫リスク', '信用リスク'],
      customCriteria: [
        {
          name: 'assetTurnover',
          description: '総資産回転率（年間）',
          weight: 0.25,
          benchmarkValue: 2.5,
          optimalRange: { min: 1.8, max: 4.0 }
        },
        {
          name: 'cashConversion',
          description: 'キャッシュコンバージョンサイクル（日）',
          weight: 0.20,
          benchmarkValue: 45.0,
          optimalRange: { min: 20.0, max: 60.0 }
        }
      ]
    }
  ];

  // セクター別ベンチマーク
  private readonly SECTOR_BENCHMARKS = {
    '情報・通信': {
      dividendYield: 2.1, equityRatio: 65.5, per: 28.4, pbr: 2.8, 
      operatingMargin: 12.3, roe: 9.2, rdIntensity: 8.5, employeeProductivity: 25000000
    },
    '輸送用機器': {
      dividendYield: 2.8, equityRatio: 42.1, per: 15.2, pbr: 1.1, 
      operatingMargin: 6.8, roe: 7.4, inventoryTurnover: 8.0, capexEfficiency: 5.0
    },
    '医薬品': {
      dividendYield: 3.2, equityRatio: 71.8, per: 22.6, pbr: 1.9, 
      operatingMargin: 18.4, roe: 8.9, rdPipelineStrength: 5.0, patentLife: 8.0
    },
    '卸売業': {
      dividendYield: 2.5, equityRatio: 38.9, per: 12.8, pbr: 1.3, 
      operatingMargin: 2.1, roe: 11.2, assetTurnover: 2.5, cashConversion: 45.0
    }
  };

  constructor() {
    super();
    this.initializeSectorDefinitions();
    this.initializeSectorBenchmarks();
    
    console.log(`🏭 セクター別基準エンジン初期化完了`);
    console.log(`   - 対象セクター数: ${this.sectorDefinitions.size}`);
  }

  /**
   * セクター特化分析の実行
   */
  async analyzeBySector(stockData: StockData): Promise<SectorAnalysis> {
    const startTime = Date.now();
    const sector = stockData.sector || '不明';
    
    console.log(`🏭 セクター特化分析開始: ${stockData.stockCode} (${sector})`);

    if (!this.sectorDefinitions.has(sector)) {
      throw new Error(`未対応セクター: ${sector}`);
    }

    const sectorDef = this.sectorDefinitions.get(sector)!;
    const benchmarks = this.sectorBenchmarks.get(sector)!;

    try {
      // 1. セクター内相対評価
      const relativePosition = this.calculateRelativePosition(stockData, sector, benchmarks);
      
      // 2. セクター特有指標評価
      const customMetrics = await this.evaluateCustomMetrics(stockData, sectorDef);
      
      // 3. 競合比較分析
      const competitiveAnalysis = this.performCompetitiveAnalysis(stockData, sector);
      
      // 4. 総合セクター評価
      const overallSectorScore = this.calculateOverallSectorScore(
        relativePosition, customMetrics, competitiveAnalysis
      );

      const analysis: SectorAnalysis = {
        stockCode: stockData.stockCode,
        sector,
        analysisDate: new Date(),
        overallSectorScore,
        relativePosition,
        customMetrics,
        competitivePosition: competitiveAnalysis.position,
        riskFactors: this.getSectorRiskFactors(sectorDef),
        riskLevel: this.assessRiskLevel(stockData, sectorDef),
        growthPotential: this.assessGrowthPotential(stockData, sectorDef),
        keyStrengths: this.identifyKeyStrengths(stockData, sectorDef),
        improvementAreas: this.identifyImprovementAreas(stockData, sectorDef),
        sectorOutlook: this.generateSectorOutlook(sector),
        executionTime: Date.now() - startTime
      };

      this.recordSectorAnalysis(analysis);

      console.log(`✅ セクター特化分析完了: ${stockData.stockCode}`);
      console.log(`   - セクタースコア: ${overallSectorScore.toFixed(1)}/100`);

      return analysis;

    } catch (error) {
      console.error(`❌ セクター特化分析失敗: ${stockData.stockCode}`, error);
      throw error;
    }
  }

  /**
   * セクター間比較分析
   */
  async compareSectors(stocks: StockData[]): Promise<Map<string, any>> {
    console.log(`📊 セクター間比較分析開始: ${stocks.length}銘柄`);

    const sectorComparison = new Map<string, any>();
    const stocksBySector = this.groupStocksBySector(stocks);

    for (const [sector, sectorStocks] of stocksBySector) {
      if (this.sectorDefinitions.has(sector)) {
        const sectorAnalysis = await this.analyzeSectorGroup(sector, sectorStocks);
        sectorComparison.set(sector, sectorAnalysis);
      }
    }

    console.log(`✅ セクター間比較分析完了: ${sectorComparison.size}セクター`);
    return sectorComparison;
  }

  /**
   * プライベートメソッド
   */
  private calculateRelativePosition(stockData: StockData, sector: string, benchmarks: SectorBenchmarks): SectorComparisonResult {
    let totalScore = 0;
    let evaluatedCriteria = 0;

    // 基本財務指標の相対評価
    const basicCriteria = ['dividendYield', 'equityRatio', 'per', 'pbr', 'operatingMargin', 'roe'];
    
    for (const criteria of basicCriteria) {
      const stockValue = this.getStockValue(stockData, criteria);
      const benchmarkValue = benchmarks[criteria as keyof SectorBenchmarks] as number;
      
      if (stockValue !== undefined && benchmarkValue !== undefined) {
        const relativeScore = this.calculateRelativeScore(stockValue, benchmarkValue, criteria);
        totalScore += relativeScore;
        evaluatedCriteria++;
      }
    }

    const averageScore = evaluatedCriteria > 0 ? totalScore / evaluatedCriteria : 50;
    const percentile = this.scoreToPercentile(averageScore);
    
    return {
      sectorName: sector,
      rank: this.percentileToRank(percentile),
      percentile,
      relativePeerScore: averageScore,
      competitiveAdvantages: this.identifyCompetitiveAdvantages(stockData, benchmarks),
      competitiveDisadvantages: this.identifyCompetitiveDisadvantages(stockData, benchmarks),
      marketPosition: this.determineMarketPosition(averageScore, percentile)
    };
  }

  private async evaluateCustomMetrics(stockData: StockData, sectorDef: SectorDefinition): Promise<SectorSpecificMetrics> {
    const metrics: SectorSpecificMetrics = {
      sectorName: sectorDef.name,
      customScores: new Map(),
      overallCustomScore: 0
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const criteria of sectorDef.customCriteria) {
      const value = this.getCustomMetricValue(stockData, criteria.name);
      
      if (value !== undefined) {
        const score = this.evaluateCustomCriteria(value, criteria);
        metrics.customScores.set(criteria.name, {
          value,
          score,
          benchmark: criteria.benchmarkValue,
          description: criteria.description
        });

        totalWeightedScore += score * criteria.weight;
        totalWeight += criteria.weight;
      }
    }

    metrics.overallCustomScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    return metrics;
  }

  private performCompetitiveAnalysis(stockData: StockData, sector: string): { position: any; analysis: any } {
    const marketCap = stockData.marketCap || 0;
    const operatingMargin = stockData.operatingMargin || 0;
    const roe = stockData.roe || 0;

    let position;
    
    if (marketCap > 1000000000000 && operatingMargin > 15 && roe > 15) {
      position = 'LEADER';
    } else if (marketCap > 100000000000 && operatingMargin > 10) {
      position = 'CHALLENGER';
    } else if (marketCap > 10000000000) {
      position = 'FOLLOWER';
    } else {
      position = 'NICHE';
    }

    return {
      position,
      analysis: {
        marketCapRank: this.getMarketCapRank(marketCap, sector),
        profitabilityRank: this.getProfitabilityRank(operatingMargin, sector)
      }
    };
  }

  private calculateOverallSectorScore(
    relativePosition: SectorComparisonResult,
    customMetrics: SectorSpecificMetrics,
    competitiveAnalysis: any
  ): number {
    
    const weights = { relative: 0.4, custom: 0.4, competitive: 0.2 };
    const competitiveScore = this.getCompetitiveScore(competitiveAnalysis.position);
    
    return (
      relativePosition.relativePeerScore * weights.relative +
      customMetrics.overallCustomScore * weights.custom +
      competitiveScore * weights.competitive
    );
  }

  private calculateRelativeScore(stockValue: number, benchmarkValue: number, criteria: string): number {
    const ratio = stockValue / benchmarkValue;
    
    // PERとPBRは低い方が良い
    if (criteria === 'per' || criteria === 'pbr') {
      if (ratio <= 0.8) return 100;
      if (ratio <= 1.0) return 80;
      if (ratio <= 1.2) return 60;
      return 40;
    } else {
      // その他は高い方が良い
      if (ratio >= 1.2) return 100;
      if (ratio >= 1.0) return 80;
      if (ratio >= 0.8) return 60;
      return 40;
    }
  }

  private evaluateCustomCriteria(value: number, criteria: SectorCustomCriteria): number {
    const { min, max } = criteria.optimalRange;
    
    if (value >= min && value <= max) {
      return 100;
    } else if (value < min) {
      return Math.max(0, (value / min) * 100);
    } else {
      return Math.max(0, 100 - ((value - max) / max) * 50);
    }
  }

  private getStockValue(stockData: StockData, criteria: string): number | undefined {
    switch (criteria) {
      case 'dividendYield': return stockData.dividendYield;
      case 'equityRatio': return stockData.equityRatio;
      case 'per': return stockData.per;
      case 'pbr': return stockData.pbr;
      case 'operatingMargin': return stockData.operatingMargin;
      case 'roe': return stockData.roe;
      default: return undefined;
    }
  }

  private getCustomMetricValue(stockData: StockData, metricName: string): number | undefined {
    switch (metricName) {
      case 'rdIntensity': return stockData.rdIntensity;
      case 'employeeProductivity': return stockData.employeeProductivity;
      case 'inventoryTurnover': return stockData.inventoryTurnover;
      case 'capexEfficiency': return stockData.capexEfficiency;
      case 'rdPipelineStrength': return stockData.rdPipelineStrength;
      case 'patentLife': return stockData.patentLife;
      case 'assetTurnover': return stockData.assetTurnover;
      case 'cashConversion': return stockData.cashConversion;
      default: return undefined;
    }
  }

  private scoreToPercentile(score: number): number {
    return Math.max(0, Math.min(100, score));
  }

  private percentileToRank(percentile: number): number {
    return Math.round(101 - percentile);
  }

  private getCompetitiveScore(position: string): number {
    switch (position) {
      case 'LEADER': return 90;
      case 'CHALLENGER': return 75;
      case 'FOLLOWER': return 60;
      case 'NICHE': return 45;
      default: return 50;
    }
  }

  private determineMarketPosition(score: number, percentile: number): 'LEADER' | 'CHALLENGER' | 'FOLLOWER' | 'NICHE' {
    if (percentile >= 90) return 'LEADER';
    if (percentile >= 75) return 'CHALLENGER';
    if (percentile >= 50) return 'FOLLOWER';
    return 'NICHE';
  }

  private identifyCompetitiveAdvantages(stockData: StockData, benchmarks: SectorBenchmarks): string[] {
    const advantages: string[] = [];
    
    if ((stockData.operatingMargin || 0) > (benchmarks.operatingMargin * 1.2)) {
      advantages.push('優秀な収益性');
    }
    if ((stockData.roe || 0) > (benchmarks.roe * 1.2)) {
      advantages.push('高い資本効率');
    }
    
    return advantages;
  }

  private identifyCompetitiveDisadvantages(stockData: StockData, benchmarks: SectorBenchmarks): string[] {
    const disadvantages: string[] = [];
    
    if ((stockData.operatingMargin || 0) < (benchmarks.operatingMargin * 0.8)) {
      disadvantages.push('収益性の課題');
    }
    if ((stockData.equityRatio || 0) < (benchmarks.equityRatio * 0.8)) {
      disadvantages.push('財務安定性の課題');
    }
    
    return disadvantages;
  }

  private getSectorRiskFactors(sectorDef: SectorDefinition): string[] {
    return sectorDef.riskFactors;
  }

  private assessRiskLevel(stockData: StockData, sectorDef: SectorDefinition): 'LOW' | 'MEDIUM' | 'HIGH' {
    // セクター別リスク評価
    let riskScore = 0;
    
    if ((stockData.equityRatio || 0) < 30) riskScore += 1;
    if ((stockData.operatingMargin || 0) < 5) riskScore += 1;
    
    if (riskScore >= 2) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private assessGrowthPotential(stockData: StockData, sectorDef: SectorDefinition): 'LOW' | 'MEDIUM' | 'HIGH' {
    // 成長性評価
    if ((stockData.roe || 0) > 15 && (stockData.operatingMargin || 0) > 10) return 'HIGH';
    if ((stockData.roe || 0) > 10) return 'MEDIUM';
    return 'LOW';
  }

  private identifyKeyStrengths(stockData: StockData, sectorDef: SectorDefinition): string[] {
    const strengths: string[] = [];
    
    if ((stockData.operatingMargin || 0) > 15) strengths.push('高い収益性');
    if ((stockData.roe || 0) > 15) strengths.push('優秀な資本効率');
    
    return strengths;
  }

  private identifyImprovementAreas(stockData: StockData, sectorDef: SectorDefinition): string[] {
    const areas: string[] = [];
    
    if ((stockData.operatingMargin || 0) < 5) areas.push('収益性の改善');
    if ((stockData.equityRatio || 0) < 40) areas.push('財務安定性の強化');
    
    return areas;
  }

  private generateSectorOutlook(sector: string): string {
    const outlooks = {
      '情報・通信': 'DXの進展により中長期的な成長が期待される',
      '輸送用機器': '電動化・自動運転などの技術革新が業界を変革',
      '医薬品': '高齢化社会の進展により安定的な需要増加',
      '卸売業': 'デジタル化による効率化と新たなビジネスモデル創出'
    };
    
    return outlooks[sector as keyof typeof outlooks] || '業界動向に注視が必要';
  }

  private groupStocksBySector(stocks: StockData[]): Map<string, StockData[]> {
    const grouped = new Map<string, StockData[]>();
    
    stocks.forEach(stock => {
      const sector = stock.sector || '不明';
      const existing = grouped.get(sector) || [];
      existing.push(stock);
      grouped.set(sector, existing);
    });
    
    return grouped;
  }

  private async analyzeSectorGroup(sector: string, stocks: StockData[]): Promise<any> {
    const analyses = await Promise.all(
      stocks.map(stock => this.analyzeBySector(stock))
    );
    
    return {
      sector,
      stockCount: stocks.length,
      averageScore: analyses.reduce((sum, a) => sum + a.overallSectorScore, 0) / analyses.length,
      topPerformers: analyses.sort((a, b) => b.overallSectorScore - a.overallSectorScore).slice(0, 3)
    };
  }

  private getMarketCapRank(marketCap: number, sector: string): number {
    // 簡易的なランク算出
    if (marketCap > 1000000000000) return 1;
    if (marketCap > 500000000000) return 2;
    if (marketCap > 100000000000) return 3;
    return 4;
  }

  private getProfitabilityRank(operatingMargin: number, sector: string): number {
    if (operatingMargin > 20) return 1;
    if (operatingMargin > 15) return 2;
    if (operatingMargin > 10) return 3;
    return 4;
  }

  private initializeSectorDefinitions(): void {
    this.SECTOR_DEFINITIONS.forEach(sector => {
      this.sectorDefinitions.set(sector.name, sector);
    });
  }

  private initializeSectorBenchmarks(): void {
    Object.entries(this.SECTOR_BENCHMARKS).forEach(([sector, benchmarks]) => {
      this.sectorBenchmarks.set(sector, benchmarks);
    });
  }

  private recordSectorAnalysis(analysis: SectorAnalysis): void {
    this.sectorAnalysisHistory.push(analysis);
    
    if (this.sectorAnalysisHistory.length > 1000) {
      this.sectorAnalysisHistory = this.sectorAnalysisHistory.slice(-500);
    }
  }
}

// シングルトンインスタンスのエクスポート
export const sectorSpecificCriteriaEngine = new SectorSpecificCriteriaEngine();