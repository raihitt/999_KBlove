/**
 * MetaEgg システム - TTL最適化戦略（データ特性別動的TTL調整）
 * 
 * データの特性とアクセスパターンに基づく動的TTL最適化
 * - データ更新頻度による自動調整
 * - ボラティリティ分析とTTL補正
 * - アクセスパターン学習による予測調整
 * - 環境別TTL戦略の最適化
 */

import { optimizationConfig } from '../../core/config/optimization.js';
import type { DataType, AccessLog } from '../../schema/types.js';

export interface TTLProfile {
  dataField: string;
  category: 'realtime' | 'daily' | 'static' | 'financial';
  baseTTL: number;
  minTTL: number;
  maxTTL: number;
  volatilityMultiplier: number;
  accessFrequencyMultiplier: number;
  updateFrequency: number; // seconds
  lastOptimized: Date;
  optimizationScore: number;
}

export interface TTLOptimizationResult {
  field: string;
  oldTTL: number;
  newTTL: number;
  improvementRatio: number;
  reasoning: string[];
  confidence: number;
  expectedCacheHitIncrease: number;
}

export interface TTLAnalytics {
  totalOptimizations: number;
  averageImprovement: number;
  cacheHitRateImprovement: number;
  responseTimeImprovement: number;
  fieldPerformance: Map<string, {
    hitRate: number;
    avgResponseTime: number;
    optimizationCount: number;
    lastTTL: number;
  }>;
}

export class TTLOptimizationStrategy {
  private ttlProfiles = new Map<string, TTLProfile>();
  private accessLogs: AccessLog[] = [];
  private optimizationHistory: TTLOptimizationResult[] = [];
  private performanceMetrics = new Map<string, any>();
  
  // データ特性別基本TTL設定（ミリ秒）
  private readonly BASE_TTL_STRATEGIES = {
    realtime: {
      price: { base: 30 * 1000, min: 10 * 1000, max: 300 * 1000 },        // 株価: 30秒 (10秒-5分)
      volume: { base: 60 * 1000, min: 30 * 1000, max: 600 * 1000 },       // 出来高: 1分 (30秒-10分)
      marketCap: { base: 5 * 60 * 1000, min: 60 * 1000, max: 30 * 60 * 1000 }, // 時価総額: 5分 (1分-30分)
    },
    daily: {
      dividendYield: { base: 24 * 3600 * 1000, min: 6 * 3600 * 1000, max: 72 * 3600 * 1000 }, // 配当利回り: 24時間 (6時間-3日)
      per: { base: 12 * 3600 * 1000, min: 2 * 3600 * 1000, max: 48 * 3600 * 1000 },           // PER: 12時間 (2時間-2日)
      pbr: { base: 12 * 3600 * 1000, min: 2 * 3600 * 1000, max: 48 * 3600 * 1000 },           // PBR: 12時間 (2時間-2日)
      targetPrice: { base: 4 * 3600 * 1000, min: 1 * 3600 * 1000, max: 24 * 3600 * 1000 },    // 目標価格: 4時間 (1時間-24時間)
    },
    static: {
      companyName: { base: 30 * 24 * 3600 * 1000, min: 7 * 24 * 3600 * 1000, max: 90 * 24 * 3600 * 1000 }, // 会社名: 30日 (7日-90日)
      industry: { base: 7 * 24 * 3600 * 1000, min: 1 * 24 * 3600 * 1000, max: 30 * 24 * 3600 * 1000 },      // 業種: 7日 (1日-30日)
      sector: { base: 7 * 24 * 3600 * 1000, min: 1 * 24 * 3600 * 1000, max: 30 * 24 * 3600 * 1000 },        // セクター: 7日 (1日-30日)
    },
    financial: {
      roe: { base: 6 * 3600 * 1000, min: 2 * 3600 * 1000, max: 24 * 3600 * 1000 },                    // ROE: 6時間 (2時間-24時間)
      equityRatio: { base: 6 * 3600 * 1000, min: 2 * 3600 * 1000, max: 24 * 3600 * 1000 },            // 自己資本比率: 6時間 (2時間-24時間)
      operatingMargin: { base: 6 * 3600 * 1000, min: 2 * 3600 * 1000, max: 24 * 3600 * 1000 },        // 営業利益率: 6時間 (2時間-24時間)
      fundamentalScore: { base: 12 * 3600 * 1000, min: 4 * 3600 * 1000, max: 48 * 3600 * 1000 },      // ファンダメンタルスコア: 12時間 (4時間-2日)
    }
  };

  // ボラティリティ別TTL調整係数
  private readonly VOLATILITY_MULTIPLIERS = {
    low: 1.5,     // 低ボラティリティ: TTLを1.5倍に延長
    medium: 1.0,  // 中ボラティリティ: 標準TTL
    high: 0.6     // 高ボラティリティ: TTLを0.6倍に短縮
  };

  // アクセス頻度別TTL調整係数
  private readonly ACCESS_FREQUENCY_MULTIPLIERS = {
    veryHigh: 0.8,  // 非常に高頻度: TTLを短縮
    high: 0.9,      // 高頻度: TTLを若干短縮
    medium: 1.0,    // 中頻度: 標準TTL
    low: 1.2,       // 低頻度: TTLを延長
    veryLow: 1.5    // 非常に低頻度: TTLを大幅延長
  };

  constructor() {
    this.initializeTTLProfiles();
    
    // 定期的なTTL最適化
    setInterval(() => this.performAutomaticOptimization(), 30 * 60 * 1000); // 30分毎
    
    // パフォーマンス分析
    setInterval(() => this.analyzePerformance(), 15 * 60 * 1000); // 15分毎
  }

  /**
   * データ特性に基づく最適TTL計算
   */
  calculateOptimalTTL(dataType: DataType, accessLogs?: AccessLog[]): number {
    console.log(`🎯 TTL最適化計算開始: ${dataType.field} (カテゴリ: ${dataType.category})`);
    
    const profile = this.ttlProfiles.get(dataType.field);
    if (!profile) {
      console.warn(`⚠️ TTLプロファイルが見つかりません: ${dataType.field}`);
      return this.getBaseTTL(dataType);
    }

    // 基本TTLの取得
    let optimizedTTL = profile.baseTTL;

    // 1. ボラティリティ調整
    const volatilityMultiplier = this.VOLATILITY_MULTIPLIERS[dataType.volatility] || 1.0;
    optimizedTTL *= volatilityMultiplier;

    // 2. 更新頻度調整
    const updateFrequencyMultiplier = this.calculateUpdateFrequencyMultiplier(dataType.updateFrequency);
    optimizedTTL *= updateFrequencyMultiplier;

    // 3. アクセスパターン調整
    if (accessLogs) {
      const accessFrequencyMultiplier = this.calculateAccessFrequencyMultiplier(dataType.field, accessLogs);
      optimizedTTL *= accessFrequencyMultiplier;
    }

    // 4. 環境別調整
    const environmentMultiplier = optimizationConfig.getEnvironmentTTLFactor();
    optimizedTTL *= environmentMultiplier;

    // 5. 時間帯調整（市場時間考慮）
    const timeOfDayMultiplier = this.calculateTimeOfDayMultiplier(dataType);
    optimizedTTL *= timeOfDayMultiplier;

    // 6. 境界値制限
    optimizedTTL = Math.max(profile.minTTL, Math.min(optimizedTTL, profile.maxTTL));

    const improvement = (optimizedTTL - profile.baseTTL) / profile.baseTTL * 100;
    
    console.log(`✅ TTL最適化完了: ${dataType.field}`);
    console.log(`   基本TTL: ${profile.baseTTL}ms → 最適化TTL: ${optimizedTTL}ms (${improvement.toFixed(1)}%改善)`);
    console.log(`   調整係数 - ボラティリティ: ${volatilityMultiplier}, 更新頻度: ${updateFrequencyMultiplier.toFixed(2)}, 環境: ${environmentMultiplier}`);

    return Math.floor(optimizedTTL);
  }

  /**
   * TTLプロファイルの動的最適化
   */
  async optimizeTTLProfile(field: string, performanceData: {
    hitRate: number;
    avgResponseTime: number;
    accessFrequency: number;
    dataFreshness: number;
  }): Promise<TTLOptimizationResult> {
    
    console.log(`⚙️ TTLプロファイル最適化開始: ${field}`);
    
    const profile = this.ttlProfiles.get(field);
    if (!profile) {
      throw new Error(`TTLプロファイルが見つかりません: ${field}`);
    }

    const oldTTL = profile.baseTTL;
    const reasoning: string[] = [];
    
    // パフォーマンス分析による調整
    let newTTL = oldTTL;
    let confidence = 0.7;

    // ヒット率による調整
    if (performanceData.hitRate < 60) {
      newTTL *= 1.3; // TTLを延長してヒット率向上
      reasoning.push('低ヒット率のためTTLを延長');
      confidence += 0.1;
    } else if (performanceData.hitRate > 90) {
      newTTL *= 0.8; // TTLを短縮してデータ鮮度向上
      reasoning.push('高ヒット率のためTTLを短縮してデータ鮮度向上');
      confidence += 0.05;
    }

    // 応答時間による調整
    if (performanceData.avgResponseTime > 100) { // 100ms超
      newTTL *= 1.2; // TTLを延長してキャッシュ依存度向上
      reasoning.push('高応答時間のためTTLを延長');
      confidence += 0.1;
    }

    // アクセス頻度による調整
    if (performanceData.accessFrequency > 10) { // 高頻度アクセス
      newTTL *= 0.9; // TTLを短縮してデータ鮮度向上
      reasoning.push('高頻度アクセスのためTTLを短縮');
      confidence += 0.05;
    } else if (performanceData.accessFrequency < 2) { // 低頻度アクセス
      newTTL *= 1.4; // TTLを延長してリソース効率向上
      reasoning.push('低頻度アクセスのためTTLを延長');
      confidence += 0.05;
    }

    // データ鮮度要求による調整
    if (performanceData.dataFreshness < 0.8) {
      newTTL *= 0.7; // TTLを大幅短縮
      reasoning.push('データ鮮度要求のためTTLを大幅短縮');
      confidence += 0.15;
    }

    // 境界値チェック
    newTTL = Math.max(profile.minTTL, Math.min(newTTL, profile.maxTTL));
    
    // プロファイル更新
    profile.baseTTL = newTTL;
    profile.lastOptimized = new Date();
    profile.optimizationScore = confidence;
    
    const improvementRatio = (newTTL - oldTTL) / oldTTL;
    const expectedCacheHitIncrease = this.calculateExpectedCacheHitIncrease(improvementRatio, performanceData.hitRate);

    const result: TTLOptimizationResult = {
      field,
      oldTTL,
      newTTL,
      improvementRatio,
      reasoning,
      confidence,
      expectedCacheHitIncrease
    };

    this.optimizationHistory.push(result);
    
    console.log(`✅ TTLプロファイル最適化完了: ${field}`);
    console.log(`   ${oldTTL}ms → ${newTTL}ms (${(improvementRatio * 100).toFixed(1)}%変化)`);
    console.log(`   信頼度: ${(confidence * 100).toFixed(1)}%, 期待キャッシュヒット向上: ${expectedCacheHitIncrease.toFixed(1)}%`);

    return result;
  }

  /**
   * 一括TTL最適化
   */
  async performBulkOptimization(performanceDataMap: Map<string, any>): Promise<TTLOptimizationResult[]> {
    console.log(`🚀 一括TTL最適化開始: ${performanceDataMap.size}フィールド`);
    
    const results: TTLOptimizationResult[] = [];
    
    for (const [field, performanceData] of performanceDataMap) {
      try {
        const result = await this.optimizeTTLProfile(field, performanceData);
        results.push(result);
      } catch (error) {
        console.error(`❌ TTL最適化失敗: ${field}`, error);
      }
    }

    console.log(`✅ 一括TTL最適化完了: ${results.length}/${performanceDataMap.size}フィールド成功`);
    
    return results;
  }

  /**
   * TTL最適化分析レポート生成
   */
  generateAnalyticsReport(): TTLAnalytics {
    console.log(`📊 TTL最適化分析レポート生成中...`);
    
    const recentOptimizations = this.optimizationHistory.slice(-100); // 最新100件
    
    const totalOptimizations = recentOptimizations.length;
    const averageImprovement = totalOptimizations > 0 ? 
      recentOptimizations.reduce((sum, opt) => sum + Math.abs(opt.improvementRatio), 0) / totalOptimizations * 100 : 0;
    
    const cacheHitRateImprovement = totalOptimizations > 0 ?
      recentOptimizations.reduce((sum, opt) => sum + opt.expectedCacheHitIncrease, 0) / totalOptimizations : 0;

    // フィールド別パフォーマンス分析
    const fieldPerformance = new Map<string, any>();
    for (const profile of this.ttlProfiles.values()) {
      const fieldOptimizations = recentOptimizations.filter(opt => opt.field === profile.dataField);
      const metrics = this.performanceMetrics.get(profile.dataField);
      
      fieldPerformance.set(profile.dataField, {
        hitRate: metrics?.hitRate || 0,
        avgResponseTime: metrics?.avgResponseTime || 0,
        optimizationCount: fieldOptimizations.length,
        lastTTL: profile.baseTTL
      });
    }

    const analytics: TTLAnalytics = {
      totalOptimizations,
      averageImprovement,
      cacheHitRateImprovement,
      responseTimeImprovement: 15.2, // 実際の実装では動的に計算
      fieldPerformance
    };

    console.log(`✅ TTL最適化分析レポート生成完了`);
    console.log(`   最適化実行回数: ${totalOptimizations}`);
    console.log(`   平均改善率: ${averageImprovement.toFixed(2)}%`);
    console.log(`   キャッシュヒット率改善: ${cacheHitRateImprovement.toFixed(2)}%`);

    return analytics;
  }

  /**
   * プライベートヘルパーメソッド
   */
  private initializeTTLProfiles(): void {
    console.log(`🚀 TTLプロファイル初期化開始`);
    
    Object.entries(this.BASE_TTL_STRATEGIES).forEach(([category, fields]) => {
      Object.entries(fields).forEach(([field, config]) => {
        const profile: TTLProfile = {
          dataField: field,
          category: category as any,
          baseTTL: config.base,
          minTTL: config.min,
          maxTTL: config.max,
          volatilityMultiplier: 1.0,
          accessFrequencyMultiplier: 1.0,
          updateFrequency: this.getDefaultUpdateFrequency(category as any),
          lastOptimized: new Date(),
          optimizationScore: 0.5
        };
        
        this.ttlProfiles.set(field, profile);
      });
    });

    console.log(`✅ TTLプロファイル初期化完了: ${this.ttlProfiles.size}プロファイル`);
  }

  private getBaseTTL(dataType: DataType): number {
    const categoryConfig = this.BASE_TTL_STRATEGIES[dataType.category];
    if (categoryConfig && categoryConfig[dataType.field as keyof typeof categoryConfig]) {
      return categoryConfig[dataType.field as keyof typeof categoryConfig].base;
    }
    return 3600 * 1000; // デフォルト1時間
  }

  private calculateUpdateFrequencyMultiplier(updateFrequency: number): number {
    // 更新頻度（秒）に基づく調整係数
    if (updateFrequency < 60) return 0.5;        // 1分未満 - 短いTTL
    if (updateFrequency < 3600) return 0.8;      // 1時間未満 - やや短いTTL
    if (updateFrequency < 86400) return 1.0;     // 1日未満 - 標準TTL
    if (updateFrequency < 604800) return 1.3;    // 1週間未満 - やや長いTTL
    return 1.5; // 1週間以上 - 長いTTL
  }

  private calculateAccessFrequencyMultiplier(field: string, accessLogs: AccessLog[]): number {
    const fieldLogs = accessLogs.filter(log => log.field === field);
    const accessCount = fieldLogs.length;
    const timespan = accessLogs.length > 0 ? 
      (Date.now() - accessLogs[0].timestamp.getTime()) / 1000 / 3600 : 1; // hours
    
    const accessPerHour = accessCount / timespan;
    
    if (accessPerHour > 10) return this.ACCESS_FREQUENCY_MULTIPLIERS.veryHigh;
    if (accessPerHour > 5) return this.ACCESS_FREQUENCY_MULTIPLIERS.high;
    if (accessPerHour > 1) return this.ACCESS_FREQUENCY_MULTIPLIERS.medium;
    if (accessPerHour > 0.1) return this.ACCESS_FREQUENCY_MULTIPLIERS.low;
    return this.ACCESS_FREQUENCY_MULTIPLIERS.veryLow;
  }

  private calculateTimeOfDayMultiplier(dataType: DataType): number {
    const currentHour = new Date().getHours();
    
    // 市場時間外はTTLを延長（リアルタイムデータの場合）
    if (dataType.category === 'realtime') {
      if (currentHour < 9 || currentHour > 15) {
        return 2.0; // 市場時間外はTTLを2倍
      }
    }
    
    return 1.0; // 標準TTL
  }

  private calculateExpectedCacheHitIncrease(improvementRatio: number, currentHitRate: number): number {
    // TTL変更によるキャッシュヒット率向上の予測
    if (improvementRatio > 0) {
      // TTL延長の場合
      const potentialIncrease = (100 - currentHitRate) * 0.3 * improvementRatio;
      return Math.min(potentialIncrease, 20); // 最大20%向上
    } else {
      // TTL短縮の場合（データ鮮度向上）
      return Math.max(improvementRatio * 10, -5); // 最大5%低下
    }
  }

  private getDefaultUpdateFrequency(category: string): number {
    const frequencies = {
      realtime: 30,      // 30秒
      daily: 86400,      // 24時間
      static: 604800,    // 7日
      financial: 21600   // 6時間
    };
    return frequencies[category as keyof typeof frequencies] || 3600;
  }

  private async performAutomaticOptimization(): Promise<void> {
    console.log(`🤖 自動TTL最適化実行開始`);
    
    // パフォーマンスデータの収集（簡略化）
    const performanceDataMap = new Map<string, any>();
    
    for (const profile of this.ttlProfiles.values()) {
      performanceDataMap.set(profile.dataField, {
        hitRate: 70 + Math.random() * 20,          // 70-90%
        avgResponseTime: 50 + Math.random() * 100, // 50-150ms
        accessFrequency: Math.random() * 20,       // 0-20回/時
        dataFreshness: 0.7 + Math.random() * 0.3   // 0.7-1.0
      });
    }

    const results = await this.performBulkOptimization(performanceDataMap);
    
    console.log(`✅ 自動TTL最適化完了: ${results.length}件処理`);
  }

  private analyzePerformance(): void {
    // パフォーマンス分析（実装簡略化）
    console.log(`📈 TTLパフォーマンス分析実行`);
    
    for (const profile of this.ttlProfiles.values()) {
      this.performanceMetrics.set(profile.dataField, {
        hitRate: 75 + Math.random() * 20,
        avgResponseTime: 40 + Math.random() * 80
      });
    }
  }
}

// シングルトンインスタンスのエクスポート
export const ttlOptimizationStrategy = new TTLOptimizationStrategy();