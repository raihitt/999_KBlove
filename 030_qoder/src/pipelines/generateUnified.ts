/**
 * MetaEgg システム - 統一データ生成パイプライン
 * 
 * MonexとSBIのCSVファイルから効率化最適化された統一データを生成
 * - 並列CSV処理による高速化
 * - 自動エンコーディング検出・変換
 * - 重複除去と優先度付け
 * - データ品質保証
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { csvOptimizer } from '../optimization/csv/QoderCSVOptimizer.js';
import { EncodingDetector, EncodingConverter } from '../utils/encoding.js';
import type { UnifiedStockData, StockData } from '../schema/types.js';
import { optimizationConfig } from '../core/config/optimization.js';

export interface GenerateUnifiedOptions {
  inputDirectory: string;
  outputPath: string;
  enableParallelProcessing?: boolean;
  enableEncodingConversion?: boolean;
  createBackup?: boolean;
  maxConcurrency?: number;
  namespace?: string;
}

export interface GenerateUnifiedResult {
  success: boolean;
  unifiedData: UnifiedStockData[];
  statistics: {
    totalFiles: number;
    processedFiles: number;
    totalRecords: number;
    validRecords: number;
    duplicatesRemoved: number;
    qualityScore: number;
    processingTime: number;
    memoryUsage: {
      peak: number;
      average: number;
    };
  };
  sources: {
    monex: {
      files: string[];
      records: number;
    };
    sbi: {
      files: string[];
      records: number;
    };
  };
  errorDetails?: string[];
}

export class UnifiedDataGenerator {
  private config = optimizationConfig.getConfig();
  private processingStartTime: number = 0;
  private memorySnapshots: number[] = [];

  /**
   * 統一データ生成のメインメソッド
   */
  async generateUnified(options: GenerateUnifiedOptions): Promise<GenerateUnifiedResult> {
    console.log('🚀 統一データ生成開始');
    console.log(`📂 入力ディレクトリ: ${options.inputDirectory}`);
    console.log(`📄 出力パス: ${options.outputPath}`);
    
    this.processingStartTime = Date.now();
    this.startMemoryMonitoring();

    const errors: string[] = [];
    
    try {
      // 1. ファイル発見と分類
      const fileDiscovery = await this.discoverCSVFiles(options.inputDirectory);
      console.log(`📋 発見ファイル: Monex ${fileDiscovery.monexFiles.length}件, SBI ${fileDiscovery.sbiFiles.length}件`);

      // 2. エンコーディング変換（必要時）
      if (options.enableEncodingConversion !== false) {
        await this.convertEncodingsIfNeeded([...fileDiscovery.monexFiles, ...fileDiscovery.sbiFiles], options.createBackup);
      }

      // 3. 並列CSV処理
      const csvResults = await this.processCSVFilesInParallel(
        [...fileDiscovery.monexFiles, ...fileDiscovery.sbiFiles],
        options.enableParallelProcessing !== false
      );

      // 4. データ統合と重複除去
      const unifiedData = await this.unifyAndDeduplicateData(csvResults, fileDiscovery);

      // 5. 品質評価と最終化
      const finalData = await this.finalizeUnifiedData(unifiedData, options.namespace);

      // 6. 出力ファイル書き込み
      await this.writeUnifiedData(finalData, options.outputPath);

      // 7. 統計情報計算
      const statistics = this.calculateStatistics(csvResults, finalData);

      const result: GenerateUnifiedResult = {
        success: true,
        unifiedData: finalData,
        statistics,
        sources: {
          monex: {
            files: fileDiscovery.monexFiles,
            records: fileDiscovery.monexRecords
          },
          sbi: {
            files: fileDiscovery.sbiFiles,
            records: fileDiscovery.sbiRecords
          }
        },
        errorDetails: errors.length > 0 ? errors : undefined
      };

      console.log('✅ 統一データ生成完了');
      this.logStatistics(statistics);

      return result;

    } catch (error) {
      console.error('❌ 統一データ生成失敗:', error);
      
      return {
        success: false,
        unifiedData: [],
        statistics: {
          totalFiles: 0,
          processedFiles: 0,
          totalRecords: 0,
          validRecords: 0,
          duplicatesRemoved: 0,
          qualityScore: 0,
          processingTime: Date.now() - this.processingStartTime,
          memoryUsage: {
            peak: Math.max(...this.memorySnapshots, 0),
            average: this.memorySnapshots.length > 0 ? 
              this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length : 0
          }
        },
        sources: {
          monex: { files: [], records: 0 },
          sbi: { files: [], records: 0 }
        },
        errorDetails: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * CSVファイルの発見と分類
   */
  private async discoverCSVFiles(inputDirectory: string): Promise<{
    monexFiles: string[];
    sbiFiles: string[];
    monexRecords: number;
    sbiRecords: number;
  }> {
    console.log('🔍 CSVファイル発見中...');

    // Monexファイル検索（screening_*.csvを優先、なければ*.csv全て）
    const monexPattern1 = path.join(inputDirectory, '**/monex/screening_*.csv');
    const monexPattern2 = path.join(inputDirectory, '**/monex/*.csv');
    
    let monexFiles = await glob(monexPattern1);
    if (monexFiles.length === 0) {
      monexFiles = await glob(monexPattern2);
    }

    // SBIファイル検索
    const sbiPattern = path.join(inputDirectory, '**/sbi/*.csv');
    const sbiFiles = await glob(sbiPattern);

    // ファイル存在確認とカウント
    const validMonexFiles: string[] = [];
    const validSbiFiles: string[] = [];
    let monexRecords = 0;
    let sbiRecords = 0;

    for (const file of monexFiles) {
      try {
        await fs.access(file);
        validMonexFiles.push(file);
        const stats = await fs.stat(file);
        monexRecords += Math.floor(stats.size / 200); // 概算行数
      } catch (error) {
        console.warn(`⚠️ Monexファイルアクセス失敗: ${file}`);
      }
    }

    for (const file of sbiFiles) {
      try {
        await fs.access(file);
        validSbiFiles.push(file);
        const stats = await fs.stat(file);
        sbiRecords += Math.floor(stats.size / 150); // 概算行数
      } catch (error) {
        console.warn(`⚠️ SBIファイルアクセス失敗: ${file}`);
      }
    }

    return {
      monexFiles: validMonexFiles,
      sbiFiles: validSbiFiles,
      monexRecords,
      sbiRecords
    };
  }

  /**
   * エンコーディング変換（必要時）
   */
  private async convertEncodingsIfNeeded(filePaths: string[], createBackup: boolean = true): Promise<void> {
    console.log('🔤 エンコーディング検査・変換中...');

    const conversionResults = await EncodingConverter.convertMultipleFiles(filePaths, 'utf8', createBackup);
    
    const successCount = conversionResults.filter(r => r.success).length;
    const conversionCount = conversionResults.filter(r => r.success && r.sourceEncoding !== 'utf8').length;
    
    console.log(`✅ エンコーディング処理完了: ${successCount}/${filePaths.length}ファイル成功, ${conversionCount}ファイル変換`);
  }

  /**
   * 並列CSV処理
   */
  private async processCSVFilesInParallel(filePaths: string[], enableParallel: boolean) {
    console.log(`⚡ CSV処理開始: ${enableParallel ? '並列' : '逐次'}モード`);

    if (enableParallel && this.config.optimization.enableParallelProcessing) {
      return await csvOptimizer.processInParallel(filePaths);
    } else {
      // 逐次処理（フォールバック）
      const results = [];
      for (const file of filePaths) {
        const result = await csvOptimizer.memoryOptimizedParsing(file);
        results.push({
          data: result.data,
          metadata: {
            fileName: path.basename(file),
            encoding: result.encoding,
            rowCount: result.rowCount,
            processingTime: 0,
            quality: this.calculateDataQuality(result.data)
          }
        });
      }
      return results;
    }
  }

  /**
   * データ統合と重複除去
   */
  private async unifyAndDeduplicateData(csvResults: any[], fileDiscovery: any): Promise<StockData[]> {
    console.log('🔗 データ統合・重複除去中...');

    const allData: StockData[] = [];
    const codeMap = new Map<string, StockData>();

    // データソース別の優先度設定
    const sourcePriority = {
      monex: 1,
      sbi: 2
    };

    for (const result of csvResults) {
      const fileName = result.metadata.fileName;
      const source = fileName.includes('monex') ? 'monex' : 'sbi';
      
      for (const record of result.data) {
        if (!record.code) continue;

        const existing = codeMap.get(record.code);
        
        if (!existing) {
          // 新規データ
          codeMap.set(record.code, {
            ...record,
            source
          });
        } else {
          // 重複データ - 優先度とデータ品質で判定
          const existingPriority = sourcePriority[existing.source as keyof typeof sourcePriority] || 999;
          const newPriority = sourcePriority[source as keyof typeof sourcePriority] || 999;
          
          if (newPriority < existingPriority || this.isHigherQuality(record, existing)) {
            codeMap.set(record.code, {
              ...record,
              source
            });
          }
        }
      }
    }

    console.log(`🔄 重複除去結果: ${allData.length} → ${codeMap.size}レコード`);
    
    return Array.from(codeMap.values());
  }

  /**
   * 統一データの最終化
   */
  private async finalizeUnifiedData(unifiedData: StockData[], namespace?: string): Promise<UnifiedStockData[]> {
    console.log('🎯 統一データ最終化中...');

    const finalData: UnifiedStockData[] = [];

    for (let i = 0; i < unifiedData.length; i++) {
      const record = unifiedData[i];
      
      const unifiedRecord: UnifiedStockData = {
        ...record,
        unified_id: `${namespace || 'default'}_${record.code}_${Date.now()}_${i}`,
        priority_score: this.calculatePriorityScore(record),
        data_sources: [record.source || 'unknown'],
        scraping_status: 'pending',
        metadata: {
          sources: [record.source || 'unknown'],
          schemaVersion: '1.0.0',
          generatedAt: new Date()
        }
      };

      finalData.push(unifiedRecord);
    }

    // 優先度でソート
    finalData.sort((a, b) => b.priority_score - a.priority_score);

    console.log(`✅ 統一データ最終化完了: ${finalData.length}レコード`);
    
    return finalData;
  }

  /**
   * 統一データファイル書き込み
   */
  private async writeUnifiedData(unifiedData: UnifiedStockData[], outputPath: string): Promise<void> {
    console.log(`💾 統一データ書き込み中: ${outputPath}`);

    // 出力ディレクトリの作成
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // JSONファイル書き込み
    const jsonData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        totalRecords: unifiedData.length,
        schemaVersion: '1.0.0'
      },
      data: unifiedData
    };

    await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
    
    console.log(`✅ 統一データ書き込み完了: ${outputPath} (${unifiedData.length}レコード)`);
  }

  /**
   * 統計情報計算
   */
  private calculateStatistics(csvResults: any[], unifiedData: UnifiedStockData[]) {
    const totalFiles = csvResults.length;
    const processedFiles = csvResults.filter(r => r.data.length > 0).length;
    const totalRecords = csvResults.reduce((sum, r) => sum + r.data.length, 0);
    const validRecords = unifiedData.length;
    const duplicatesRemoved = totalRecords - validRecords;
    const qualityScore = this.calculateOverallQuality(unifiedData);
    const processingTime = Date.now() - this.processingStartTime;

    return {
      totalFiles,
      processedFiles,
      totalRecords,
      validRecords,
      duplicatesRemoved,
      qualityScore,
      processingTime,
      memoryUsage: {
        peak: Math.max(...this.memorySnapshots, 0),
        average: this.memorySnapshots.length > 0 ? 
          this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length : 0
      }
    };
  }

  /**
   * プライベートヘルパーメソッド
   */
  private calculateDataQuality(data: StockData[]): number {
    if (data.length === 0) return 0;
    
    let totalScore = 0;
    for (const record of data) {
      let score = 0;
      if (record.code) score += 10;
      if (record.name) score += 5;
      if (record.industry) score += 3;
      if (record.price) score += 3;
      if (record.dividendYield) score += 2;
      totalScore += score;
    }
    
    return (totalScore / (data.length * 23)) * 100;
  }

  private isHigherQuality(newRecord: StockData, existingRecord: StockData): boolean {
    const newScore = this.getRecordQualityScore(newRecord);
    const existingScore = this.getRecordQualityScore(existingRecord);
    return newScore > existingScore;
  }

  private getRecordQualityScore(record: StockData): number {
    let score = 0;
    if (record.code) score += 10;
    if (record.name) score += 5;
    if (record.industry) score += 3;
    if (record.price) score += 3;
    if (record.dividendYield) score += 2;
    if (record.per) score += 1;
    if (record.pbr) score += 1;
    if (record.roe) score += 1;
    return score;
  }

  private calculatePriorityScore(record: StockData): number {
    let score = 50; // ベーススコア
    
    // データ品質による加点
    if (record.dividendYield && record.dividendYield > 3) score += 20;
    if (record.per && record.per < 15) score += 10;
    if (record.pbr && record.pbr < 1.5) score += 10;
    if (record.roe && record.roe > 8) score += 15;
    if (record.industry) score += 5;
    
    return Math.min(score, 100);
  }

  private calculateOverallQuality(data: UnifiedStockData[]): number {
    if (data.length === 0) return 0;
    
    const totalScore = data.reduce((sum, record) => {
      return sum + this.getRecordQualityScore(record);
    }, 0);
    
    return (totalScore / (data.length * 26)) * 100;
  }

  private startMemoryMonitoring(): void {
    const interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memorySnapshots.push(memUsage.heapUsed / 1024 / 1024); // MB
    }, 1000);

    // 10分後に監視停止
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  }

  private logStatistics(stats: any): void {
    console.log('\n📊 統一データ生成統計:');
    console.log(`   ファイル処理: ${stats.processedFiles}/${stats.totalFiles}`);
    console.log(`   レコード処理: ${stats.validRecords}/${stats.totalRecords}`);
    console.log(`   重複除去: ${stats.duplicatesRemoved}レコード`);
    console.log(`   品質スコア: ${stats.qualityScore.toFixed(2)}%`);
    console.log(`   処理時間: ${stats.processingTime}ms`);
    console.log(`   メモリ使用量: 平均${stats.memoryUsage.average.toFixed(2)}MB, ピーク${stats.memoryUsage.peak.toFixed(2)}MB`);
  }
}

// インスタンスのエクスポート
export const unifiedDataGenerator = new UnifiedDataGenerator();