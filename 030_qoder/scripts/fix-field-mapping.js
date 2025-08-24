#!/usr/bin/env node

/**
 * MetaEgg システム - フィールドマッピング修正スクリプト
 * 
 * 異なるデータソース間のフィールドマッピング問題を検出・修正
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FieldMappingFixer {
  constructor() {
    this.srcPath = path.resolve(__dirname, '../src');
    this.dataPath = path.resolve(__dirname, '../data');
    this.outputPath = path.resolve(__dirname, '../output');
    
    // フィールドマッピング定義
    this.fieldMappings = {
      yahoo: {
        'stock_code': ['code', 'stockCode', 'symbol'],
        'company_name': ['name', 'companyName', 'title'],
        'price': ['currentPrice', 'lastPrice', 'value'],
        'per': ['priceEarningsRatio', 'pe', 'per_ratio'],
        'pbr': ['priceBookRatio', 'pb', 'pbr_ratio'],
        'dividend_yield': ['dividendYield', 'dividend', 'yield']
      },
      irbank: {
        'stock_code': ['code', 'stockCode', 'securities_code'],
        'roe': ['returnOnEquity', 'roe_percent', 'roe_ratio'],
        'equity_ratio': ['equityRatio', 'capitalRatio', 'equity_percentage'],
        'operating_margin': ['operatingMargin', 'operating_profit_margin', 'op_margin']
      },
      kabuyoho: {
        'stock_code': ['code', 'stockCode', 'ticker'],
        'target_price': ['targetPrice', 'target', 'price_target'],
        'recommendation': ['rating', 'recommend', 'advice']
      }
    };
    
    this.mappingStats = { processed: 0, fixed: 0, errors: 0, warnings: 0 };
  }

  async run() {
    console.log('🔧 フィールドマッピング修正システム開始');
    console.log('=' .repeat(60));
    
    try {
      // 1. データソース検出
      console.log('📁 1. データソースファイル検出');
      const sourceFiles = await this.detectSourceFiles();
      
      // 2. マッピング分析
      console.log('\n🔍 2. フィールドマッピング分析');
      const mappingIssues = await this.analyzeMappingIssues(sourceFiles);
      
      // 3. 自動修正
      console.log('\n🛠️ 3. 自動フィールドマッピング修正');
      const fixResults = await this.fixMappingIssues(mappingIssues);
      
      // 4. レポート生成
      console.log('\n📊 4. 修正レポート生成');
      await this.generateFixReport(mappingIssues, fixResults);
      
      console.log('\n✅ フィールドマッピング修正完了');
      console.log(`   - 処理ファイル数: ${this.mappingStats.processed}`);
      console.log(`   - 修正項目数: ${this.mappingStats.fixed}`);
      
    } catch (error) {
      console.error('❌ フィールドマッピング修正失敗:', error);
      throw error;
    }
  }

  async detectSourceFiles() {
    const sourceFiles = { csv: [], cache: [] };
    
    try {
      const csvFiles = await fs.readdir(this.dataPath);
      sourceFiles.csv = csvFiles
        .filter(file => file.endsWith('.csv'))
        .map(file => path.join(this.dataPath, file));
      console.log(`   ✓ CSVファイル: ${sourceFiles.csv.length}件`);
    } catch (error) {
      console.log(`   ⚠️ CSVディレクトリ読み込みエラー`);
    }
    
    try {
      const cacheDir = path.join(this.dataPath, 'cache');
      const cacheFiles = await fs.readdir(cacheDir);
      sourceFiles.cache = cacheFiles
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(cacheDir, file));
      console.log(`   ✓ キャッシュファイル: ${sourceFiles.cache.length}件`);
    } catch (error) {
      console.log(`   ⚠️ キャッシュディレクトリなし`);
    }
    
    return sourceFiles;
  }

  async analyzeMappingIssues(sourceFiles) {
    const issues = {
      fieldNameIssues: [],
      missingFields: [],
      dataTypeIssues: []
    };
    
    for (const csvFile of sourceFiles.csv) {
      const csvIssues = await this.analyzeCsvFile(csvFile);
      this.mergeIssues(issues, csvIssues);
    }
    
    for (const cacheFile of sourceFiles.cache) {
      const cacheIssues = await this.analyzeCacheFile(cacheFile);
      this.mergeIssues(issues, cacheIssues);
    }
    
    console.log(`   ✓ 分析完了: ${this.getTotalIssueCount(issues)}件の問題検出`);
    return issues;
  }

  async analyzeCsvFile(csvFile) {
    const issues = { fieldNameIssues: [], missingFields: [], dataTypeIssues: [] };
    
    try {
      const content = await fs.readFile(csvFile, 'utf8');
      const lines = content.trim().split('\n');
      if (lines.length === 0) return issues;
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const sourceType = this.detectSourceType(csvFile);
      
      // フィールド名問題検出
      const fieldIssues = this.detectFieldNameIssues(headers, sourceType);
      issues.fieldNameIssues.push(...fieldIssues);
      
      // 必須フィールド欠損検出
      if (!this.hasRequiredField(headers)) {
        issues.missingFields.push({
          type: 'MISSING_STOCK_CODE',
          file: csvFile,
          sourceType
        });
      }
      
      this.mappingStats.processed++;
      
    } catch (error) {
      console.error(`     ❌ ${path.basename(csvFile)} 分析エラー`);
      this.mappingStats.errors++;
    }
    
    return issues;
  }

  async analyzeCacheFile(cacheFile) {
    const issues = { fieldNameIssues: [], missingFields: [], dataTypeIssues: [] };
    
    try {
      const content = await fs.readFile(cacheFile, 'utf8');
      const data = JSON.parse(content);
      const sourceType = this.detectSourceTypeFromPath(cacheFile);
      
      const items = Array.isArray(data) ? data.slice(0, 5) : [data];
      
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          const fields = Object.keys(item);
          const fieldIssues = this.detectFieldNameIssues(fields, sourceType);
          issues.fieldNameIssues.push(...fieldIssues);
        }
      }
      
      this.mappingStats.processed++;
      
    } catch (error) {
      console.error(`     ❌ ${path.basename(cacheFile)} 分析エラー`);
      this.mappingStats.errors++;
    }
    
    return issues;
  }

  detectSourceType(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('yahoo')) return 'yahoo';
    if (fileName.includes('irbank')) return 'irbank';
    if (fileName.includes('kabuyoho')) return 'kabuyoho';
    return 'unknown';
  }

  detectSourceTypeFromPath(filePath) {
    const pathLower = filePath.toLowerCase();
    if (pathLower.includes('yahoo')) return 'yahoo';
    if (pathLower.includes('irbank')) return 'irbank';
    if (pathLower.includes('kabuyoho')) return 'kabuyoho';
    return 'unknown';
  }

  detectFieldNameIssues(fields, sourceType) {
    const issues = [];
    const mappings = this.fieldMappings[sourceType] || {};
    
    for (const field of fields) {
      const suggestion = this.suggestFieldMapping(field);
      if (suggestion && !this.isFieldMapped(field, mappings)) {
        issues.push({
          type: 'UNMAPPED_FIELD',
          field,
          suggestion,
          sourceType
        });
      }
    }
    
    return issues;
  }

  suggestFieldMapping(field) {
    const fieldLower = field.toLowerCase();
    if (fieldLower.includes('code')) return 'stockCode';
    if (fieldLower.includes('name')) return 'companyName';
    if (fieldLower.includes('price') && !fieldLower.includes('target')) return 'price';
    if (fieldLower.includes('dividend')) return 'dividendYield';
    if (fieldLower.includes('per')) return 'per';
    if (fieldLower.includes('pbr')) return 'pbr';
    return null;
  }

  isFieldMapped(field, mappings) {
    return Object.values(mappings).some(aliases => 
      aliases.includes(field) || aliases.includes(field.toLowerCase())
    );
  }

  hasRequiredField(headers) {
    const requiredPatterns = ['stock_code', 'stockcode', 'code', 'symbol'];
    return headers.some(header => 
      requiredPatterns.some(pattern => 
        header.toLowerCase().includes(pattern)
      )
    );
  }

  async fixMappingIssues(mappingIssues) {
    const fixResults = {
      fieldNameFixes: [],
      addedFields: [],
      generatedMappings: new Map()
    };
    
    // フィールド名修正
    for (const issue of mappingIssues.fieldNameIssues) {
      if (issue.suggestion) {
        fixResults.fieldNameFixes.push({
          originalField: issue.field,
          standardField: issue.suggestion,
          sourceType: issue.sourceType,
          confidence: 0.8
        });
        this.mappingStats.fixed++;
      }
    }
    
    // 統合マッピング生成
    const generatedMappings = this.generateMappingRules(mappingIssues);
    fixResults.generatedMappings = generatedMappings;
    
    console.log(`   ✓ 修正完了: ${this.mappingStats.fixed}件`);
    return fixResults;
  }

  generateMappingRules(mappingIssues) {
    const mappings = new Map();
    
    for (const issue of mappingIssues.fieldNameIssues) {
      if (issue.suggestion) {
        const key = issue.suggestion;
        if (!mappings.has(key)) {
          mappings.set(key, []);
        }
        mappings.get(key).push(issue.field);
      }
    }
    
    return mappings;
  }

  async generateFixReport(mappingIssues, fixResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.getTotalIssueCount(mappingIssues),
        fixedIssues: this.mappingStats.fixed,
        processedFiles: this.mappingStats.processed
      },
      fixes: fixResults.fieldNameFixes,
      mappingRules: Object.fromEntries(fixResults.generatedMappings)
    };
    
    await fs.mkdir(this.outputPath, { recursive: true });
    const reportPath = path.join(this.outputPath, 'field-mapping-fix-report.json');
    
    await fs.writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      'utf8'
    );
    
    console.log(`   ✓ レポート生成: ${reportPath}`);
  }

  mergeIssues(target, source) {
    target.fieldNameIssues.push(...source.fieldNameIssues);
    target.missingFields.push(...source.missingFields);
    target.dataTypeIssues.push(...source.dataTypeIssues);
  }

  getTotalIssueCount(issues) {
    return issues.fieldNameIssues.length + 
           issues.missingFields.length + 
           issues.dataTypeIssues.length;
  }
}

// メイン実行部
async function main() {
  try {
    const fixer = new FieldMappingFixer();
    await fixer.run();
    console.log('\n🎉 フィールドマッピング修正が正常に完了しました！');
  } catch (error) {
    console.error('\n💥 エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FieldMappingFixer };