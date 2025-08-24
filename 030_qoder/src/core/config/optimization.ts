/**
 * MetaEgg システム効率化最適化 - 設定管理
 * 
 * 環境別最適化パラメータの管理と動的設定調整
 */

import type { 
  SystemConfig, 
  OptimizationConfig, 
  PerformanceMetrics,
  ResourceRequirements 
} from '../schema/types.js';
import { cpus, totalmem } from 'os';

export class OptimizationConfigManager {
  private static instance: OptimizationConfigManager;
  private config: SystemConfig;
  private performanceHistory: PerformanceMetrics[] = [];

  private constructor() {
    this.config = this.getDefaultConfig();
    this.adaptToEnvironment();
  }

  public static getInstance(): OptimizationConfigManager {
    if (!OptimizationConfigManager.instance) {
      OptimizationConfigManager.instance = new OptimizationConfigManager();
    }
    return OptimizationConfigManager.instance;
  }

  /**
   * デフォルト設定（効率化最適化対応）
   */
  private getDefaultConfig(): SystemConfig {
    const cpuCores = cpus().length;
    const totalMemory = Math.floor(totalmem() / (1024 * 1024)); // MB

    return {
      environment: (process.env.NODE_ENV as any) || 'development',
      optimization: {
        enableParallelProcessing: true,
        enableIntelligentCaching: true,
        enableSmartPipeline: true,
        enableErrorRecovery: true,
        maxConcurrency: Math.max(2, Math.floor(cpuCores * 0.8)),
        cacheStrategy: 'balanced',
        optimizationLevel: 'advanced'
      },
      fetchers: {
        yahoo: {
          enabled: true,
          priority: 1,
          rateLimits: {
            requestsPerSecond: 2,
            requestsPerMinute: 100
          }
        },
        irbank: {
          enabled: true,
          priority: 2,
          rateLimits: {
            requestsPerSecond: 1,
            requestsPerMinute: 50
          }
        },
        kabuyoho: {
          enabled: true,
          priority: 3,
          rateLimits: {
            requestsPerSecond: 1,
            requestsPerMinute: 30
          }
        }
      },
      cache: {
        ttlStrategy: 'adaptive',
        hierarchical: true,
        maxMemoryUsage: Math.floor(totalMemory * 0.3) // 30% of total memory
      },
      pipeline: {
        maxBatchSize: Math.max(10, Math.floor(cpuCores * 5)),
        enableParallelStages: true,
        resourceLimits: {
          memory: Math.floor(totalMemory * 0.5), // 50% of total memory
          cpu: Math.floor(cpuCores * 0.8),
          io: 'medium',
          network: true
        }
      }
    };
  }

  /**
   * 環境別設定適応
   */
  private adaptToEnvironment(): void {
    const env = this.config.environment;

    switch (env) {
      case 'development':
        this.config.optimization.optimizationLevel = 'basic';
        this.config.optimization.maxConcurrency = 2;
        this.config.pipeline.maxBatchSize = 5;
        break;

      case 'testing':
        this.config.optimization.optimizationLevel = 'basic';
        this.config.optimization.maxConcurrency = 1;
        this.config.pipeline.maxBatchSize = 3;
        this.config.cache.maxMemoryUsage = Math.floor(this.config.cache.maxMemoryUsage * 0.5);
        break;

      case 'staging':
        this.config.optimization.optimizationLevel = 'advanced';
        this.config.optimization.cacheStrategy = 'balanced';
        break;

      case 'production':
        this.config.optimization.optimizationLevel = 'maximum';
        this.config.optimization.cacheStrategy = 'aggressive';
        this.config.optimization.maxConcurrency = Math.max(4, cpus().length);
        break;
    }
  }

  /**
   * パフォーマンス履歴に基づく動的調整
   */
  public adaptBasedOnPerformance(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // 履歴を最新10件に制限
    if (this.performanceHistory.length > 10) {
      this.performanceHistory = this.performanceHistory.slice(-10);
    }

    // メモリ使用量が高い場合の調整
    if (metrics.memoryUsage.peak > this.config.cache.maxMemoryUsage * 0.9) {
      this.config.pipeline.maxBatchSize = Math.max(1, Math.floor(this.config.pipeline.maxBatchSize * 0.8));
      this.config.cache.maxMemoryUsage = Math.floor(this.config.cache.maxMemoryUsage * 0.9);
    }

    // キャッシュヒット率が低い場合の調整
    if (metrics.cachePerformance.hitRate < 60) {
      this.config.optimization.cacheStrategy = 'aggressive';
      this.config.cache.ttlStrategy = 'adaptive';
    }

    // エラー率が高い場合の調整
    if (metrics.errorRecovery.recoveryRate < 80) {
      this.config.optimization.maxConcurrency = Math.max(1, Math.floor(this.config.optimization.maxConcurrency * 0.7));
      this.config.fetchers.yahoo.rateLimits.requestsPerSecond = Math.max(1, this.config.fetchers.yahoo.rateLimits.requestsPerSecond - 1);
    }
  }

  /**
   * 最適化戦略の動的選択
   */
  public getOptimizedStrategy(dataSize: number, complexity: 'low' | 'medium' | 'high'): OptimizationConfig {
    const baseConfig = { ...this.config.optimization };

    // データサイズに基づく調整
    if (dataSize > 1000) {
      baseConfig.enableParallelProcessing = true;
      baseConfig.maxConcurrency = Math.max(baseConfig.maxConcurrency, 4);
    } else if (dataSize < 100) {
      baseConfig.enableParallelProcessing = false;
      baseConfig.maxConcurrency = 1;
    }

    // 複雑性に基づく調整
    switch (complexity) {
      case 'high':
        baseConfig.optimizationLevel = 'maximum';
        baseConfig.cacheStrategy = 'aggressive';
        break;
      case 'medium':
        baseConfig.optimizationLevel = 'advanced';
        baseConfig.cacheStrategy = 'balanced';
        break;
      case 'low':
        baseConfig.optimizationLevel = 'basic';
        baseConfig.cacheStrategy = 'conservative';
        break;
    }

    return baseConfig;
  }

  /**
   * リソース使用量の計算
   */
  public calculateResourceRequirements(batchSize: number, concurrency: number): ResourceRequirements {
    const memoryPerItem = 2; // MB per stock item
    const cpuUsageRatio = 0.8;

    return {
      memory: batchSize * memoryPerItem * concurrency,
      cpu: Math.ceil(concurrency * cpuUsageRatio),
      io: batchSize > 500 ? 'high' : batchSize > 100 ? 'medium' : 'low',
      network: true
    };
  }

  /**
   * TTL戦略の取得
   */
  public getTTLStrategy(): Record<string, Record<string, { ttl: number; description: string }>> {
    const baseMultiplier = this.config.cache.ttlStrategy === 'aggressive' ? 2 : 
                          this.config.cache.ttlStrategy === 'conservative' ? 0.5 : 1;

    return {
      basic: {
        name: { ttl: 7 * 24 * 60 * 60 * 1000 * baseMultiplier, description: '銘柄名（基本情報）' },
        industry: { ttl: 7 * 24 * 60 * 60 * 1000 * baseMultiplier, description: '業種（基本情報）' },
        sector: { ttl: 7 * 24 * 60 * 60 * 1000 * baseMultiplier, description: 'セクター（基本情報）' }
      },
      financial: {
        price: { ttl: 15 * 60 * 1000 * baseMultiplier, description: '株価（リアルタイム）' },
        per: { ttl: 60 * 60 * 1000 * baseMultiplier, description: 'PER（財務指標）' },
        pbr: { ttl: 60 * 60 * 1000 * baseMultiplier, description: 'PBR（財務指標）' },
        roe: { ttl: 60 * 60 * 1000 * baseMultiplier, description: 'ROE（財務指標）' },
        dividendYield: { ttl: 24 * 60 * 60 * 1000 * baseMultiplier, description: '配当利回り（日次更新）' }
      },
      market: {
        marketCap: { ttl: 5 * 60 * 1000 * baseMultiplier, description: '時価総額（市場データ）' },
        volume: { ttl: 1 * 60 * 1000 * baseMultiplier, description: '出来高（市場データ）' },
        volatility: { ttl: 30 * 60 * 1000 * baseMultiplier, description: 'ボラティリティ（市場データ）' }
      }
    };
  }

  /**
   * 環境別TTL調整係数
   */
  public getEnvironmentTTLFactor(): number {
    switch (this.config.environment) {
      case 'testing': return 0.1;    // テスト環境では短いTTL
      case 'development': return 0.5; // 開発環境では短めのTTL
      case 'staging': return 0.8;     // ステージング環境では本番より短い
      case 'production': return 1.0;  // 本番環境では標準TTL
      default: return 1.0;
    }
  }

  /**
   * 設定の取得
   */
  public getConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * 設定の更新
   */
  public updateConfig(updates: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * パフォーマンス履歴の取得
   */
  public getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * 最適化レポートの生成
   */
  public generateOptimizationReport(): {
    currentConfig: SystemConfig;
    recommendations: string[];
    metrics: PerformanceMetrics | null;
  } {
    const latestMetrics = this.performanceHistory[this.performanceHistory.length - 1];
    const recommendations: string[] = [];

    if (latestMetrics) {
      // パフォーマンス改善の推奨事項
      if (latestMetrics.cachePerformance.hitRate < 70) {
        recommendations.push('キャッシュ戦略を"aggressive"に変更してヒット率を向上させることを推奨');
      }

      if (latestMetrics.memoryUsage.peak > this.config.cache.maxMemoryUsage * 0.8) {
        recommendations.push('バッチサイズを削減してメモリ使用量を最適化することを推奨');
      }

      if (latestMetrics.errorRecovery.recoveryRate < 85) {
        recommendations.push('同時実行数を削減してエラー回復率を向上させることを推奨');
      }

      if (latestMetrics.processingSpeed.total > 60) {
        recommendations.push('並列処理を有効化して処理速度を向上させることを推奨');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('現在の設定は最適化されています');
    }

    return {
      currentConfig: this.getConfig(),
      recommendations,
      metrics: latestMetrics || null
    };
  }
}

// シングルトンインスタンスのエクスポート
export const optimizationConfig = OptimizationConfigManager.getInstance();