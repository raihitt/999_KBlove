/**
 * MetaEgg システム - 統合フェッチャーアーキテクチャ
 * 
 * データ取得システムの統一インターフェースと品質保証機能
 * - 統一API による一貫した データ取得
 * - ヘルスチェックと監視機能
 * - データバリデーションと異常値検知
 * - レート制限とエラーハンドリング
 */

import type { 
  UnifiedFetcher, 
  FetchOptions, 
  FetcherCapabilities, 
  HealthStatus, 
  ValidationResult, 
  AnomalyResult 
} from '../../schema/types.js';

export abstract class BaseUnifiedFetcher implements UnifiedFetcher {
  public abstract readonly name: string;
  protected lastHealthCheck: Date = new Date(0);
  protected healthStatus: HealthStatus = {
    status: 'unhealthy',
    lastCheck: new Date(0),
    responseTime: 0,
    errorRate: 0,
    uptime: 0
  };
  protected requestCount: number = 0;
  protected errorCount: number = 0;
  protected startTime: Date = new Date();

  /**
   * 単一フィールドデータ取得
   */
  abstract fetch<T>(field: string, code: string, options?: FetchOptions): Promise<T | undefined>;

  /**
   * バッチデータ取得
   */
  async fetchBatch(fields: string[], code: string, options?: FetchOptions): Promise<Record<string, any>> {
    console.log(`📦 バッチ取得開始: ${this.name} - ${code} (${fields.length}フィールド)`);
    
    const results: Record<string, any> = {};
    const fetchPromises = fields.map(async (field) => {
      try {
        const value = await this.fetch(field, code, options);
        if (value !== undefined) {
          results[field] = value;
        }
      } catch (error) {
        console.error(`❌ フィールド取得失敗: ${field}`, error);
        results[field] = undefined;
      }
    });

    await Promise.allSettled(fetchPromises);
    
    console.log(`✅ バッチ取得完了: ${this.name} - ${code} (${Object.keys(results).length}/${fields.length}成功)`);
    return results;
  }

  /**
   * フェッチャー能力取得
   */
  abstract getCapabilities(): FetcherCapabilities;

  /**
   * ヘルスステータス取得
   */
  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * ヘルスチェック実行
   */
  async healthCheck(): Promise<boolean> {
    console.log(`🔍 ヘルスチェック開始: ${this.name}`);
    
    const startTime = Date.now();
    
    try {
      // テスト用の軽量リクエスト実行
      const testResult = await this.performHealthCheckRequest();
      
      const responseTime = Date.now() - startTime;
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
      const uptime = (Date.now() - this.startTime.getTime()) / 1000; // seconds

      this.healthStatus = {
        status: testResult ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime,
        errorRate,
        uptime
      };

      this.lastHealthCheck = new Date();
      
      console.log(`✅ ヘルスチェック完了: ${this.name} - ${this.healthStatus.status} (${responseTime}ms)`);
      return testResult;

    } catch (error) {
      console.error(`❌ ヘルスチェック失敗: ${this.name}`, error);
      
      this.healthStatus = {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        errorRate: 100,
        uptime: (Date.now() - this.startTime.getTime()) / 1000
      };

      return false;
    }
  }

  /**
   * データバリデーション
   */
  validate(field: string, value: any): ValidationResult {
    try {
      const validationRules = this.getValidationRules();
      const fieldRules = validationRules[field];
      
      if (!fieldRules) {
        return {
          isValid: true,
          confidence: 0.5,
          issues: [`フィールド "${field}" のバリデーションルールが未定義`]
        };
      }

      const issues: string[] = [];
      let confidence = 1.0;

      // 型チェック
      if (fieldRules.type && typeof value !== fieldRules.type) {
        issues.push(`期待される型: ${fieldRules.type}, 実際の型: ${typeof value}`);
        confidence -= 0.3;
      }

      // 範囲チェック
      if (fieldRules.range && typeof value === 'number') {
        const [min, max] = fieldRules.range;
        if (value < min || value > max) {
          issues.push(`値が範囲外: ${min}-${max}, 実際: ${value}`);
          confidence -= 0.4;
        }
      }

      // 必須チェック
      if (fieldRules.required && (value === null || value === undefined || value === '')) {
        issues.push(`必須フィールドが空`);
        confidence -= 0.5;
      }

      // パターンチェック
      if (fieldRules.pattern && typeof value === 'string') {
        if (!fieldRules.pattern.test(value)) {
          issues.push(`パターンマッチ失敗: ${fieldRules.pattern}`);
          confidence -= 0.2;
        }
      }

      return {
        isValid: issues.length === 0,
        confidence: Math.max(0, confidence),
        issues: issues.length > 0 ? issues : undefined,
        suggestedValue: this.getSuggestedValue(field, value, issues)
      };

    } catch (error) {
      console.error(`❌ バリデーション失敗: ${field}`, error);
      return {
        isValid: false,
        confidence: 0,
        issues: [`バリデーション処理エラー: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * 異常値検知
   */
  detectAnomaly(field: string, value: number, code: string): AnomalyResult {
    try {
      const historicalData = this.getHistoricalData(field, code);
      
      if (historicalData.length < 2) {
        return {
          isAnomaly: false,
          severity: 'low',
          confidence: 0.1,
          explanation: '十分な履歴データなし'
        };
      }

      const stats = this.calculateStatistics(historicalData);
      const zScore = Math.abs((value - stats.mean) / stats.stdDev);
      
      let severity: 'low' | 'medium' | 'high' = 'low';
      let isAnomaly = false;
      
      if (zScore > 3) {
        severity = 'high';
        isAnomaly = true;
      } else if (zScore > 2) {
        severity = 'medium';
        isAnomaly = true;
      } else if (zScore > 1.5) {
        severity = 'low';
        isAnomaly = true;
      }

      const confidence = Math.min(zScore / 3, 1.0);

      return {
        isAnomaly,
        severity,
        confidence,
        expectedRange: [stats.mean - 2 * stats.stdDev, stats.mean + 2 * stats.stdDev],
        explanation: `Z-Score: ${zScore.toFixed(2)}, 平均: ${stats.mean.toFixed(2)}, 標準偏差: ${stats.stdDev.toFixed(2)}`
      };

    } catch (error) {
      console.error(`❌ 異常値検知失敗: ${field}`, error);
      return {
        isAnomaly: false,
        severity: 'low',
        confidence: 0,
        explanation: `異常値検知エラー: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * リクエスト統計更新
   */
  protected updateRequestStats(success: boolean): void {
    this.requestCount++;
    if (!success) {
      this.errorCount++;
    }
  }

  /**
   * デフォルトオプション取得
   */
  protected getDefaultOptions(): Required<FetchOptions> {
    return {
      timeout: 30000,
      retries: 3,
      cache: true,
      priority: 'medium',
      context: {}
    };
  }

  /**
   * オプションマージ
   */
  protected mergeOptions(options?: FetchOptions): Required<FetchOptions> {
    const defaults = this.getDefaultOptions();
    return { ...defaults, ...options };
  }

  /**
   * 抽象メソッド（サブクラスで実装）
   */
  protected abstract performHealthCheckRequest(): Promise<boolean>;
  protected abstract getValidationRules(): Record<string, any>;
  protected abstract getHistoricalData(field: string, code: string): number[];
  protected abstract getSuggestedValue(field: string, value: any, issues: string[]): any;

  /**
   * プライベートヘルパーメソッド
   */
  private calculateStatistics(data: number[]): { mean: number; stdDev: number } {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }
}

/**
 * フェッチャーレジストリ - 統合フェッチャーの管理
 */
export class FetcherRegistry {
  private static instance: FetcherRegistry;
  private fetchers: Map<string, UnifiedFetcher> = new Map();
  private capabilities: Map<string, FetcherCapabilities> = new Map();

  private constructor() {}

  public static getInstance(): FetcherRegistry {
    if (!FetcherRegistry.instance) {
      FetcherRegistry.instance = new FetcherRegistry();
    }
    return FetcherRegistry.instance;
  }

  /**
   * フェッチャー登録
   */
  register(fetcher: UnifiedFetcher): void {
    console.log(`📝 フェッチャー登録: ${fetcher.name}`);
    
    this.fetchers.set(fetcher.name, fetcher);
    this.capabilities.set(fetcher.name, fetcher.getCapabilities());
    
    console.log(`✅ 登録完了: ${fetcher.name} (合計: ${this.fetchers.size}フェッチャー)`);
  }

  /**
   * フェッチャー取得
   */
  get(name: string): UnifiedFetcher | undefined {
    return this.fetchers.get(name);
  }

  /**
   * 全フェッチャー取得
   */
  getAll(): UnifiedFetcher[] {
    return Array.from(this.fetchers.values());
  }

  /**
   * フィールド対応フェッチャー検索
   */
  getCapableFetchers(field: string): UnifiedFetcher[] {
    const capable: UnifiedFetcher[] = [];
    
    for (const [name, fetcher] of this.fetchers) {
      const capabilities = this.capabilities.get(name);
      if (capabilities?.supportedFields.includes(field)) {
        capable.push(fetcher);
      }
    }

    // 信頼性でソート
    capable.sort((a, b) => {
      const capsA = this.capabilities.get(a.name);
      const capsB = this.capabilities.get(b.name);
      return (capsB?.reliability || 0) - (capsA?.reliability || 0);
    });

    return capable;
  }

  /**
   * 最適フェッチャー選択
   */
  getBestFetcher(field: string): UnifiedFetcher | undefined {
    const capable = this.getCapableFetchers(field);
    
    if (capable.length === 0) {
      return undefined;
    }

    // ヘルスステータスを考慮して選択
    const healthy = capable.filter(f => f.getHealthStatus().status === 'healthy');
    if (healthy.length > 0) {
      return healthy[0];
    }

    // 健全なフェッチャーがない場合は信頼性で選択
    return capable[0];
  }

  /**
   * 全フェッチャーヘルスチェック
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    console.log(`🏥 全フェッチャーヘルスチェック開始: ${this.fetchers.size}フェッチャー`);
    
    const results = new Map<string, boolean>();
    const promises = Array.from(this.fetchers.entries()).map(async ([name, fetcher]) => {
      try {
        const isHealthy = await fetcher.healthCheck();
        results.set(name, isHealthy);
        return { name, isHealthy };
      } catch (error) {
        console.error(`❌ ヘルスチェック失敗: ${name}`, error);
        results.set(name, false);
        return { name, isHealthy: false };
      }
    });

    const checkResults = await Promise.allSettled(promises);
    const healthyCount = Array.from(results.values()).filter(Boolean).length;
    
    console.log(`✅ ヘルスチェック完了: ${healthyCount}/${this.fetchers.size}フェッチャー健全`);
    
    return results;
  }

  /**
   * フェッチャー統計取得
   */
  getStatistics(): {
    totalFetchers: number;
    healthyFetchers: number;
    averageReliability: number;
    supportedFields: string[];
  } {
    const total = this.fetchers.size;
    const healthy = Array.from(this.fetchers.values())
      .filter(f => f.getHealthStatus().status === 'healthy').length;
    
    const reliabilities = Array.from(this.capabilities.values())
      .map(c => c.reliability);
    const avgReliability = reliabilities.length > 0 ? 
      reliabilities.reduce((sum, r) => sum + r, 0) / reliabilities.length : 0;

    const allFields = new Set<string>();
    for (const caps of this.capabilities.values()) {
      caps.supportedFields.forEach(field => allFields.add(field));
    }

    return {
      totalFetchers: total,
      healthyFetchers: healthy,
      averageReliability: avgReliability,
      supportedFields: Array.from(allFields)
    };
  }
}

// グローバルレジストリインスタンス
export const fetcherRegistry = FetcherRegistry.getInstance();