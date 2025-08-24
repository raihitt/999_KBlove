/**
 * MetaEgg システム - 動的バッチサイズ調整システム
 * 
 * リソース最適化のための適応的バッチサイズ調整
 * - CPU・メモリ使用率に基づく動的調整
 * - 処理パフォーマンス履歴による学習調整
 * - スループット最大化とレイテンシ最小化のバランス
 * - 自動フェイルセーフとリカバリ機能
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import type { 
  BatchSizeConfig, 
  ResourceUtilization, 
  BatchPerformanceMetrics,
  BatchOptimizationResult 
} from '../../schema/types.js';

export interface BatchSizeStrategy {
  name: string;
  description: string;
  calculateBatchSize: (
    dataSize: number, 
    resourceUtil: ResourceUtilization, 
    performance: BatchPerformanceMetrics
  ) => number;
  constraints: {
    minBatchSize: number;
    maxBatchSize: number;
    memoryThreshold: number;
    cpuThreshold: number;
  };
}

export interface BatchExecutionContext {
  dataSize: number;
  currentBatchSize: number;
  resourceUtilization: ResourceUtilization;
  performanceHistory: BatchPerformanceMetrics[];
  optimizationTargets: {
    maxLatency: number;
    minThroughput: number;
    maxMemoryUsage: number;
  };
}

export interface BatchSizeOptimizationMetrics {
  originalBatchSize: number;
  optimizedBatchSize: number;
  improvement: {
    throughputGain: number;
    latencyReduction: number;
    memoryEfficiency: number;
  };
  resourceImpact: {
    cpuChange: number;
    memoryChange: number;
    ioChange: number;
  };
  confidence: number;
}

export class DynamicBatchSizeOptimizer extends EventEmitter {
  private performanceHistory: BatchPerformanceMetrics[] = [];
  private currentStrategy: BatchSizeStrategy;
  private resourceMonitor: SystemResourceMonitor;
  private optimizationResults: BatchSizeOptimizationMetrics[] = [];
  
  // 動的調整パラメータ
  private readonly OPTIMIZATION_PARAMS = {
    learningRate: 0.1,
    adaptationThreshold: 0.05,
    performanceWindow: 20,
    adjustmentFactor: 1.2,
    stabilityThreshold: 5
  };

  // バッチサイズ戦略定義
  private readonly BATCH_STRATEGIES: BatchSizeStrategy[] = [
    {
      name: 'CPU_OPTIMIZED',
      description: 'CPU使用率最適化戦略',
      calculateBatchSize: this.calculateCpuOptimizedBatchSize.bind(this),
      constraints: {
        minBatchSize: 10,
        maxBatchSize: 1000,
        memoryThreshold: 0.8,
        cpuThreshold: 0.7
      }
    },
    {
      name: 'MEMORY_OPTIMIZED',
      description: 'メモリ使用率最適化戦略',
      calculateBatchSize: this.calculateMemoryOptimizedBatchSize.bind(this),
      constraints: {
        minBatchSize: 5,
        maxBatchSize: 500,
        memoryThreshold: 0.6,
        cpuThreshold: 0.9
      }
    },
    {
      name: 'THROUGHPUT_OPTIMIZED',
      description: 'スループット最適化戦略',
      calculateBatchSize: this.calculateThroughputOptimizedBatchSize.bind(this),
      constraints: {
        minBatchSize: 20,
        maxBatchSize: 2000,
        memoryThreshold: 0.85,
        cpuThreshold: 0.8
      }
    },
    {
      name: 'BALANCED',
      description: 'バランス調整戦略',
      calculateBatchSize: this.calculateBalancedBatchSize.bind(this),
      constraints: {
        minBatchSize: 15,
        maxBatchSize: 800,
        memoryThreshold: 0.75,
        cpuThreshold: 0.75
      }
    }
  ];

  constructor() {
    super();
    this.resourceMonitor = new SystemResourceMonitor();
    this.currentStrategy = this.BATCH_STRATEGIES.find(s => s.name === 'BALANCED')!;
    
    this.startResourceMonitoring();
    this.startPerformanceAnalysis();
    
    console.log(`📊 動的バッチサイズ最適化システム初期化完了`);
    console.log(`   - 初期戦略: ${this.currentStrategy.name}`);
    console.log(`   - CPU数: ${os.cpus().length}, メモリ: ${(os.totalmem()/1024/1024/1024).toFixed(1)}GB`);
  }

  /**
   * 動的バッチサイズ最適化のメインメソッド
   */
  async optimizeBatchSize(context: BatchExecutionContext): Promise<BatchOptimizationResult> {
    const startTime = Date.now();
    
    console.log(`⚙️ バッチサイズ最適化開始:`);
    console.log(`   - データサイズ: ${context.dataSize}件`);
    console.log(`   - 現在のバッチサイズ: ${context.currentBatchSize}`);
    console.log(`   - CPU使用率: ${(context.resourceUtilization.cpu * 100).toFixed(1)}%`);
    console.log(`   - メモリ使用率: ${(context.resourceUtilization.memory * 100).toFixed(1)}%`);

    try {
      // 1. 現在のパフォーマンス分析
      const currentPerformance = this.analyzeCurrentPerformance(context);
      
      // 2. 最適戦略の選択
      const optimalStrategy = await this.selectOptimalStrategy(context);
      
      // 3. 動的バッチサイズ計算
      const optimizedBatchSize = this.calculateOptimizedBatchSize(
        context, 
        optimalStrategy, 
        currentPerformance
      );
      
      // 4. バッチサイズの妥当性検証
      const validatedBatchSize = this.validateBatchSize(
        optimizedBatchSize, 
        context, 
        optimalStrategy
      );
      
      // 5. 最適化結果の生成
      const optimizationResult = this.generateOptimizationResult(
        context,
        validatedBatchSize,
        optimalStrategy,
        currentPerformance,
        Date.now() - startTime
      );

      // 6. 学習データの更新
      this.updateLearningData(context, optimizationResult);

      console.log(`✅ バッチサイズ最適化完了:`);
      console.log(`   - 最適化後: ${context.currentBatchSize} → ${validatedBatchSize}`);
      console.log(`   - 予想スループット向上: ${optimizationResult.expectedThroughputGain.toFixed(1)}%`);
      console.log(`   - 使用戦略: ${optimalStrategy.name}`);

      return optimizationResult;

    } catch (error) {
      console.error(`❌ バッチサイズ最適化失敗:`, error);
      throw error;
    }
  }

  /**
   * リアルタイム適応調整
   */
  async adaptiveBatchAdjustment(
    currentBatchSize: number,
    realtimeMetrics: BatchPerformanceMetrics
  ): Promise<number> {
    
    const resourceUtil = await this.resourceMonitor.getCurrentUtilization();
    
    // パフォーマンス劣化の検出
    const performanceIssues = this.detectPerformanceIssues(realtimeMetrics, resourceUtil);
    
    if (performanceIssues.length > 0) {
      console.log(`⚠️ パフォーマンス問題検出: ${performanceIssues.join(', ')}`);
      
      // 緊急調整の実行
      const adjustedBatchSize = this.performEmergencyAdjustment(
        currentBatchSize, 
        performanceIssues, 
        resourceUtil
      );
      
      console.log(`🔧 緊急バッチサイズ調整: ${currentBatchSize} → ${adjustedBatchSize}`);
      return adjustedBatchSize;
    }
    
    // 通常の微調整
    return this.performIncrementalAdjustment(currentBatchSize, realtimeMetrics, resourceUtil);
  }

  /**
   * バッチパフォーマンス分析と学習
   */
  analyzeBatchPerformance(
    batchSize: number,
    executionTime: number,
    resourceUsage: ResourceUtilization,
    outputQuality: number
  ): void {
    
    const performance: BatchPerformanceMetrics = {
      batchSize,
      executionTime,
      throughput: batchSize / (executionTime / 1000),
      resourceUsage,
      outputQuality,
      timestamp: new Date(),
      memoryEfficiency: this.calculateMemoryEfficiency(batchSize, resourceUsage.memory),
      cpuEfficiency: this.calculateCpuEfficiency(batchSize, resourceUsage.cpu)
    };

    // パフォーマンス履歴に追加
    this.performanceHistory.push(performance);
    
    // 履歴サイズ制限
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }

    // パフォーマンストレンドの分析
    this.analyzePerformanceTrends();
    
    console.log(`📈 バッチパフォーマンス記録: ${batchSize}件, ${executionTime}ms, ${performance.throughput.toFixed(1)} items/sec`);
  }

  /**
   * 戦略別バッチサイズ計算メソッド
   */
  private calculateCpuOptimizedBatchSize(
    dataSize: number, 
    resourceUtil: ResourceUtilization, 
    performance: BatchPerformanceMetrics
  ): number {
    
    const cpuFactor = Math.max(0.3, 1 - resourceUtil.cpu);
    const optimalConcurrency = os.cpus().length * cpuFactor;
    
    return Math.floor(dataSize / optimalConcurrency);
  }

  private calculateMemoryOptimizedBatchSize(
    dataSize: number, 
    resourceUtil: ResourceUtilization, 
    performance: BatchPerformanceMetrics
  ): number {
    
    const availableMemory = os.totalmem() * (1 - resourceUtil.memory);
    const estimatedItemMemory = 1024; // 1KB per item estimate
    
    return Math.floor(availableMemory / estimatedItemMemory * 0.8);
  }

  private calculateThroughputOptimizedBatchSize(
    dataSize: number, 
    resourceUtil: ResourceUtilization, 
    performance: BatchPerformanceMetrics
  ): number {
    
    if (this.performanceHistory.length < 3) {
      return Math.floor(dataSize / 4); // 初期値
    }

    // 過去のパフォーマンスから最適スループットのバッチサイズを推定
    const sortedByThroughput = this.performanceHistory
      .slice(-10)
      .sort((a, b) => b.throughput - a.throughput);
    
    const bestPerforming = sortedByThroughput.slice(0, 3);
    const avgOptimalBatchSize = bestPerforming.reduce((sum, p) => sum + p.batchSize, 0) / bestPerforming.length;
    
    return Math.floor(avgOptimalBatchSize * 1.1); // 10%増しで試行
  }

  private calculateBalancedBatchSize(
    dataSize: number, 
    resourceUtil: ResourceUtilization, 
    performance: BatchPerformanceMetrics
  ): number {
    
    const cpuOptimal = this.calculateCpuOptimizedBatchSize(dataSize, resourceUtil, performance);
    const memoryOptimal = this.calculateMemoryOptimizedBatchSize(dataSize, resourceUtil, performance);
    const throughputOptimal = this.calculateThroughputOptimizedBatchSize(dataSize, resourceUtil, performance);
    
    // 重み付き平均
    const weights = {
      cpu: 0.3,
      memory: 0.4,
      throughput: 0.3
    };
    
    return Math.floor(
      cpuOptimal * weights.cpu + 
      memoryOptimal * weights.memory + 
      throughputOptimal * weights.throughput
    );
  }

  /**
   * プライベートヘルパーメソッド
   */
  private startResourceMonitoring(): void {
    setInterval(async () => {
      const utilization = await this.resourceMonitor.getCurrentUtilization();
      
      // リソース使用率のしきい値チェック
      if (utilization.memory > 0.9) {
        console.warn(`⚠️ メモリ使用率が高すぎます: ${(utilization.memory * 100).toFixed(1)}%`);
        this.emit('high-memory-usage', utilization);
      }
      
      if (utilization.cpu > 0.95) {
        console.warn(`⚠️ CPU使用率が高すぎます: ${(utilization.cpu * 100).toFixed(1)}%`);
        this.emit('high-cpu-usage', utilization);
      }
    }, 5000); // 5秒毎
  }

  private startPerformanceAnalysis(): void {
    setInterval(() => {
      if (this.performanceHistory.length >= this.OPTIMIZATION_PARAMS.performanceWindow) {
        this.analyzePerformanceTrends();
        this.suggestStrategyAdjustments();
      }
    }, 30000); // 30秒毎
  }

  private analyzeCurrentPerformance(context: BatchExecutionContext): BatchPerformanceMetrics {
    if (context.performanceHistory.length === 0) {
      return {
        batchSize: context.currentBatchSize,
        executionTime: 0,
        throughput: 0,
        resourceUsage: context.resourceUtilization,
        outputQuality: 1.0,
        timestamp: new Date(),
        memoryEfficiency: 1.0,
        cpuEfficiency: 1.0
      };
    }
    
    // 最新のパフォーマンスデータを返す
    return context.performanceHistory[context.performanceHistory.length - 1];
  }

  private async selectOptimalStrategy(context: BatchExecutionContext): Promise<BatchSizeStrategy> {
    const resourceUtil = context.resourceUtilization;
    
    // リソース状況に基づく戦略選択
    if (resourceUtil.memory > 0.8) {
      return this.BATCH_STRATEGIES.find(s => s.name === 'MEMORY_OPTIMIZED')!;
    }
    
    if (resourceUtil.cpu > 0.8) {
      return this.BATCH_STRATEGIES.find(s => s.name === 'CPU_OPTIMIZED')!;
    }
    
    // パフォーマンス履歴に基づく選択
    if (context.performanceHistory.length >= 5) {
      const avgThroughput = context.performanceHistory
        .slice(-5)
        .reduce((sum, p) => sum + p.throughput, 0) / 5;
        
      if (avgThroughput < context.optimizationTargets.minThroughput) {
        return this.BATCH_STRATEGIES.find(s => s.name === 'THROUGHPUT_OPTIMIZED')!;
      }
    }
    
    // デフォルトはバランス戦略
    return this.BATCH_STRATEGIES.find(s => s.name === 'BALANCED')!;
  }

  private calculateOptimizedBatchSize(
    context: BatchExecutionContext,
    strategy: BatchSizeStrategy,
    currentPerformance: BatchPerformanceMetrics
  ): number {
    
    const baseBatchSize = strategy.calculateBatchSize(
      context.dataSize,
      context.resourceUtilization,
      currentPerformance
    );
    
    // 履歴に基づく微調整
    const adjustmentFactor = this.calculateAdjustmentFactor(context, strategy);
    
    return Math.floor(baseBatchSize * adjustmentFactor);
  }

  private validateBatchSize(
    batchSize: number,
    context: BatchExecutionContext,
    strategy: BatchSizeStrategy
  ): number {
    
    const constraints = strategy.constraints;
    
    // 最小・最大制限の適用
    let validated = Math.max(constraints.minBatchSize, Math.min(batchSize, constraints.maxBatchSize));
    
    // データサイズ制限
    validated = Math.min(validated, context.dataSize);
    
    // リソース制限チェック
    if (context.resourceUtilization.memory > constraints.memoryThreshold) {
      validated = Math.floor(validated * 0.7); // 30%削減
    }
    
    if (context.resourceUtilization.cpu > constraints.cpuThreshold) {
      validated = Math.floor(validated * 0.8); // 20%削減
    }
    
    return Math.max(constraints.minBatchSize, validated);
  }

  private generateOptimizationResult(
    context: BatchExecutionContext,
    optimizedBatchSize: number,
    strategy: BatchSizeStrategy,
    currentPerformance: BatchPerformanceMetrics,
    optimizationTime: number
  ): BatchOptimizationResult {
    
    const improvement = this.estimateImprovement(
      context.currentBatchSize,
      optimizedBatchSize,
      currentPerformance
    );
    
    return {
      originalBatchSize: context.currentBatchSize,
      optimizedBatchSize,
      strategyUsed: strategy.name,
      expectedThroughputGain: improvement.throughputGain,
      expectedLatencyReduction: improvement.latencyReduction,
      expectedMemoryEfficiency: improvement.memoryEfficiency,
      optimizationTime,
      confidence: improvement.confidence,
      recommendations: this.generateRecommendations(context, optimizedBatchSize, strategy)
    };
  }

  private calculateAdjustmentFactor(
    context: BatchExecutionContext,
    strategy: BatchSizeStrategy
  ): number {
    
    if (context.performanceHistory.length < 3) {
      return 1.0; // 履歴不足時はそのまま
    }
    
    // 最近のパフォーマンストレンドを分析
    const recentHistory = context.performanceHistory.slice(-5);
    const throughputTrend = this.calculateTrend(recentHistory.map(p => p.throughput));
    
    if (throughputTrend > 0.1) {
      return 1.1; // 改善トレンド → 10%増加
    } else if (throughputTrend < -0.1) {
      return 0.9; // 悪化トレンド → 10%削減
    }
    
    return 1.0; // 安定
  }

  private detectPerformanceIssues(
    metrics: BatchPerformanceMetrics,
    resourceUtil: ResourceUtilization
  ): string[] {
    
    const issues: string[] = [];
    
    if (metrics.throughput < 10) {
      issues.push('LOW_THROUGHPUT');
    }
    
    if (metrics.executionTime > 30000) { // 30秒超
      issues.push('HIGH_LATENCY');
    }
    
    if (resourceUtil.memory > 0.9) {
      issues.push('MEMORY_PRESSURE');
    }
    
    if (resourceUtil.cpu > 0.95) {
      issues.push('CPU_OVERLOAD');
    }
    
    if (metrics.outputQuality < 0.8) {
      issues.push('QUALITY_DEGRADATION');
    }
    
    return issues;
  }

  private performEmergencyAdjustment(
    currentBatchSize: number,
    issues: string[],
    resourceUtil: ResourceUtilization
  ): number {
    
    let adjustmentFactor = 1.0;
    
    for (const issue of issues) {
      switch (issue) {
        case 'MEMORY_PRESSURE':
          adjustmentFactor *= 0.5; // 50%削減
          break;
        case 'CPU_OVERLOAD':
          adjustmentFactor *= 0.7; // 30%削減
          break;
        case 'HIGH_LATENCY':
          adjustmentFactor *= 0.8; // 20%削減
          break;
        case 'LOW_THROUGHPUT':
          adjustmentFactor *= 1.2; // 20%増加
          break;
        case 'QUALITY_DEGRADATION':
          adjustmentFactor *= 0.9; // 10%削減
          break;
      }
    }
    
    const adjusted = Math.floor(currentBatchSize * adjustmentFactor);
    return Math.max(5, Math.min(adjusted, 2000)); // 安全な範囲に制限
  }

  private performIncrementalAdjustment(
    currentBatchSize: number,
    metrics: BatchPerformanceMetrics,
    resourceUtil: ResourceUtilization
  ): number {
    
    // 小幅な調整（5%以内）
    const baseAdjustment = this.OPTIMIZATION_PARAMS.learningRate;
    
    if (metrics.throughput > 50 && resourceUtil.memory < 0.7 && resourceUtil.cpu < 0.8) {
      return Math.floor(currentBatchSize * (1 + baseAdjustment)); // 微増
    }
    
    if (metrics.executionTime > 10000 || resourceUtil.memory > 0.8) {
      return Math.floor(currentBatchSize * (1 - baseAdjustment)); // 微減
    }
    
    return currentBatchSize; // 変更なし
  }

  private calculateMemoryEfficiency(batchSize: number, memoryUsage: number): number {
    return batchSize / (memoryUsage * 1000000); // simplified calculation
  }

  private calculateCpuEfficiency(batchSize: number, cpuUsage: number): number {
    return batchSize / (cpuUsage * 100); // simplified calculation
  }

  private analyzePerformanceTrends(): void {
    if (this.performanceHistory.length < 10) return;
    
    const recentHistory = this.performanceHistory.slice(-10);
    const throughputTrend = this.calculateTrend(recentHistory.map(p => p.throughput));
    const latencyTrend = this.calculateTrend(recentHistory.map(p => p.executionTime));
    
    console.log(`📊 パフォーマンストレンド分析:`);
    console.log(`   - スループット: ${throughputTrend > 0 ? '↑' : '↓'} ${(throughputTrend * 100).toFixed(1)}%`);
    console.log(`   - レイテンシ: ${latencyTrend > 0 ? '↑' : '↓'} ${(latencyTrend * 100).toFixed(1)}%`);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return (last - first) / first;
  }

  private suggestStrategyAdjustments(): void {
    // 戦略調整の提案
    const recentPerformance = this.performanceHistory.slice(-5);
    const avgThroughput = recentPerformance.reduce((sum, p) => sum + p.throughput, 0) / recentPerformance.length;
    
    if (avgThroughput < 20) {
      console.log(`💡 戦略調整提案: スループット最適化戦略への切り替えを検討`);
    }
  }

  private estimateImprovement(
    currentBatchSize: number,
    optimizedBatchSize: number,
    currentPerformance: BatchPerformanceMetrics
  ): { throughputGain: number; latencyReduction: number; memoryEfficiency: number; confidence: number } {
    
    const sizeRatio = optimizedBatchSize / currentBatchSize;
    
    // 簡易推定（実際はより複雑な機械学習モデルを使用）
    return {
      throughputGain: (sizeRatio - 1) * 50, // 50% max improvement
      latencyReduction: Math.max(0, (1 - sizeRatio) * 30), // 30% max reduction
      memoryEfficiency: Math.max(0, (1 - sizeRatio) * 20), // 20% max efficiency
      confidence: Math.min(0.9, this.performanceHistory.length / 20) // based on history
    };
  }

  private generateRecommendations(
    context: BatchExecutionContext,
    optimizedBatchSize: number,
    strategy: BatchSizeStrategy
  ): string[] {
    
    const recommendations: string[] = [];
    
    if (optimizedBatchSize > context.currentBatchSize * 1.5) {
      recommendations.push('バッチサイズの大幅増加 - メモリ使用量を監視');
    }
    
    if (optimizedBatchSize < context.currentBatchSize * 0.7) {
      recommendations.push('バッチサイズの削減 - 並列度の調整を検討');
    }
    
    if (context.resourceUtilization.memory > 0.8) {
      recommendations.push('メモリ使用率が高い - GC頻度の確認を推奨');
    }
    
    recommendations.push(`使用戦略: ${strategy.description}`);
    
    return recommendations;
  }

  private updateLearningData(
    context: BatchExecutionContext,
    result: BatchOptimizationResult
  ): void {
    
    const metrics: BatchSizeOptimizationMetrics = {
      originalBatchSize: result.originalBatchSize,
      optimizedBatchSize: result.optimizedBatchSize,
      improvement: {
        throughputGain: result.expectedThroughputGain,
        latencyReduction: result.expectedLatencyReduction,
        memoryEfficiency: result.expectedMemoryEfficiency
      },
      resourceImpact: {
        cpuChange: 0, // 実際の測定値で更新
        memoryChange: 0,
        ioChange: 0
      },
      confidence: result.confidence
    };
    
    this.optimizationResults.push(metrics);
    
    // 履歴サイズ制限
    if (this.optimizationResults.length > 50) {
      this.optimizationResults.shift();
    }
  }
}

/**
 * システムリソース監視クラス
 */
class SystemResourceMonitor {
  async getCurrentUtilization(): Promise<ResourceUtilization> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    
    return {
      cpu: await this.getCpuUsage(),
      memory: memoryUsage.heapUsed / totalMemory,
      io: await this.getIoUsage()
    };
  }
  
  private async getCpuUsage(): Promise<number> {
    const startTime = process.hrtime();
    const startUsage = process.cpuUsage();
    
    // 100ms待機してCPU使用率を測定
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = process.hrtime(startTime);
    const endUsage = process.cpuUsage(startUsage);
    
    const userTime = endUsage.user;
    const systemTime = endUsage.system;
    const totalTime = (endTime[0] * 1e9 + endTime[1]) / 1000; // microseconds
    
    return Math.min(1.0, (userTime + systemTime) / totalTime);
  }
  
  private async getIoUsage(): Promise<number> {
    // 簡易I/O使用率（実際の実装ではより詳細な測定を行う）
    return 0.3;
  }
}

// シングルトンインスタンスのエクスポート
export const dynamicBatchSizeOptimizer = new DynamicBatchSizeOptimizer();