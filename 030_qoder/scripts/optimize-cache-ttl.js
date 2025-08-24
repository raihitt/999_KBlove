#!/usr/bin/env node

/**
 * MetaEgg システム - TTL最適化スクリプト
 * 
 * キャッシュTTL（Time To Live）の動的最適化
 * - データ特性別TTL調整
 * - アクセスパターン分析による最適化
 * - キャッシュヒット率向上とメモリ効率化
 * - リアルタイム監視と自動調整
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CacheTTLOptimizer {
  constructor() {
    this.srcPath = path.resolve(__dirname, '../src');
    this.dataPath = path.resolve(__dirname, '../data');
    this.outputPath = path.resolve(__dirname, '../output');
    this.cacheDir = path.join(this.dataPath, 'cache');
    
    // データ特性別デフォルトTTL設定（秒）
    this.defaultTTLConfig = {
      'stock-price': 300,      // 株価: 5分
      'financial-data': 3600,  // 財務データ: 1時間
      'company-info': 86400,   // 企業情報: 24時間
      'market-data': 1800,     // 市場データ: 30分
      'news-data': 7200,       // ニュース: 2時間
      'analysis-result': 10800, // 分析結果: 3時間
      'static-data': 604800    // 静的データ: 7日間
    };
    
    // アクセスパターン分析データ
    this.accessPatterns = new Map();
    this.ttlOptimizationHistory = [];
    this.performanceMetrics = {
      totalCacheAccess: 0,
      cacheHits: 0,
      cacheMisses: 0,
      expiredEntries: 0,
      optimizedEntries: 0
    };
  }

  async run() {
    console.log('⏱️ キャッシュTTL最適化システム開始');
    console.log('=' .repeat(60));
    
    try {
      // 1. キャッシュディレクトリ検証
      console.log('📁 1. キャッシュディレクトリ検証');
      await this.validateCacheDirectory();
      
      // 2. 現在のキャッシュ状態分析
      console.log('\n📊 2. 現在のキャッシュ状態分析');
      const cacheState = await this.analyzeCacheState();
      
      // 3. アクセスパターン分析
      console.log('\n🔍 3. アクセスパターン分析');
      const accessAnalysis = await this.analyzeAccessPatterns();
      
      // 4. TTL最適化実行
      console.log('\n⚙️ 4. TTL最適化実行');
      const optimizationResults = await this.optimizeTTLSettings(cacheState, accessAnalysis);
      
      // 5. 最適化検証
      console.log('\n✅ 5. 最適化検証');
      const validationResults = await this.validateOptimization(optimizationResults);
      
      // 6. 設定ファイル更新
      console.log('\n💾 6. 最適化設定ファイル更新');
      await this.updateTTLConfiguration(optimizationResults);
      
      // 7. レポート生成
      console.log('\n📋 7. TTL最適化レポート生成');
      await this.generateOptimizationReport(cacheState, optimizationResults, validationResults);
      
      console.log('\n✅ TTL最適化完了');
      console.log(`   - 最適化エントリ数: ${this.performanceMetrics.optimizedEntries}`);
      console.log(`   - 期待キャッシュヒット率向上: ${this.calculateExpectedImprovement()}%`);
      
    } catch (error) {
      console.error('❌ TTL最適化失敗:', error);
      throw error;
    }
  }

  async validateCacheDirectory() {
    try {
      await fs.access(this.cacheDir);
      const cacheFiles = await fs.readdir(this.cacheDir);
      console.log(`   ✓ キャッシュディレクトリ確認: ${cacheFiles.length}ファイル`);
      
      if (cacheFiles.length === 0) {
        console.log('   ⚠️ キャッシュファイルが見つかりません。テストデータを作成します。');
        await this.createTestCacheFiles();
      }
    } catch (error) {
      console.log('   📁 キャッシュディレクトリを作成します');
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.createTestCacheFiles();
    }
  }

  async createTestCacheFiles() {
    const testCacheData = [
      {
        filename: 'stock-price-7203.json',
        type: 'stock-price',
        data: { stockCode: '7203', price: 850, lastUpdated: new Date().toISOString() }
      },
      {
        filename: 'financial-data-6758.json',
        type: 'financial-data',
        data: { stockCode: '6758', per: 15.2, pbr: 1.1, roe: 8.5, lastUpdated: new Date().toISOString() }
      },
      {
        filename: 'company-info-4519.json',
        type: 'company-info',
        data: { stockCode: '4519', name: 'テスト株式会社', sector: '情報・通信', lastUpdated: new Date().toISOString() }
      }
    ];

    for (const testData of testCacheData) {
      const filePath = path.join(this.cacheDir, testData.filename);
      await fs.writeFile(filePath, JSON.stringify(testData.data, null, 2));
    }
    
    console.log(`   ✓ テストキャッシュファイル作成: ${testCacheData.length}ファイル`);
  }

  async analyzeCacheState() {
    const cacheState = {
      totalFiles: 0,
      filesByType: new Map(),
      sizesByType: new Map(),
      agesByType: new Map(),
      expiredFiles: [],
      healthyFiles: []
    };

    try {
      const cacheFiles = await fs.readdir(this.cacheDir);
      cacheState.totalFiles = cacheFiles.length;

      for (const file of cacheFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          const fileType = this.determineDataType(file);
          const age = (Date.now() - stats.mtime.getTime()) / 1000; // 秒

          // ファイルタイプ別集計
          cacheState.filesByType.set(fileType, (cacheState.filesByType.get(fileType) || 0) + 1);
          cacheState.sizesByType.set(fileType, (cacheState.sizesByType.get(fileType) || 0) + stats.size);
          
          const ages = cacheState.agesByType.get(fileType) || [];
          ages.push(age);
          cacheState.agesByType.set(fileType, ages);

          // TTL期限チェック
          const defaultTTL = this.defaultTTLConfig[fileType] || 3600;
          if (age > defaultTTL) {
            cacheState.expiredFiles.push({ file, type: fileType, age, ttl: defaultTTL });
          } else {
            cacheState.healthyFiles.push({ file, type: fileType, age, ttl: defaultTTL });
          }
        }
      }
    } catch (error) {
      console.error('   ❌ キャッシュ状態分析エラー:', error.message);
    }

    console.log(`   ✓ キャッシュ状態分析完了:`);
    console.log(`     - 総ファイル数: ${cacheState.totalFiles}`);
    console.log(`     - 期限切れファイル: ${cacheState.expiredFiles.length}`);
    console.log(`     - 有効ファイル: ${cacheState.healthyFiles.length}`);

    return cacheState;
  }

  async analyzeAccessPatterns() {
    const accessAnalysis = {
      highFrequencyTypes: [],
      lowFrequencyTypes: [],
      peakAccessTimes: new Map(),
      dataVolatility: new Map()
    };

    // キャッシュファイルのアクセスパターンを分析
    try {
      const cacheFiles = await fs.readdir(this.cacheDir);
      
      for (const file of cacheFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          const fileType = this.determineDataType(file);
          
          // アクセス頻度の推定（実際の実装ではアクセスログを使用）
          const accessFrequency = this.estimateAccessFrequency(fileType, stats);
          
          if (!this.accessPatterns.has(fileType)) {
            this.accessPatterns.set(fileType, []);
          }
          this.accessPatterns.get(fileType).push(accessFrequency);
        }
      }

      // パターン分析
      for (const [dataType, frequencies] of this.accessPatterns) {
        const avgFrequency = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const volatility = this.calculateVolatility(frequencies);
        
        accessAnalysis.dataVolatility.set(dataType, volatility);
        
        if (avgFrequency > 10) { // 1日10回以上
          accessAnalysis.highFrequencyTypes.push(dataType);
        } else if (avgFrequency < 2) { // 1日2回未満
          accessAnalysis.lowFrequencyTypes.push(dataType);
        }
      }

    } catch (error) {
      console.error('   ❌ アクセスパターン分析エラー:', error.message);
    }

    console.log(`   ✓ アクセスパターン分析完了:`);
    console.log(`     - 高頻度アクセス: ${accessAnalysis.highFrequencyTypes.length}タイプ`);
    console.log(`     - 低頻度アクセス: ${accessAnalysis.lowFrequencyTypes.length}タイプ`);

    return accessAnalysis;
  }

  async optimizeTTLSettings(cacheState, accessAnalysis) {
    const optimizationResults = {
      optimizedTTLs: new Map(),
      changeReasons: new Map(),
      expectedImprovements: new Map(),
      recommendations: []
    };

    console.log(`   ⚙️ ${cacheState.filesByType.size}データタイプのTTL最適化中...`);

    for (const [dataType, fileCount] of cacheState.filesByType) {
      const currentTTL = this.defaultTTLConfig[dataType] || 3600;
      const optimizedTTL = await this.calculateOptimalTTL(dataType, cacheState, accessAnalysis);
      
      if (optimizedTTL !== currentTTL) {
        optimizationResults.optimizedTTLs.set(dataType, optimizedTTL);
        optimizationResults.changeReasons.set(dataType, this.getTTLChangeReason(dataType, currentTTL, optimizedTTL, accessAnalysis));
        
        const improvement = this.estimateImprovement(dataType, currentTTL, optimizedTTL);
        optimizationResults.expectedImprovements.set(dataType, improvement);
        
        this.performanceMetrics.optimizedEntries += fileCount;
        
        console.log(`     📊 ${dataType}: ${currentTTL}s → ${optimizedTTL}s (${improvement.cacheHitImprovement.toFixed(1)}% 向上期待)`);
      } else {
        console.log(`     ✓ ${dataType}: ${currentTTL}s (最適)`);
      }
    }

    // 全体推奨事項の生成
    optimizationResults.recommendations = this.generateOptimizationRecommendations(optimizationResults, accessAnalysis);

    console.log(`   ✅ TTL最適化完了: ${optimizationResults.optimizedTTLs.size}タイプを調整`);
    return optimizationResults;
  }

  async calculateOptimalTTL(dataType, cacheState, accessAnalysis) {
    const currentTTL = this.defaultTTLConfig[dataType] || 3600;
    let optimalTTL = currentTTL;

    // 高頻度アクセスデータの場合、TTLを短縮してフレッシュ性向上
    if (accessAnalysis.highFrequencyTypes.includes(dataType)) {
      optimalTTL = Math.max(60, currentTTL * 0.5); // 最低1分、最大50%短縮
    }
    
    // 低頻度アクセスデータの場合、TTLを延長してメモリ効率化
    if (accessAnalysis.lowFrequencyTypes.includes(dataType)) {
      optimalTTL = Math.min(604800, currentTTL * 2); // 最大7日、2倍延長
    }

    // データ変動性を考慮
    const volatility = accessAnalysis.dataVolatility.get(dataType) || 0.5;
    if (volatility > 0.8) { // 高変動データ
      optimalTTL = Math.max(60, optimalTTL * 0.7); // TTL短縮
    } else if (volatility < 0.2) { // 低変動データ
      optimalTTL = Math.min(86400, optimalTTL * 1.5); // TTL延長（最大24時間）
    }

    // データタイプ別特別調整
    switch (dataType) {
      case 'stock-price':
        // 市場開市時間を考慮（平日9-15時は短いTTL）
        optimalTTL = this.adjustForMarketHours(optimalTTL);
        break;
      case 'financial-data':
        // 四半期決算期を考慮
        optimalTTL = this.adjustForEarningsSeason(optimalTTL);
        break;
      case 'static-data':
        // 静的データは長いTTLを維持
        optimalTTL = Math.max(optimalTTL, 86400);
        break;
    }

    return Math.round(optimalTTL);
  }

  adjustForMarketHours(baseTTL) {
    const now = new Date();
    const hour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = isWeekday && hour >= 9 && hour <= 15;

    if (isMarketHours) {
      return Math.max(60, baseTTL * 0.3); // 市場時間中は30%に短縮
    } else {
      return Math.min(1800, baseTTL * 1.5); // 市場時間外は1.5倍に延長（最大30分）
    }
  }

  adjustForEarningsSeason(baseTTL) {
    // 簡易的な決算期判定（3,6,9,12月）
    const now = new Date();
    const month = now.getMonth() + 1;
    const isEarningsSeason = [3, 6, 9, 12].includes(month);

    if (isEarningsSeason) {
      return Math.max(300, baseTTL * 0.5); // 決算期は50%に短縮（最小5分）
    }
    return baseTTL;
  }

  async validateOptimization(optimizationResults) {
    const validationResults = {
      totalOptimizedTypes: optimizationResults.optimizedTTLs.size,
      validOptimizations: 0,
      invalidOptimizations: 0,
      potentialIssues: [],
      overallScore: 0
    };

    console.log(`   ✅ ${validationResults.totalOptimizedTypes}タイプの最適化を検証中...`);

    for (const [dataType, newTTL] of optimizationResults.optimizedTTLs) {
      const isValid = this.validateTTLSetting(dataType, newTTL);
      
      if (isValid.valid) {
        validationResults.validOptimizations++;
        console.log(`     ✓ ${dataType}: TTL=${newTTL}s (有効)`);
      } else {
        validationResults.invalidOptimizations++;
        validationResults.potentialIssues.push(`${dataType}: ${isValid.reason}`);
        console.log(`     ⚠️ ${dataType}: TTL=${newTTL}s (${isValid.reason})`);
      }
    }

    validationResults.overallScore = validationResults.totalOptimizedTypes > 0 
      ? (validationResults.validOptimizations / validationResults.totalOptimizedTypes) * 100 
      : 100;

    console.log(`   ✓ 検証完了: スコア ${validationResults.overallScore.toFixed(1)}%`);
    return validationResults;
  }

  validateTTLSetting(dataType, ttl) {
    // TTL範囲チェック
    if (ttl < 60) {
      return { valid: false, reason: 'TTLが短すぎます（最小60秒）' };
    }
    if (ttl > 604800) {
      return { valid: false, reason: 'TTLが長すぎます（最大7日）' };
    }

    // データタイプ別妥当性チェック
    switch (dataType) {
      case 'stock-price':
        if (ttl > 3600) {
          return { valid: false, reason: '株価データのTTLが長すぎます' };
        }
        break;
      case 'static-data':
        if (ttl < 3600) {
          return { valid: false, reason: '静的データのTTLが短すぎます' };
        }
        break;
    }

    return { valid: true };
  }

  async updateTTLConfiguration(optimizationResults) {
    const newConfig = { ...this.defaultTTLConfig };
    
    // 最適化されたTTL設定を適用
    for (const [dataType, newTTL] of optimizationResults.optimizedTTLs) {
      newConfig[dataType] = newTTL;
    }

    const configData = {
      version: '1.0.0',
      lastOptimized: new Date().toISOString(),
      ttlSettings: newConfig,
      optimizationMetadata: {
        optimizedTypes: Array.from(optimizationResults.optimizedTTLs.keys()),
        totalImprovementExpected: this.calculateExpectedImprovement(),
        recommendations: optimizationResults.recommendations
      }
    };

    // 設定ファイル書き込み
    await fs.mkdir(this.outputPath, { recursive: true });
    const configPath = path.join(this.outputPath, 'optimized-ttl-config.json');
    
    await fs.writeFile(
      configPath,
      JSON.stringify(configData, null, 2),
      'utf8'
    );

    console.log(`   ✓ TTL設定ファイル更新: ${configPath}`);
  }

  async generateOptimizationReport(cacheState, optimizationResults, validationResults) {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCacheFiles: cacheState.totalFiles,
        expiredFiles: cacheState.expiredFiles.length,
        optimizedDataTypes: optimizationResults.optimizedTTLs.size,
        validationScore: validationResults.overallScore,
        expectedCacheHitImprovement: this.calculateExpectedImprovement()
      },
      cacheAnalysis: {
        filesByType: Object.fromEntries(cacheState.filesByType),
        expiredFilesByType: this.groupExpiredFilesByType(cacheState.expiredFiles)
      },
      ttlOptimization: {
        originalSettings: this.defaultTTLConfig,
        optimizedSettings: Object.fromEntries(optimizationResults.optimizedTTLs),
        changeReasons: Object.fromEntries(optimizationResults.changeReasons)
      },
      validation: validationResults,
      recommendations: optimizationResults.recommendations
    };

    // JSONレポート
    const jsonPath = path.join(this.outputPath, 'ttl-optimization-report.json');
    await fs.writeFile(
      jsonPath,
      JSON.stringify(reportData, null, 2),
      'utf8'
    );

    // HTMLレポート（簡易版）
    const htmlReport = this.generateHtmlReport(reportData);
    const htmlPath = path.join(this.outputPath, 'ttl-optimization-report.html');
    await fs.writeFile(htmlPath, htmlReport, 'utf8');

    console.log(`   ✓ 最適化レポート生成:`);
    console.log(`     - JSON: ${jsonPath}`);
    console.log(`     - HTML: ${htmlPath}`);
  }

  // ヘルパーメソッド
  determineDataType(filename) {
    const name = filename.toLowerCase();
    if (name.includes('price')) return 'stock-price';
    if (name.includes('financial')) return 'financial-data';
    if (name.includes('company') || name.includes('info')) return 'company-info';
    if (name.includes('market')) return 'market-data';
    if (name.includes('news')) return 'news-data';
    if (name.includes('analysis')) return 'analysis-result';
    return 'static-data';
  }

  estimateAccessFrequency(dataType, stats) {
    // 簡易的なアクセス頻度推定（実際の実装ではアクセスログを使用）
    const frequencies = {
      'stock-price': 20,      // 1日20回
      'financial-data': 5,    // 1日5回
      'company-info': 2,      // 1日2回
      'market-data': 15,      // 1日15回
      'news-data': 8,         // 1日8回
      'analysis-result': 3,   // 1日3回
      'static-data': 0.5      // 2日に1回
    };
    
    return frequencies[dataType] || 5;
  }

  calculateVolatility(frequencies) {
    if (frequencies.length < 2) return 0.5;
    
    const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
    
    return Math.min(1, Math.sqrt(variance) / mean);
  }

  getTTLChangeReason(dataType, oldTTL, newTTL, accessAnalysis) {
    if (newTTL < oldTTL) {
      if (accessAnalysis.highFrequencyTypes.includes(dataType)) {
        return 'アクセス頻度が高いため、フレッシュ性向上のためTTLを短縮';
      }
      return 'データ変動性が高いため、TTLを短縮';
    } else {
      if (accessAnalysis.lowFrequencyTypes.includes(dataType)) {
        return 'アクセス頻度が低いため、メモリ効率化のためTTLを延長';
      }
      return 'データ変動性が低いため、TTLを延長';
    }
  }

  estimateImprovement(dataType, oldTTL, newTTL) {
    const ratio = newTTL / oldTTL;
    
    return {
      cacheHitImprovement: ratio < 1 ? (1 - ratio) * 20 : 0, // TTL短縮時のヒット率向上
      memoryEfficiency: ratio > 1 ? (ratio - 1) * 15 : 0,    // TTL延長時のメモリ効率向上
      freshnessImprovement: ratio < 1 ? (1 - ratio) * 30 : 0  // フレッシュ性向上
    };
  }

  generateOptimizationRecommendations(optimizationResults, accessAnalysis) {
    const recommendations = [];
    
    if (accessAnalysis.highFrequencyTypes.length > 0) {
      recommendations.push(`高頻度アクセスデータ（${accessAnalysis.highFrequencyTypes.join(', ')}）の監視強化を推奨`);
    }
    
    if (optimizationResults.optimizedTTLs.size > 3) {
      recommendations.push('多数のTTL変更が行われました。パフォーマンス監視を推奨');
    }
    
    recommendations.push('定期的なTTL最適化の実行（週次推奨）');
    recommendations.push('アクセスログ取得によるより精密な最適化の検討');
    
    return recommendations;
  }

  calculateExpectedImprovement() {
    // 最適化されたエントリ数に基づく改善率推定
    const improvementRate = Math.min(25, this.performanceMetrics.optimizedEntries * 2);
    return improvementRate;
  }

  groupExpiredFilesByType(expiredFiles) {
    const grouped = {};
    expiredFiles.forEach(file => {
      if (!grouped[file.type]) grouped[file.type] = 0;
      grouped[file.type]++;
    });
    return grouped;
  }

  generateHtmlReport(reportData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>TTL最適化レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        .section { margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>TTL最適化レポート</h1>
    <p>生成日時: ${reportData.timestamp}</p>
    
    <div class="summary">
        <h2>サマリー</h2>
        <p>総キャッシュファイル数: ${reportData.summary.totalCacheFiles}</p>
        <p>最適化データタイプ数: ${reportData.summary.optimizedDataTypes}</p>
        <p>期待キャッシュヒット率向上: ${reportData.summary.expectedCacheHitImprovement}%</p>
    </div>
    
    <div class="section">
        <h2>推奨事項</h2>
        <ul>
            ${reportData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
  }
}

// メイン実行部
async function main() {
  try {
    const optimizer = new CacheTTLOptimizer();
    await optimizer.run();
    console.log('\n🎉 TTL最適化が正常に完了しました！');
  } catch (error) {
    console.error('\n💥 エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CacheTTLOptimizer };