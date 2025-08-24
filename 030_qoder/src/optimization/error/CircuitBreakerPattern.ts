/**
 * MetaEgg システム - サーキットブレーカーパターン実装
 * 
 * システム障害の自動検出・分離・復旧機能
 * - 障害サービスの自動分離によるシステム保護
 * - 半開状態での段階的復旧機能
 * - リアルタイム健全性監視とアラート
 * - 動的しきい値調整と学習機能
 */

import { EventEmitter } from 'events';
import type { 
  CircuitState, 
  CircuitBreakerConfig, 
  CircuitBreakerMetrics,
  HealthCheckResult 
} from '../../schema/types.js';

export interface CircuitBreakerInstance {
  name: string;
  state: CircuitState;
  config: CircuitBreakerConfig;
  metrics: CircuitBreakerMetrics;
  lastStateChange: Date;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  halfOpenAttempts: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  circuitState: CircuitState;
  executionTime: number;
  fromCache?: boolean;
}

export interface AdaptiveThresholds {
  failureThreshold: number;
  recoveryThreshold: number;
  timeoutThreshold: number;
  volumeThreshold: number;
  errorRateThreshold: number;
}

export class CircuitBreakerPattern extends EventEmitter {
  private circuits = new Map<string, CircuitBreakerInstance>();
  private globalMetrics = new Map<string, any>();
  private healthMonitor: HealthMonitor;
  private adaptiveThresholdManager: AdaptiveThresholdManager;
  
  // デフォルト設定
  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,           // 5回失敗で回路開放
    recoveryTimeout: 60000,        // 60秒後に半開状態に移行
    successThreshold: 3,           // 3回成功で回路閉鎖
    timeout: 30000,                // 30秒タイムアウト
    volumeThreshold: 10,           // 最小リクエスト数
    errorRateThreshold: 50,        // エラー率50%で開放
    monitoringWindow: 60000,       // 1分間の監視ウィンドウ
    halfOpenMaxAttempts: 5         // 半開状態での最大試行回数
  };

  constructor() {
    super();
    this.healthMonitor = new HealthMonitor();
    this.adaptiveThresholdManager = new AdaptiveThresholdManager();
    
    this.startGlobalMonitoring();
    this.startAdaptiveOptimization();
    
    console.log(`🔌 サーキットブレーカーシステム初期化完了`);
  }

  /**
   * サーキットブレーカー付きでの実行
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<CircuitBreakerResult<T>> {
    
    const circuit = this.getOrCreateCircuit(circuitName, config);
    const startTime = Date.now();
    
    console.log(`🔌 サーキットブレーカー実行: ${circuitName} (状態: ${circuit.state})`);

    try {
      // 状態チェック
      const stateCheck = this.checkCircuitState(circuit);
      if (!stateCheck.canExecute) {
        return {
          success: false,
          error: new Error(`Circuit breaker is ${circuit.state}: ${stateCheck.reason}`),
          circuitState: circuit.state,
          executionTime: Date.now() - startTime,
          fromCache: stateCheck.fromCache
        };
      }

      // タイムアウト付きで実行
      const result = await this.executeWithTimeout(operation, circuit.config.timeout);
      
      // 成功処理
      const executionTime = Date.now() - startTime;
      this.recordSuccess(circuit, executionTime);
      
      console.log(`✅ サーキットブレーカー実行成功: ${circuitName} (${executionTime}ms)`);
      
      return {
        success: true,
        data: result,
        circuitState: circuit.state,
        executionTime,
        fromCache: false
      };

    } catch (error) {
      // 失敗処理
      const executionTime = Date.now() - startTime;
      this.recordFailure(circuit, error as Error, executionTime);
      
      console.error(`❌ サーキットブレーカー実行失敗: ${circuitName}`, error);
      
      return {
        success: false,
        error: error as Error,
        circuitState: circuit.state,
        executionTime,
        fromCache: false
      };
    }
  }

  /**
   * サーキットブレーカーの健全性チェック
   */
  async performHealthCheck(circuitName: string): Promise<HealthCheckResult> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return {
        isHealthy: false,
        status: 'UNKNOWN',
        message: 'Circuit not found',
        metrics: {},
        timestamp: new Date()
      };
    }

    const healthResult = await this.healthMonitor.checkHealth(circuit);
    
    console.log(`🏥 健全性チェック: ${circuitName} - ${healthResult.status}`);
    
    // 健全性に基づく自動調整
    if (!healthResult.isHealthy && circuit.state === 'CLOSED') {
      console.log(`⚠️ 健全性悪化検出: ${circuitName} - 予防的開放を検討`);
      this.emit('health-degradation', { circuitName, healthResult });
    }
    
    return healthResult;
  }

  /**
   * 回路の強制状態変更
   */
  forceState(circuitName: string, newState: CircuitState, reason?: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      throw new Error(`Circuit not found: ${circuitName}`);
    }

    const oldState = circuit.state;
    this.changeCircuitState(circuit, newState, reason || 'Manually forced');
    
    console.log(`🔧 回路状態強制変更: ${circuitName} ${oldState} → ${newState}`);
    this.emit('circuit-state-forced', { circuitName, oldState, newState, reason });
  }

  /**
   * 全回路の統計情報取得
   */
  getGlobalMetrics(): any {
    const circuits = Array.from(this.circuits.values());
    
    return {
      totalCircuits: circuits.length,
      openCircuits: circuits.filter(c => c.state === 'OPEN').length,
      halfOpenCircuits: circuits.filter(c => c.state === 'HALF_OPEN').length,
      closedCircuits: circuits.filter(c => c.state === 'CLOSED').length,
      totalFailures: circuits.reduce((sum, c) => sum + c.failureCount, 0),
      totalSuccesses: circuits.reduce((sum, c) => sum + c.successCount, 0),
      averageResponseTime: this.calculateAverageResponseTime(circuits),
      circuitDetails: circuits.map(c => ({
        name: c.name,
        state: c.state,
        failureCount: c.failureCount,
        successCount: c.successCount,
        lastStateChange: c.lastStateChange,
        errorRate: this.calculateErrorRate(c)
      }))
    };
  }

  /**
   * 適応的しきい値調整
   */
  async optimizeThresholds(): Promise<void> {
    console.log(`⚙️ 適応的しきい値最適化開始`);
    
    for (const [name, circuit] of this.circuits) {
      const optimizedThresholds = await this.adaptiveThresholdManager.optimize(circuit);
      
      if (optimizedThresholds.changed) {
        console.log(`🎯 しきい値最適化: ${name}`);
        console.log(`   - 失敗しきい値: ${circuit.config.failureThreshold} → ${optimizedThresholds.failureThreshold}`);
        console.log(`   - エラー率しきい値: ${circuit.config.errorRateThreshold} → ${optimizedThresholds.errorRateThreshold}%`);
        
        // 設定を更新
        circuit.config.failureThreshold = optimizedThresholds.failureThreshold;
        circuit.config.errorRateThreshold = optimizedThresholds.errorRateThreshold;
        circuit.config.recoveryTimeout = optimizedThresholds.recoveryTimeout;
        
        this.emit('thresholds-optimized', { circuitName: name, thresholds: optimizedThresholds });
      }
    }
    
    console.log(`✅ 適応的しきい値最適化完了`);
  }

  /**
   * プライベートメソッド
   */
  private getOrCreateCircuit(
    name: string, 
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreakerInstance {
    
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = {
        name,
        state: 'CLOSED',
        config: { ...this.DEFAULT_CONFIG, ...config },
        metrics: this.initializeMetrics(),
        lastStateChange: new Date(),
        failureCount: 0,
        successCount: 0,
        halfOpenAttempts: 0
      };
      
      this.circuits.set(name, circuit);
      console.log(`🆕 新しいサーキットブレーカー作成: ${name}`);
    }
    
    return circuit;
  }

  private checkCircuitState(circuit: CircuitBreakerInstance): { 
    canExecute: boolean; 
    reason?: string; 
    fromCache?: boolean 
  } {
    
    switch (circuit.state) {
      case 'CLOSED':
        return { canExecute: true };
        
      case 'OPEN':
        const timeSinceOpen = Date.now() - circuit.lastStateChange.getTime();
        if (timeSinceOpen >= circuit.config.recoveryTimeout) {
          // 半開状態に移行
          this.changeCircuitState(circuit, 'HALF_OPEN', 'Recovery timeout reached');
          return { canExecute: true };
        }
        return { 
          canExecute: false, 
          reason: `Circuit open for ${timeSinceOpen}ms`,
          fromCache: true 
        };
        
      case 'HALF_OPEN':
        if (circuit.halfOpenAttempts >= circuit.config.halfOpenMaxAttempts) {
          // 試行回数超過で再度開放
          this.changeCircuitState(circuit, 'OPEN', 'Half-open attempts exceeded');
          return { 
            canExecute: false, 
            reason: 'Half-open attempts exceeded' 
          };
        }
        return { canExecute: true };
        
      default:
        return { canExecute: false, reason: 'Unknown state' };
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>, 
    timeout: number
  ): Promise<T> {
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private recordSuccess(circuit: CircuitBreakerInstance, executionTime: number): void {
    circuit.successCount++;
    circuit.lastSuccessTime = new Date();
    circuit.metrics.totalRequests++;
    circuit.metrics.successfulRequests++;
    circuit.metrics.averageResponseTime = this.updateAverageResponseTime(
      circuit.metrics.averageResponseTime,
      executionTime,
      circuit.metrics.totalRequests
    );

    // 状態遷移チェック
    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenAttempts++;
      
      if (circuit.successCount >= circuit.config.successThreshold) {
        this.changeCircuitState(circuit, 'CLOSED', 'Success threshold reached');
      }
    }

    // 失敗カウンターのリセット（成功時）
    if (circuit.state === 'CLOSED') {
      circuit.failureCount = 0;
    }
  }

  private recordFailure(circuit: CircuitBreakerInstance, error: Error, executionTime: number): void {
    circuit.failureCount++;
    circuit.lastFailureTime = new Date();
    circuit.metrics.totalRequests++;
    circuit.metrics.failedRequests++;
    circuit.metrics.averageResponseTime = this.updateAverageResponseTime(
      circuit.metrics.averageResponseTime,
      executionTime,
      circuit.metrics.totalRequests
    );

    // エラー種別の記録
    const errorType = this.classifyError(error);
    circuit.metrics.errorsByType.set(errorType, (circuit.metrics.errorsByType.get(errorType) || 0) + 1);

    // 状態遷移チェック
    this.checkForStateTransition(circuit);
  }

  private checkForStateTransition(circuit: CircuitBreakerInstance): void {
    // 失敗回数チェック
    if (circuit.failureCount >= circuit.config.failureThreshold) {
      this.changeCircuitState(circuit, 'OPEN', `Failure threshold reached (${circuit.failureCount})`);
      return;
    }

    // エラー率チェック
    const errorRate = this.calculateErrorRate(circuit);
    if (errorRate >= circuit.config.errorRateThreshold && 
        circuit.metrics.totalRequests >= circuit.config.volumeThreshold) {
      this.changeCircuitState(circuit, 'OPEN', `Error rate threshold reached (${errorRate.toFixed(1)}%)`);
      return;
    }

    // 半開状態での失敗
    if (circuit.state === 'HALF_OPEN') {
      this.changeCircuitState(circuit, 'OPEN', 'Failure in half-open state');
    }
  }

  private changeCircuitState(
    circuit: CircuitBreakerInstance, 
    newState: CircuitState, 
    reason: string
  ): void {
    
    const oldState = circuit.state;
    circuit.state = newState;
    circuit.lastStateChange = new Date();

    // 状態変更時のリセット処理
    if (newState === 'CLOSED') {
      circuit.failureCount = 0;
      circuit.halfOpenAttempts = 0;
    } else if (newState === 'HALF_OPEN') {
      circuit.halfOpenAttempts = 0;
      circuit.successCount = 0;
    }

    console.log(`🔄 回路状態変更: ${circuit.name} ${oldState} → ${newState} (${reason})`);
    
    this.emit('circuit-state-changed', {
      circuitName: circuit.name,
      oldState,
      newState,
      reason,
      timestamp: circuit.lastStateChange
    });
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network') || message.includes('connection')) return 'NETWORK';
    if (message.includes('rate limit')) return 'RATE_LIMIT';
    if (message.includes('auth')) return 'AUTHENTICATION';
    if (message.includes('parse')) return 'PARSING';
    
    return 'UNKNOWN';
  }

  private calculateErrorRate(circuit: CircuitBreakerInstance): number {
    const totalRequests = circuit.metrics.totalRequests;
    if (totalRequests === 0) return 0;
    
    return (circuit.metrics.failedRequests / totalRequests) * 100;
  }

  private updateAverageResponseTime(
    currentAverage: number, 
    newTime: number, 
    totalRequests: number
  ): number {
    return ((currentAverage * (totalRequests - 1)) + newTime) / totalRequests;
  }

  private calculateAverageResponseTime(circuits: CircuitBreakerInstance[]): number {
    if (circuits.length === 0) return 0;
    
    const totalRequests = circuits.reduce((sum, c) => sum + c.metrics.totalRequests, 0);
    if (totalRequests === 0) return 0;
    
    const weightedSum = circuits.reduce((sum, c) => 
      sum + (c.metrics.averageResponseTime * c.metrics.totalRequests), 0);
    
    return weightedSum / totalRequests;
  }

  private initializeMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorsByType: new Map(),
      lastResetTime: new Date()
    };
  }

  private startGlobalMonitoring(): void {
    setInterval(() => {
      this.performGlobalHealthCheck();
      this.cleanupOldMetrics();
    }, 30000); // 30秒毎
  }

  private startAdaptiveOptimization(): void {
    setInterval(async () => {
      await this.optimizeThresholds();
    }, 5 * 60 * 1000); // 5分毎
  }

  private performGlobalHealthCheck(): void {
    const globalMetrics = this.getGlobalMetrics();
    
    console.log(`🌐 グローバル健全性チェック:`);
    console.log(`   - 開放回路: ${globalMetrics.openCircuits}/${globalMetrics.totalCircuits}`);
    console.log(`   - 平均応答時間: ${globalMetrics.averageResponseTime.toFixed(1)}ms`);
    
    // アラート条件のチェック
    if (globalMetrics.openCircuits > globalMetrics.totalCircuits * 0.3) {
      console.warn(`⚠️ 警告: 30%以上の回路が開放状態です`);
      this.emit('high-circuit-failure-rate', globalMetrics);
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24時間前
    
    for (const [name, circuit] of this.circuits) {
      if (circuit.lastStateChange < cutoffTime && circuit.state === 'CLOSED' && 
          circuit.metrics.totalRequests === 0) {
        // 未使用の古い回路を削除
        this.circuits.delete(name);
        console.log(`🗑️ 未使用回路削除: ${name}`);
      }
    }
  }
}

/**
 * 健全性監視クラス
 */
class HealthMonitor {
  async checkHealth(circuit: CircuitBreakerInstance): Promise<HealthCheckResult> {
    const metrics = circuit.metrics;
    const errorRate = (metrics.failedRequests / Math.max(1, metrics.totalRequests)) * 100;
    
    const isHealthy = errorRate < 25 && circuit.state !== 'OPEN';
    const status = this.determineHealthStatus(circuit, errorRate);
    
    return {
      isHealthy,
      status,
      message: this.generateHealthMessage(circuit, errorRate),
      metrics: {
        errorRate,
        averageResponseTime: metrics.averageResponseTime,
        totalRequests: metrics.totalRequests,
        state: circuit.state
      },
      timestamp: new Date()
    };
  }

  private determineHealthStatus(circuit: CircuitBreakerInstance, errorRate: number): string {
    if (circuit.state === 'OPEN') return 'CRITICAL';
    if (errorRate > 50) return 'UNHEALTHY';
    if (errorRate > 25) return 'DEGRADED';
    if (circuit.state === 'HALF_OPEN') return 'RECOVERING';
    return 'HEALTHY';
  }

  private generateHealthMessage(circuit: CircuitBreakerInstance, errorRate: number): string {
    switch (circuit.state) {
      case 'OPEN':
        return `Circuit is open due to failures (Error rate: ${errorRate.toFixed(1)}%)`;
      case 'HALF_OPEN':
        return `Circuit is recovering (${circuit.halfOpenAttempts} attempts)`;
      case 'CLOSED':
        return `Circuit is healthy (Error rate: ${errorRate.toFixed(1)}%)`;
      default:
        return 'Unknown circuit state';
    }
  }
}

/**
 * 適応的しきい値管理クラス
 */
class AdaptiveThresholdManager {
  async optimize(circuit: CircuitBreakerInstance): Promise<AdaptiveThresholds & { changed: boolean }> {
    const currentConfig = circuit.config;
    const metrics = circuit.metrics;
    
    // 統計に基づくしきい値計算
    const errorRate = (metrics.failedRequests / Math.max(1, metrics.totalRequests)) * 100;
    const avgResponseTime = metrics.averageResponseTime;
    
    // 適応的調整
    let newFailureThreshold = currentConfig.failureThreshold;
    let newErrorRateThreshold = currentConfig.errorRateThreshold;
    let newRecoveryTimeout = currentConfig.recoveryTimeout;
    
    // 高頻度失敗時はしきい値を下げる
    if (errorRate > 30) {
      newFailureThreshold = Math.max(3, currentConfig.failureThreshold - 1);
      newErrorRateThreshold = Math.max(30, currentConfig.errorRateThreshold - 5);
    }
    
    // 安定時はしきい値を上げる
    if (errorRate < 5 && metrics.totalRequests > 100) {
      newFailureThreshold = Math.min(10, currentConfig.failureThreshold + 1);
      newErrorRateThreshold = Math.min(70, currentConfig.errorRateThreshold + 5);
    }
    
    // 応答時間に基づく調整
    if (avgResponseTime > 10000) { // 10秒超
      newRecoveryTimeout = Math.min(300000, currentConfig.recoveryTimeout * 1.5); // 最大5分
    }
    
    const changed = newFailureThreshold !== currentConfig.failureThreshold ||
                   newErrorRateThreshold !== currentConfig.errorRateThreshold ||
                   newRecoveryTimeout !== currentConfig.recoveryTimeout;
    
    return {
      failureThreshold: newFailureThreshold,
      recoveryThreshold: currentConfig.successThreshold,
      timeoutThreshold: currentConfig.timeout,
      volumeThreshold: currentConfig.volumeThreshold,
      errorRateThreshold: newErrorRateThreshold,
      recoveryTimeout: newRecoveryTimeout,
      changed
    };
  }
}

// シングルトンインスタンスのエクスポート
export const circuitBreaker = new CircuitBreakerPattern();