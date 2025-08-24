/**
 * MetaEgg システム - 段階的並列処理システム
 * 
 * 生成→エンリッチ→評価の段階的並列実行システム
 * - パイプライン段階の依存関係管理
 * - 段階間データフロー最適化
 * - 並列実行チェーンの効率化
 * - リアルタイムパフォーマンス監視
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import pLimit from 'p-limit';
import type { 
  StageExecutionResult, 
  PipelineStageData, 
  StageProcessingConfig,
  ParallelExecutionMetrics 
} from '../../schema/types.js';
import { pipelineOptimizer } from './QoderPipelineOptimizer.js';

export interface PipelineStage {
  name: string;
  type: 'GENERATION' | 'ENRICHMENT' | 'EVALUATION';
  priority: number;
  dependencies: string[];
  processor: PipelineStageProcessor;
  config: StageProcessingConfig;
}

export interface StageExecutionPlan {
  stageId: string;
  inputData: any[];
  parallelBatches: number;
  expectedDuration: number;
  resourceAllocation: {
    cpu: number;
    memory: number;
    workers: number;
  };
}

export interface ParallelExecutionResult {
  executionId: string;
  totalDuration: number;
  stageDurations: Map<string, number>;
  throughput: number;
  efficiency: number;
  optimizationGains: {
    generationOptimization: number;
    enrichmentOptimization: number;
    evaluationOptimization: number;
  };
}

export class StagedParallelProcessor extends EventEmitter {
  private executionQueue = new Map<string, PipelineStage[]>();
  private stageResults = new Map<string, Map<string, any>>();
  private executionMetrics = new Map<string, ParallelExecutionMetrics>();
  
  // 段階別並列制御
  private readonly STAGE_CONCURRENCY = {
    GENERATION: 4,   // CSV生成の並列度
    ENRICHMENT: 6,   // データエンリッチの並列度
    EVALUATION: 3    // 評価処理の並列度
  };

  // 段階別パフォーマンス目標
  private readonly PERFORMANCE_TARGETS = {
    GENERATION: { itemsPerSecond: 500, maxLatency: 2000 },
    ENRICHMENT: { itemsPerSecond: 200, maxLatency: 5000 },
    EVALUATION: { itemsPerSecond: 100, maxLatency: 3000 }
  };

  constructor() {
    super();
    this.initializePipelineStages();
    console.log(`🔄 段階的並列処理システム初期化完了`);
  }

  /**
   * 段階的並列実行のメインメソッド
   */
  async executeParallelStages(
    inputData: any[], 
    requestedStages?: string[]
  ): Promise<ParallelExecutionResult> {
    
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    console.log(`🚀 段階的並列実行開始: ${executionId}`);
    console.log(`   - 入力データ: ${inputData.length}件`);
    console.log(`   - 実行ステージ: ${requestedStages?.join(' → ') || 'ALL'}`);

    try {
      // 1. 実行プランの作成
      const executionPlan = await this.createExecutionPlan(inputData, requestedStages);
      
      // 2. 段階的実行
      let currentData = inputData;
      const stageDurations = new Map<string, number>();
      
      for (const stageName of executionPlan.stageOrder) {
        const stageStartTime = Date.now();
        
        console.log(`⚡ ${stageName}段階実行開始: ${currentData.length}件`);
        
        currentData = await this.executeStageInParallel(
          stageName,
          currentData,
          executionPlan.stageConfigs.get(stageName)!
        );
        
        const stageDuration = Date.now() - stageStartTime;
        stageDurations.set(stageName, stageDuration);
        
        console.log(`   ✅ ${stageName}完了: ${stageDuration}ms, 出力: ${currentData.length}件`);
        
        // 段階間最適化チェック
        await this.optimizeIntermediateData(stageName, currentData);
      }

      // 3. 実行結果の分析
      const totalDuration = Date.now() - startTime;
      const result = this.analyzeExecutionResult(
        executionId,
        totalDuration,
        stageDurations,
        inputData.length,
        currentData.length
      );

      console.log(`✅ 段階的並列実行完了: ${executionId}`);
      console.log(`   - 総実行時間: ${totalDuration}ms`);
      console.log(`   - スループット: ${result.throughput.toFixed(1)} items/sec`);
      console.log(`   - 効率性: ${result.efficiency.toFixed(1)}%`);

      return result;

    } catch (error) {
      console.error(`❌ 段階的並列実行失敗: ${executionId}`, error);
      throw error;
    }
  }

  /**
   * 単一段階の並列実行
   */
  private async executeStageInParallel(
    stageName: string,
    inputData: any[],
    config: StageExecutionPlan
  ): Promise<any[]> {
    
    const stageType = this.getStageType(stageName);
    const concurrency = this.STAGE_CONCURRENCY[stageType];
    const limit = pLimit(concurrency);

    // データのバッチ分割
    const batches = this.createOptimalBatches(inputData, config.parallelBatches);
    
    console.log(`   📊 ${stageName} - バッチ数: ${batches.length}, 並列度: ${concurrency}`);

    // 並列バッチ処理
    const batchPromises = batches.map((batch, index) =>
      limit(async () => {
        const batchStartTime = Date.now();
        
        try {
          const result = await this.processBatch(stageName, batch, {
            batchIndex: index,
            totalBatches: batches.length,
            stageType,
            ...config
          });

          const batchDuration = Date.now() - batchStartTime;
          
          // バッチパフォーマンス監視
          this.monitorBatchPerformance(stageName, index, batch.length, batchDuration);
          
          return result;

        } catch (error) {
          console.error(`❌ ${stageName} バッチ${index}失敗:`, error);
          throw error;
        }
      })
    );

    // すべてのバッチ完了を待機
    const batchResults = await Promise.all(batchPromises);
    
    // 結果を統合
    const combinedResults = batchResults.flat();
    
    // ステージ後処理
    return await this.postProcessStageResults(stageName, combinedResults);
  }

  /**
   * バッチ処理の実行
   */
  private async processBatch(
    stageName: string,
    batch: any[],
    context: any
  ): Promise<any[]> {
    
    const stageType = context.stageType;
    
    switch (stageType) {
      case 'GENERATION':
        return await this.processGenerationBatch(batch, context);
      case 'ENRICHMENT':
        return await this.processEnrichmentBatch(batch, context);
      case 'EVALUATION':
        return await this.processEvaluationBatch(batch, context);
      default:
        throw new Error(`未知のステージタイプ: ${stageType}`);
    }
  }

  /**
   * 生成段階のバッチ処理
   */
  private async processGenerationBatch(batch: any[], context: any): Promise<any[]> {
    console.log(`   🏭 生成バッチ${context.batchIndex}処理: ${batch.length}件`);
    
    // CSVファイルの処理または統一データの生成
    const results = [];
    
    for (const item of batch) {
      try {
        // 統一データ形式への変換
        const processedItem = {
          stockCode: item.code || item.stockCode,
          source: item.source || 'unknown',
          rawData: item,
          processedAt: new Date(),
          batchId: context.batchIndex
        };
        
        results.push(processedItem);
        
      } catch (error) {
        console.error(`❌ 生成処理失敗: ${item}`, error);
        // エラーアイテムをスキップして継続
      }
    }
    
    return results;
  }

  /**
   * エンリッチ段階のバッチ処理
   */
  private async processEnrichmentBatch(batch: any[], context: any): Promise<any[]> {
    console.log(`   💎 エンリッチバッチ${context.batchIndex}処理: ${batch.length}件`);
    
    const enrichedResults = [];
    
    // 並列フェッチング
    const fetchPromises = batch.map(async (item) => {
      try {
        // 各種フェッチャーからのデータエンリッチ
        const enrichedData = {
          ...item,
          yahooData: await this.fetchYahooData(item.stockCode),
          irbankData: await this.fetchIRBankData(item.stockCode),
          kabuyohoData: await this.fetchKabuyohoData(item.stockCode),
          enrichedAt: new Date()
        };
        
        return enrichedData;
        
      } catch (error) {
        console.error(`❌ エンリッチ失敗: ${item.stockCode}`, error);
        return {
          ...item,
          enrichmentError: error.message,
          enrichedAt: new Date()
        };
      }
    });
    
    const results = await Promise.all(fetchPromises);
    return results.filter(result => result !== null);
  }

  /**
   * 評価段階のバッチ処理
   */
  private async processEvaluationBatch(batch: any[], context: any): Promise<any[]> {
    console.log(`   📊 評価バッチ${context.batchIndex}処理: ${batch.length}件`);
    
    const evaluatedResults = [];
    
    for (const item of batch) {
      try {
        // 三軸評価の実行
        const evaluation = {
          ...item,
          scores: {
            dividendScore: this.calculateDividendScore(item),
            growthScore: this.calculateGrowthScore(item),
            valueScore: this.calculateValueScore(item),
            qualityScore: this.calculateQualityScore(item),
            safetyScore: this.calculateSafetyScore(item),
            momentumScore: this.calculateMomentumScore(item)
          },
          overallScore: 0,
          recommendation: '',
          evaluatedAt: new Date()
        };
        
        // 総合スコア計算
        evaluation.overallScore = this.calculateOverallScore(evaluation.scores);
        evaluation.recommendation = this.generateRecommendation(evaluation.scores);
        
        evaluatedResults.push(evaluation);
        
      } catch (error) {
        console.error(`❌ 評価処理失敗: ${item.stockCode}`, error);
        // エラーアイテムもログとして保持
        evaluatedResults.push({
          ...item,
          evaluationError: error.message,
          evaluatedAt: new Date()
        });
      }
    }
    
    return evaluatedResults;
  }

  /**
   * 段階間データ最適化
   */
  private async optimizeIntermediateData(stageName: string, data: any[]): Promise<void> {
    const startTime = Date.now();
    
    // メモリ使用量チェック
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryMB > 1000) { // 1GB超過時
      console.log(`🗑️ メモリ最適化実行: ${memoryMB.toFixed(1)}MB`);
      
      // 不要なデータの削除
      data.forEach(item => {
        if (item.rawData) {
          delete item.rawData; // 元データを削除
        }
      });
      
      // ガベージコレクション実行
      if (global.gc) {
        global.gc();
      }
    }
    
    // データ品質チェック
    const validItems = data.filter(item => item && item.stockCode);
    if (validItems.length !== data.length) {
      console.warn(`⚠️ データ品質問題: ${data.length - validItems.length}件の無効アイテム`);
    }
    
    const optimizationTime = Date.now() - startTime;
    if (optimizationTime > 100) {
      console.log(`   ⚙️ ${stageName}段階間最適化: ${optimizationTime}ms`);
    }
  }

  /**
   * プライベートヘルパーメソッド
   */
  private initializePipelineStages(): void {
    console.log(`🔧 パイプラインステージ初期化:`);
    console.log(`   - 生成並列度: ${this.STAGE_CONCURRENCY.GENERATION}`);
    console.log(`   - エンリッチ並列度: ${this.STAGE_CONCURRENCY.ENRICHMENT}`);
    console.log(`   - 評価並列度: ${this.STAGE_CONCURRENCY.EVALUATION}`);
  }

  private generateExecutionId(): string {
    return `staged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createExecutionPlan(
    inputData: any[], 
    requestedStages?: string[]
  ): Promise<{ stageOrder: string[]; stageConfigs: Map<string, StageExecutionPlan> }> {
    
    const defaultStages = ['GENERATION', 'ENRICHMENT', 'EVALUATION'];
    const stageOrder = requestedStages || defaultStages;
    const stageConfigs = new Map<string, StageExecutionPlan>();
    
    for (const stageName of stageOrder) {
      const optimalBatches = this.calculateOptimalBatches(stageName, inputData.length);
      
      stageConfigs.set(stageName, {
        stageId: `${stageName}_${Date.now()}`,
        inputData,
        parallelBatches: optimalBatches,
        expectedDuration: this.estimateStageDuration(stageName, inputData.length),
        resourceAllocation: this.calculateResourceAllocation(stageName)
      });
    }
    
    return { stageOrder, stageConfigs };
  }

  private getStageType(stageName: string): 'GENERATION' | 'ENRICHMENT' | 'EVALUATION' {
    if (stageName.includes('GENERATION') || stageName.includes('generation')) {
      return 'GENERATION';
    } else if (stageName.includes('ENRICHMENT') || stageName.includes('enrichment')) {
      return 'ENRICHMENT';
    } else {
      return 'EVALUATION';
    }
  }

  private createOptimalBatches(data: any[], targetBatchCount: number): any[][] {
    const batchSize = Math.ceil(data.length / targetBatchCount);
    const batches: any[][] = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private calculateOptimalBatches(stageName: string, dataSize: number): number {
    const stageType = this.getStageType(stageName);
    const concurrency = this.STAGE_CONCURRENCY[stageType];
    
    // データサイズと並列度に基づく最適バッチ数
    return Math.max(concurrency, Math.min(concurrency * 3, Math.ceil(dataSize / 50)));
  }

  private estimateStageDuration(stageName: string, dataSize: number): number {
    const stageType = this.getStageType(stageName);
    const target = this.PERFORMANCE_TARGETS[stageType];
    
    return Math.ceil(dataSize / target.itemsPerSecond) * 1000; // milliseconds
  }

  private calculateResourceAllocation(stageName: string): any {
    const stageType = this.getStageType(stageName);
    
    return {
      cpu: this.STAGE_CONCURRENCY[stageType] * 0.1, // CPU usage estimate
      memory: this.STAGE_CONCURRENCY[stageType] * 50, // Memory in MB
      workers: this.STAGE_CONCURRENCY[stageType]
    };
  }

  private monitorBatchPerformance(
    stageName: string, 
    batchIndex: number, 
    batchSize: number, 
    duration: number
  ): void {
    
    const throughput = batchSize / (duration / 1000); // items per second
    const stageType = this.getStageType(stageName);
    const target = this.PERFORMANCE_TARGETS[stageType];
    
    if (throughput < target.itemsPerSecond * 0.7) {
      console.warn(`⚠️ ${stageName} パフォーマンス低下: ${throughput.toFixed(1)} < ${target.itemsPerSecond} items/sec`);
    }
  }

  private async postProcessStageResults(stageName: string, results: any[]): Promise<any[]> {
    // ステージ特有の後処理
    const stageType = this.getStageType(stageName);
    
    switch (stageType) {
      case 'GENERATION':
        return this.postProcessGeneration(results);
      case 'ENRICHMENT':
        return this.postProcessEnrichment(results);
      case 'EVALUATION':
        return this.postProcessEvaluation(results);
      default:
        return results;
    }
  }

  private postProcessGeneration(results: any[]): any[] {
    // 重複除去とデータ正規化
    const uniqueResults = results.filter((item, index, self) => 
      index === self.findIndex(other => other.stockCode === item.stockCode)
    );
    
    console.log(`   🔧 生成後処理: ${results.length} → ${uniqueResults.length}件 (重複除去)`);
    return uniqueResults;
  }

  private postProcessEnrichment(results: any[]): any[] {
    // エンリッチデータの品質チェック
    const validResults = results.filter(item => 
      item.yahooData || item.irbankData || item.kabuyohoData
    );
    
    console.log(`   🔧 エンリッチ後処理: ${results.length} → ${validResults.length}件 (品質フィルタ)`);
    return validResults;
  }

  private postProcessEvaluation(results: any[]): any[] {
    // スコア正規化と推奨順序付け
    const scoredResults = results
      .filter(item => item.scores && item.overallScore !== undefined)
      .sort((a, b) => b.overallScore - a.overallScore);
    
    console.log(`   🔧 評価後処理: ${results.length} → ${scoredResults.length}件 (スコア順)`);
    return scoredResults;
  }

  private analyzeExecutionResult(
    executionId: string,
    totalDuration: number,
    stageDurations: Map<string, number>,
    inputSize: number,
    outputSize: number
  ): ParallelExecutionResult {
    
    const throughput = outputSize / (totalDuration / 1000);
    const efficiency = (outputSize / inputSize) * 100;
    
    // 段階別最適化ゲインを計算
    const optimizationGains = this.calculateOptimizationGains(stageDurations, inputSize);
    
    return {
      executionId,
      totalDuration,
      stageDurations,
      throughput,
      efficiency,
      optimizationGains
    };
  }

  private calculateOptimizationGains(
    stageDurations: Map<string, number>, 
    inputSize: number
  ): any {
    
    return {
      generationOptimization: this.calculateStageOptimization('GENERATION', stageDurations, inputSize),
      enrichmentOptimization: this.calculateStageOptimization('ENRICHMENT', stageDurations, inputSize),
      evaluationOptimization: this.calculateStageOptimization('EVALUATION', stageDurations, inputSize)
    };
  }

  private calculateStageOptimization(
    stageType: string, 
    stageDurations: Map<string, number>, 
    inputSize: number
  ): number {
    
    const actualDuration = stageDurations.get(stageType) || 0;
    const target = this.PERFORMANCE_TARGETS[stageType as keyof typeof this.PERFORMANCE_TARGETS];
    const estimatedSequentialTime = inputSize / target.itemsPerSecond * 1000;
    
    return ((estimatedSequentialTime - actualDuration) / estimatedSequentialTime) * 100;
  }

  // スコア計算メソッド（簡略実装）
  private calculateDividendScore(item: any): number {
    const dividendYield = item.yahooData?.dividendYield || 0;
    return Math.min(100, dividendYield * 20); // 5%で100点
  }

  private calculateGrowthScore(item: any): number {
    const roe = item.irbankData?.roe || 0;
    return Math.min(100, roe * 5); // 20%で100点
  }

  private calculateValueScore(item: any): number {
    const per = item.yahooData?.per || 0;
    return per > 0 ? Math.max(0, 100 - per * 5) : 0; // PER低いほど高スコア
  }

  private calculateQualityScore(item: any): number {
    const equityRatio = item.irbankData?.equityRatio || 0;
    return Math.min(100, equityRatio * 2); // 50%で100点
  }

  private calculateSafetyScore(item: any): number {
    const operatingMargin = item.irbankData?.operatingMargin || 0;
    return Math.min(100, operatingMargin * 10); // 10%で100点
  }

  private calculateMomentumScore(item: any): number {
    const targetPrice = item.kabuyohoData?.targetPrice || 0;
    const currentPrice = item.yahooData?.price || 0;
    if (targetPrice > 0 && currentPrice > 0) {
      const upside = ((targetPrice - currentPrice) / currentPrice) * 100;
      return Math.max(0, Math.min(100, upside * 2)); // 50%上昇余地で100点
    }
    return 50; // デフォルト
  }

  private calculateOverallScore(scores: any): number {
    const weights = {
      dividendScore: 0.2,
      growthScore: 0.15,
      valueScore: 0.15,
      qualityScore: 0.2,
      safetyScore: 0.15,
      momentumScore: 0.15
    };
    
    return Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key] || 0) * weight;
    }, 0);
  }

  private generateRecommendation(scores: any): string {
    const overall = this.calculateOverallScore(scores);
    
    if (overall >= 80) return 'STRONG_BUY';
    if (overall >= 65) return 'BUY';
    if (overall >= 50) return 'HOLD';
    if (overall >= 35) return 'WEAK_HOLD';
    return 'SELL';
  }

  // データ取得メソッド（簡略実装）
  private async fetchYahooData(stockCode: string): Promise<any> {
    // 実際の実装では UnifiedFetcher を使用
    return {
      price: Math.random() * 1000 + 100,
      per: Math.random() * 20 + 5,
      pbr: Math.random() * 3 + 0.5,
      dividendYield: Math.random() * 5 + 1
    };
  }

  private async fetchIRBankData(stockCode: string): Promise<any> {
    return {
      roe: Math.random() * 20 + 5,
      equityRatio: Math.random() * 50 + 30,
      operatingMargin: Math.random() * 15 + 2
    };
  }

  private async fetchKabuyohoData(stockCode: string): Promise<any> {
    return {
      targetPrice: Math.random() * 1200 + 200,
      rating: Math.floor(Math.random() * 5) + 1,
      recommendation: ['SELL', 'WEAK_HOLD', 'HOLD', 'BUY', 'STRONG_BUY'][Math.floor(Math.random() * 5)]
    };
  }
}

// シングルトンインスタンスのエクスポート
export const stagedParallelProcessor = new StagedParallelProcessor();