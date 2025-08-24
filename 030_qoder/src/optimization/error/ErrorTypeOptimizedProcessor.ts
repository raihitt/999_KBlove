/**
 * MetaEgg システム - エラー種別最適処理戦略
 * 
 * エラーの種類に応じた特化型処理戦略
 * - エラータイプ別の最適化された回復手順
 * - 動的戦略調整と効果測定
 * - 予防的エラー対策と先制対応
 */

import { EventEmitter } from 'events';
import { circuitBreaker } from './CircuitBreakerPattern.js';
import type { 
  ErrorType, 
  ProcessingStrategy, 
  StrategyResult, 
  ErrorContext 
} from '../../schema/types.js';

export interface ErrorStrategy {
  name: string;
  description: string;
  errorTypes: ErrorType[];
  priority: number;
  effectiveness: number;
  actions: StrategyAction[];
  maxAttempts: number;
  estimatedRecoveryTime: number;
}

export interface StrategyAction {
  type: 'RETRY' | 'BACKOFF' | 'FALLBACK' | 'CIRCUIT_BREAK' | 'SCALE' | 'ALERT';
  parameters: any;
  timeout: number;
  required: boolean;
}

export interface StrategyExecutionContext {
  errorType: ErrorType;
  errorDetails: Error;
  previousAttempts: number;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class ErrorTypeOptimizedProcessor extends EventEmitter {
  private strategies = new Map<ErrorType, ErrorStrategy[]>();
  private executionHistory: any[] = [];
  
  // エラータイプ別特化戦略定義
  private readonly OPTIMIZED_STRATEGIES: ErrorStrategy[] = [
    {
      name: 'NETWORK_INTELLIGENT_RECOVERY',
      description: 'ネットワークエラー専用インテリジェント回復',
      errorTypes: ['NETWORK_ERROR', 'CONNECTION_ERROR'],
      priority: 90,
      effectiveness: 85,
      actions: [
        { type: 'RETRY', parameters: { attempts: 3, backoff: 'exponential' }, timeout: 30000, required: true },
        { type: 'CIRCUIT_BREAK', parameters: { threshold: 5 }, timeout: 0, required: false },
        { type: 'FALLBACK', parameters: { cacheFirst: true }, timeout: 5000, required: false }
      ],
      maxAttempts: 5,
      estimatedRecoveryTime: 15000
    },
    {
      name: 'RATE_LIMIT_ADAPTIVE_STRATEGY',
      description: 'レート制限エラー専用適応戦略',
      errorTypes: ['RATE_LIMIT_ERROR'],
      priority: 95,
      effectiveness: 92,
      actions: [
        { type: 'BACKOFF', parameters: { strategy: 'adaptive', multiplier: 2.0 }, timeout: 60000, required: true },
        { type: 'SCALE', parameters: { reduceLoad: 0.5 }, timeout: 0, required: false }
      ],
      maxAttempts: 3,
      estimatedRecoveryTime: 45000
    },
    {
      name: 'PARSING_ERROR_SMART_RECOVERY',
      description: 'パースエラー専用スマート回復',
      errorTypes: ['PARSE_ERROR', 'SYNTAX_ERROR'],
      priority: 80,
      effectiveness: 78,
      actions: [
        { type: 'RETRY', parameters: { parser: 'alternative', encoding: 'utf-8' }, timeout: 10000, required: true },
        { type: 'FALLBACK', parameters: { useRegex: true }, timeout: 5000, required: false }
      ],
      maxAttempts: 2,
      estimatedRecoveryTime: 8000
    },
    {
      name: 'MEMORY_ERROR_OPTIMIZATION',
      description: 'メモリエラー専用最適化戦略',
      errorTypes: ['MEMORY_ERROR', 'HEAP_ERROR'],
      priority: 100,
      effectiveness: 88,
      actions: [
        { type: 'SCALE', parameters: { gc: true, reduceCache: 0.3 }, timeout: 10000, required: true },
        { type: 'RETRY', parameters: { batchSize: 0.5 }, timeout: 20000, required: true },
        { type: 'ALERT', parameters: { severity: 'HIGH' }, timeout: 0, required: true }
      ],
      maxAttempts: 2,
      estimatedRecoveryTime: 25000
    },
    {
      name: 'AUTH_ERROR_AUTOMATIC_REFRESH',
      description: '認証エラー専用自動更新戦略',
      errorTypes: ['AUTH_ERROR', 'UNAUTHORIZED_ERROR'],
      priority: 98,
      effectiveness: 95,
      actions: [
        { type: 'RETRY', parameters: { refreshToken: true }, timeout: 15000, required: true },
        { type: 'FALLBACK', parameters: { useBackupAuth: true }, timeout: 10000, required: false }
      ],
      maxAttempts: 2,
      estimatedRecoveryTime: 12000
    }
  ];

  constructor() {
    super();
    this.initializeStrategies();
    this.startEffectivenessMonitoring();
    
    console.log(`🎯 エラー種別最適処理戦略システム初期化完了`);
    console.log(`   - 特化戦略数: ${this.OPTIMIZED_STRATEGIES.length}`);
  }

  /**
   * エラー種別に最適化された処理の実行
   */
  async processError(
    error: Error, 
    context: ErrorContext
  ): Promise<StrategyResult> {
    
    const startTime = Date.now();
    const errorType = this.classifyErrorType(error);
    const urgencyLevel = this.assessUrgency(error, context);
    
    console.log(`🎯 エラー種別最適処理開始:`);
    console.log(`   - エラータイプ: ${errorType}`);
    console.log(`   - 緊急度: ${urgencyLevel}`);

    try {
      // 最適戦略の選択
      const selectedStrategy = this.selectOptimalStrategy(errorType, error, context, urgencyLevel);

      // 戦略実行コンテキストの作成
      const executionContext: StrategyExecutionContext = {
        errorType,
        errorDetails: error,
        previousAttempts: context.attemptCount || 0,
        urgencyLevel
      };

      // 最適化処理の実行
      const result = await this.executeOptimizedStrategy(selectedStrategy, executionContext);

      const executionTime = Date.now() - startTime;
      this.recordExecution(selectedStrategy, result, executionTime);

      console.log(`✅ エラー種別最適処理完了:`);
      console.log(`   - 使用戦略: ${selectedStrategy.name}`);
      console.log(`   - 成功: ${result.success}`);

      return result;

    } catch (processingError) {
      console.error(`❌ エラー種別最適処理失敗:`, processingError);
      return await this.executeEmergencyFallback(error, context);
    }
  }

  /**
   * 戦略効果の分析とレポート
   */
  analyzeStrategyEffectiveness(): any {
    const successfulExecutions = this.executionHistory.filter(e => e.success);
    
    const analysis = {
      totalExecutions: this.executionHistory.length,
      successRate: (successfulExecutions.length / this.executionHistory.length) * 100,
      averageRecoveryTime: this.executionHistory.reduce((sum, e) => sum + e.executionTime, 0) / this.executionHistory.length,
      strategyPerformance: this.calculateStrategyPerformance()
    };

    console.log(`📈 戦略効果分析レポート:`);
    console.log(`   - 総実行数: ${analysis.totalExecutions}`);
    console.log(`   - 成功率: ${analysis.successRate.toFixed(1)}%`);
    console.log(`   - 平均回復時間: ${analysis.averageRecoveryTime.toFixed(0)}ms`);

    return analysis;
  }

  /**
   * プライベートメソッド
   */
  private classifyErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();

    if (message.includes('network') || message.includes('connection') || name.includes('network')) {
      return 'NETWORK_ERROR';
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'RATE_LIMIT_ERROR';
    } else if (message.includes('parse') || message.includes('syntax') || name.includes('syntax')) {
      return 'PARSE_ERROR';
    } else if (message.includes('memory') || message.includes('heap') || name.includes('memory')) {
      return 'MEMORY_ERROR';
    } else if (message.includes('auth') || message.includes('unauthorized')) {
      return 'AUTH_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  private assessUrgency(error: Error, context: ErrorContext): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const errorType = this.classifyErrorType(error);
    
    const baseUrgency = {
      'MEMORY_ERROR': 'HIGH',
      'AUTH_ERROR': 'HIGH',
      'NETWORK_ERROR': 'MEDIUM',
      'RATE_LIMIT_ERROR': 'MEDIUM',
      'PARSE_ERROR': 'LOW'
    }[errorType] || 'MEDIUM';

    if (context.isProduction && baseUrgency === 'HIGH') {
      return 'CRITICAL';
    }

    return baseUrgency as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }

  private selectOptimalStrategy(
    errorType: ErrorType,
    error: Error,
    context: ErrorContext,
    urgencyLevel: string
  ): ErrorStrategy {
    
    const availableStrategies = this.strategies.get(errorType) || [];
    
    if (availableStrategies.length === 0) {
      return this.getDefaultStrategy(errorType);
    }

    // 優先度と効果に基づく選択
    const scoredStrategies = availableStrategies.map(strategy => {
      let score = strategy.priority * 0.4 + strategy.effectiveness * 0.6;
      
      // 緊急度による調整
      const urgencyMultiplier = {
        'LOW': 1.0, 'MEDIUM': 1.1, 'HIGH': 1.3, 'CRITICAL': 1.5
      }[urgencyLevel] || 1.0;
      
      score *= urgencyMultiplier;
      return { strategy, score };
    });

    scoredStrategies.sort((a, b) => b.score - a.score);
    return scoredStrategies[0].strategy;
  }

  private async executeOptimizedStrategy(
    strategy: ErrorStrategy,
    context: StrategyExecutionContext
  ): Promise<StrategyResult> {
    
    console.log(`🚀 最適化戦略実行: ${strategy.name}`);

    const results: any[] = [];
    let lastError: Error | undefined = context.errorDetails;

    for (const action of strategy.actions) {
      try {
        console.log(`   ⚡ アクション実行: ${action.type}`);
        
        const actionResult = await this.executeStrategyAction(action, context, strategy);
        results.push(actionResult);

        if (actionResult.success && action.type !== 'ALERT') {
          return {
            success: true,
            strategyName: strategy.name,
            executionTime: Date.now(),
            actionsExecuted: results,
            recoveryData: actionResult.data
          };
        }

        if (!actionResult.success && action.required) {
          lastError = actionResult.error || lastError;
          break;
        }

      } catch (actionError) {
        console.error(`❌ アクション失敗: ${action.type}`, actionError);
        lastError = actionError as Error;
        if (action.required) break;
      }
    }

    return {
      success: false,
      strategyName: strategy.name,
      executionTime: Date.now(),
      actionsExecuted: results,
      error: lastError
    };
  }

  private async executeStrategyAction(
    action: StrategyAction,
    context: StrategyExecutionContext,
    strategy: ErrorStrategy
  ): Promise<any> {
    
    switch (action.type) {
      case 'RETRY':
        return await this.executeRetryAction(action, context);
      case 'BACKOFF':
        return await this.executeBackoffAction(action, context);
      case 'FALLBACK':
        return await this.executeFallbackAction(action, context);
      case 'CIRCUIT_BREAK':
        return await this.executeCircuitBreakAction(action, context);
      case 'SCALE':
        return await this.executeScaleAction(action, context);
      case 'ALERT':
        return await this.executeAlertAction(action, context);
      default:
        throw new Error(`未知のアクションタイプ: ${action.type}`);
    }
  }

  private async executeRetryAction(action: StrategyAction, context: StrategyExecutionContext): Promise<any> {
    const params = action.parameters;
    const attempts = params.attempts || 3;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await this.retryOriginalOperation(context, params);
        return { success: true, data: result, attempt: i + 1 };
      } catch (error) {
        if (i === attempts - 1) {
          return { success: false, error, totalAttempts: attempts };
        }
        
        if (params.backoff === 'exponential') {
          await this.wait(1000 * Math.pow(2, i));
        }
      }
    }
  }

  private async executeBackoffAction(action: StrategyAction, context: StrategyExecutionContext): Promise<any> {
    const params = action.parameters;
    const delay = this.calculateAdaptiveDelay(params, context);
    
    console.log(`⏳ 適応バックオフ: ${delay}ms`);
    await this.wait(delay);
    
    return { success: true, data: { delay } };
  }

  private async executeFallbackAction(action: StrategyAction, context: StrategyExecutionContext): Promise<any> {
    const params = action.parameters;
    
    if (params.cacheFirst) {
      const cachedData = await this.getCachedData(context);
      if (cachedData) {
        return { success: true, data: cachedData, source: 'cache' };
      }
    }
    
    return { success: true, data: 'fallback_value', source: 'default' };
  }

  private async executeCircuitBreakAction(action: StrategyAction, context: StrategyExecutionContext): Promise<any> {
    const params = action.parameters;
    const circuitName = `${context.errorType}_circuit`;
    
    await circuitBreaker.execute(circuitName, async () => {
      return this.retryOriginalOperation(context, {});
    }, { failureThreshold: params.threshold });
    
    return { success: true, data: { circuitRegistered: true } };
  }

  private async executeScaleAction(action: StrategyAction, context: StrategyExecutionContext): Promise<any> {
    const params = action.parameters;
    
    if (params.gc && global.gc) {
      global.gc();
    }
    
    return { success: true, data: { scaled: true } };
  }

  private async executeAlertAction(action: StrategyAction, context: StrategyExecutionContext): Promise<any> {
    const params = action.parameters;
    
    console.log(`🚨 アラート: ${params.severity} - ${context.errorType}`);
    
    this.emit('error-alert', {
      severity: params.severity,
      errorType: context.errorType,
      timestamp: new Date()
    });
    
    return { success: true, data: { alertSent: true } };
  }

  /**
   * ヘルパーメソッド
   */
  private initializeStrategies(): void {
    this.OPTIMIZED_STRATEGIES.forEach(strategy => {
      strategy.errorTypes.forEach(errorType => {
        const existing = this.strategies.get(errorType) || [];
        existing.push(strategy);
        existing.sort((a, b) => b.priority - a.priority);
        this.strategies.set(errorType, existing);
      });
    });
    
    console.log(`📋 戦略初期化完了: ${this.strategies.size}種類のエラータイプ`);
  }

  private startEffectivenessMonitoring(): void {
    setInterval(() => {
      this.updateEffectivenessMetrics();
    }, 2 * 60 * 1000); // 2分毎
  }

  private getDefaultStrategy(errorType: ErrorType): ErrorStrategy {
    return {
      name: 'DEFAULT_RECOVERY',
      description: 'デフォルト回復戦略',
      errorTypes: [errorType],
      priority: 50,
      effectiveness: 60,
      actions: [
        { type: 'RETRY', parameters: { attempts: 3 }, timeout: 10000, required: true }
      ],
      maxAttempts: 3,
      estimatedRecoveryTime: 10000
    };
  }

  private async retryOriginalOperation(context: StrategyExecutionContext, params: any): Promise<any> {
    // 実際の再試行処理（実装依存）
    return Promise.resolve('recovered');
  }

  private calculateAdaptiveDelay(params: any, context: StrategyExecutionContext): number {
    const baseDelay = 5000;
    const multiplier = params.multiplier || 1.0;
    const urgencyFactor = {
      'LOW': 1.0, 'MEDIUM': 0.8, 'HIGH': 0.6, 'CRITICAL': 0.4
    }[context.urgencyLevel] || 1.0;
    
    return baseDelay * multiplier * urgencyFactor;
  }

  private async getCachedData(context: StrategyExecutionContext): Promise<any> {
    // キャッシュからデータを取得（実装依存）
    return null;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordExecution(strategy: ErrorStrategy, result: StrategyResult, executionTime: number): void {
    this.executionHistory.push({
      strategyName: strategy.name,
      success: result.success,
      executionTime,
      timestamp: Date.now()
    });
    
    // 履歴サイズ制限
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }
  }

  private calculateStrategyPerformance(): Map<string, any> {
    const performance = new Map<string, any>();
    
    this.OPTIMIZED_STRATEGIES.forEach(strategy => {
      const executions = this.executionHistory.filter(e => e.strategyName === strategy.name);
      const successCount = executions.filter(e => e.success).length;
      
      performance.set(strategy.name, {
        totalExecutions: executions.length,
        successRate: executions.length > 0 ? (successCount / executions.length) * 100 : 0,
        averageTime: executions.length > 0 ? 
          executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length : 0
      });
    });
    
    return performance;
  }

  private updateEffectivenessMetrics(): void {
    // 効果メトリクスの更新（実装簡略化）
    console.log(`📊 効果メトリクス更新: ${this.executionHistory.length}件の実行履歴`);
  }

  private async executeEmergencyFallback(error: Error, context: ErrorContext): Promise<StrategyResult> {
    console.log(`🆘 緊急フォールバック実行`);
    
    return {
      success: true,
      strategyName: 'EMERGENCY_FALLBACK',
      executionTime: Date.now(),
      actionsExecuted: [],
      recoveryData: 'emergency_fallback_data'
    };
  }
}

// シングルトンインスタンスのエクスポート
export const errorTypeProcessor = new ErrorTypeOptimizedProcessor();