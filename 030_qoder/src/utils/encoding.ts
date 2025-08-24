/**
 * MetaEgg システム - 文字エンコーディング自動検出・変換ユーティリティ
 * 
 * Shift-JIS → UTF-8の確実な変換を実現する高精度エンコーディング処理
 * - バイトパターン解析による高精度検出
 * - バックアップとロールバック機能
 * - 変換ログと検証機能
 */

import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import * as iconv from 'iconv-lite';
import * as path from 'path';

export interface EncodingDetectionResult {
  encoding: string;
  confidence: number;
  method: 'bom' | 'pattern' | 'heuristic' | 'fallback';
  details: {
    bomDetected?: string;
    patternMatches: number;
    sampleSize: number;
    validUtf8: boolean;
  };
}

export interface ConversionResult {
  success: boolean;
  sourceEncoding: string;
  targetEncoding: string;
  originalSize: number;
  convertedSize: number;
  backupPath?: string;
  validationPassed: boolean;
  errorMessage?: string;
}

export class EncodingDetector {
  private static readonly BOM_PATTERNS = {
    'utf8': Buffer.from([0xEF, 0xBB, 0xBF]),
    'utf16le': Buffer.from([0xFF, 0xFE]),
    'utf16be': Buffer.from([0xFE, 0xFF]),
    'utf32le': Buffer.from([0xFF, 0xFE, 0x00, 0x00]),
    'utf32be': Buffer.from([0x00, 0x00, 0xFE, 0xFF])
  };

  private static readonly SHIFT_JIS_PATTERNS = [
    // ひらがな範囲
    { start: 0x82A0, end: 0x82F1 },
    // カタカナ範囲
    { start: 0x8340, end: 0x8396 },
    // 第一水準漢字
    { start: 0x889F, end: 0x9872 },
    // 第二水準漢字
    { start: 0x989F, end: 0xEAA4 }
  ];

  /**
   * ファイルの文字エンコーディングを自動検出
   */
  static async detectFileEncoding(filePath: string, sampleSize: number = 8192): Promise<EncodingDetectionResult> {
    try {
      const buffer = await fs.readFile(filePath, { flag: 'r' });
      const sample = buffer.subarray(0, Math.min(sampleSize, buffer.length));
      
      return this.detectEncoding(sample);
    } catch (error) {
      console.error(`❌ ファイル読み取り失敗: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * バッファの文字エンコーディングを検出
   */
  static detectEncoding(buffer: Buffer): EncodingDetectionResult {
    console.log(`🔍 エンコーディング検出開始: サンプルサイズ ${buffer.length} bytes`);

    // 1. BOM検出
    const bomResult = this.detectBOM(buffer);
    if (bomResult.encoding !== 'unknown') {
      console.log(`✅ BOM検出成功: ${bomResult.encoding}`);
      return {
        encoding: bomResult.encoding,
        confidence: 0.99,
        method: 'bom',
        details: {
          bomDetected: bomResult.encoding,
          patternMatches: 0,
          sampleSize: buffer.length,
          validUtf8: false
        }
      };
    }

    // 2. UTF-8検証
    const utf8Result = this.validateUtf8(buffer);
    if (utf8Result.isValid) {
      console.log(`✅ UTF-8検証成功: 信頼度 ${utf8Result.confidence}`);
      return {
        encoding: 'utf8',
        confidence: utf8Result.confidence,
        method: 'pattern',
        details: {
          patternMatches: utf8Result.validSequences,
          sampleSize: buffer.length,
          validUtf8: true
        }
      };
    }

    // 3. Shift-JIS検出
    const shiftJisResult = this.detectShiftJIS(buffer);
    if (shiftJisResult.confidence > 0.6) {
      console.log(`✅ Shift-JIS検出成功: 信頼度 ${shiftJisResult.confidence}`);
      return {
        encoding: 'shiftjis',
        confidence: shiftJisResult.confidence,
        method: 'heuristic',
        details: {
          patternMatches: shiftJisResult.patternMatches,
          sampleSize: buffer.length,
          validUtf8: false
        }
      };
    }

    // 4. フォールバック
    console.log(`⚠️ エンコーディング検出失敗、Shift-JISをフォールバック使用`);
    return {
      encoding: 'shiftjis',
      confidence: 0.3,
      method: 'fallback',
      details: {
        patternMatches: shiftJisResult.patternMatches,
        sampleSize: buffer.length,
        validUtf8: false
      }
    };
  }

  /**
   * BOM検出
   */
  private static detectBOM(buffer: Buffer): { encoding: string; length: number } {
    for (const [encoding, bom] of Object.entries(this.BOM_PATTERNS)) {
      if (buffer.subarray(0, bom.length).equals(bom)) {
        return { encoding, length: bom.length };
      }
    }
    return { encoding: 'unknown', length: 0 };
  }

  /**
   * UTF-8検証
   */
  private static validateUtf8(buffer: Buffer): { isValid: boolean; confidence: number; validSequences: number } {
    let validSequences = 0;
    let totalSequences = 0;
    
    try {
      // Node.jsのバリデーション
      const decoded = buffer.toString('utf8');
      
      // 文字単位での検証
      for (let i = 0; i < buffer.length; ) {
        const byte = buffer[i];
        totalSequences++;
        
        if (byte < 0x80) {
          // ASCII文字
          validSequences++;
          i++;
        } else if ((byte & 0xE0) === 0xC0) {
          // 2バイト文字
          if (i + 1 < buffer.length && (buffer[i + 1] & 0xC0) === 0x80) {
            validSequences++;
          }
          i += 2;
        } else if ((byte & 0xF0) === 0xE0) {
          // 3バイト文字
          if (i + 2 < buffer.length && 
              (buffer[i + 1] & 0xC0) === 0x80 && 
              (buffer[i + 2] & 0xC0) === 0x80) {
            validSequences++;
          }
          i += 3;
        } else if ((byte & 0xF8) === 0xF0) {
          // 4バイト文字
          if (i + 3 < buffer.length && 
              (buffer[i + 1] & 0xC0) === 0x80 && 
              (buffer[i + 2] & 0xC0) === 0x80 && 
              (buffer[i + 3] & 0xC0) === 0x80) {
            validSequences++;
          }
          i += 4;
        } else {
          i++;
        }
      }
      
      const confidence = totalSequences > 0 ? validSequences / totalSequences : 0;
      return { 
        isValid: confidence > 0.9, 
        confidence, 
        validSequences 
      };
      
    } catch (error) {
      return { isValid: false, confidence: 0, validSequences: 0 };
    }
  }

  /**
   * Shift-JIS検出ヒューリスティック
   */
  private static detectShiftJIS(buffer: Buffer): { confidence: number; patternMatches: number } {
    let patternMatches = 0;
    let totalBytes = 0;
    
    for (let i = 0; i < buffer.length - 1; i++) {
      const byte1 = buffer[i];
      const byte2 = buffer[i + 1];
      const word = (byte1 << 8) | byte2;
      
      totalBytes++;
      
      // Shift-JISパターンマッチング
      for (const pattern of this.SHIFT_JIS_PATTERNS) {
        if (word >= pattern.start && word <= pattern.end) {
          patternMatches++;
          break;
        }
      }
      
      // 追加的なShift-JISパターン
      if (this.isShiftJISByte(byte1) && this.isShiftJISByte(byte2)) {
        patternMatches += 0.5;
      }
    }
    
    const confidence = totalBytes > 0 ? Math.min(patternMatches / totalBytes * 4, 1.0) : 0;
    return { confidence, patternMatches: Math.floor(patternMatches) };
  }

  /**
   * Shift-JISバイト判定
   */
  private static isShiftJISByte(byte: number): boolean {
    return (byte >= 0x81 && byte <= 0x9F) || 
           (byte >= 0xE0 && byte <= 0xFC) ||
           (byte >= 0x40 && byte <= 0x7E) ||
           (byte >= 0x80 && byte <= 0xFC);
  }
}

export class EncodingConverter {
  private static readonly BACKUP_SUFFIX = '.backup';
  
  /**
   * ファイルの文字エンコーディングを変換
   */
  static async convertFileEncoding(
    sourcePath: string,
    targetPath: string,
    sourceEncoding: string,
    targetEncoding: string = 'utf8',
    createBackup: boolean = true
  ): Promise<ConversionResult> {
    
    console.log(`🔄 エンコーディング変換開始: ${sourcePath} (${sourceEncoding} → ${targetEncoding})`);
    
    let backupPath: string | undefined;
    
    try {
      // 元ファイルサイズ取得
      const stats = await fs.stat(sourcePath);
      const originalSize = stats.size;
      
      // バックアップ作成
      if (createBackup) {
        backupPath = sourcePath + this.BACKUP_SUFFIX;
        await fs.copyFile(sourcePath, backupPath);
        console.log(`💾 バックアップ作成: ${backupPath}`);
      }
      
      // ストリーミング変換
      const readStream = createReadStream(sourcePath);
      const writeStream = createWriteStream(targetPath);
      
      const converter = new Transform({
        transform(chunk, encoding, callback) {
          try {
            // ソースエンコーディングからデコード
            const decoded = iconv.decode(chunk, sourceEncoding);
            // ターゲットエンコーディングにエンコード
            const encoded = iconv.encode(decoded, targetEncoding);
            callback(null, encoded);
          } catch (error) {
            callback(error);
          }
        }
      });
      
      await pipeline(readStream, converter, writeStream);
      
      // 変換後ファイルサイズ取得
      const convertedStats = await fs.stat(targetPath);
      const convertedSize = convertedStats.size;
      
      // 変換結果の検証
      const validationResult = await this.validateConversion(targetPath, targetEncoding);
      
      console.log(`✅ エンコーディング変換完了:`);
      console.log(`   - 変換前サイズ: ${originalSize} bytes`);
      console.log(`   - 変換後サイズ: ${convertedSize} bytes`);
      console.log(`   - 検証結果: ${validationResult ? '成功' : '失敗'}`);
      
      return {
        success: true,
        sourceEncoding,
        targetEncoding,
        originalSize,
        convertedSize,
        backupPath,
        validationPassed: validationResult
      };
      
    } catch (error) {
      console.error(`❌ エンコーディング変換失敗: ${sourcePath}`, error);
      
      // エラー時のロールバック
      if (backupPath && createBackup) {
        try {
          await fs.copyFile(backupPath, sourcePath);
          console.log(`🔄 ロールバック完了: ${sourcePath}`);
        } catch (rollbackError) {
          console.error(`❌ ロールバック失敗:`, rollbackError);
        }
      }
      
      return {
        success: false,
        sourceEncoding,
        targetEncoding,
        originalSize: 0,
        convertedSize: 0,
        backupPath,
        validationPassed: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 一括ファイル変換
   */
  static async convertMultipleFiles(
    filePaths: string[],
    targetEncoding: string = 'utf8',
    createBackup: boolean = true
  ): Promise<ConversionResult[]> {
    
    console.log(`🚀 一括エンコーディング変換開始: ${filePaths.length}ファイル`);
    
    const results: ConversionResult[] = [];
    
    for (const filePath of filePaths) {
      try {
        // エンコーディング自動検出
        const detection = await EncodingDetector.detectFileEncoding(filePath);
        
        if (detection.encoding === targetEncoding) {
          console.log(`⏭️ スキップ（既に${targetEncoding}）: ${filePath}`);
          results.push({
            success: true,
            sourceEncoding: detection.encoding,
            targetEncoding,
            originalSize: 0,
            convertedSize: 0,
            validationPassed: true
          });
          continue;
        }
        
        // 変換実行
        const result = await this.convertFileEncoding(
          filePath,
          filePath, // 上書き変換
          detection.encoding,
          targetEncoding,
          createBackup
        );
        
        results.push(result);
        
      } catch (error) {
        console.error(`❌ ファイル変換失敗: ${filePath}`, error);
        results.push({
          success: false,
          sourceEncoding: 'unknown',
          targetEncoding,
          originalSize: 0,
          convertedSize: 0,
          validationPassed: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 一括変換完了: ${successCount}/${filePaths.length}ファイル成功`);
    
    return results;
  }
  
  /**
   * 変換結果の検証
   */
  private static async validateConversion(filePath: string, encoding: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      
      if (encoding === 'utf8') {
        // UTF-8検証
        const validation = EncodingDetector.detectEncoding(buffer);
        return validation.encoding === 'utf8' && validation.confidence > 0.8;
      }
      
      // その他のエンコーディング検証
      try {
        iconv.decode(buffer, encoding);
        return true;
      } catch {
        return false;
      }
      
    } catch (error) {
      console.error(`❌ 変換検証失敗: ${filePath}`, error);
      return false;
    }
  }
  
  /**
   * バックアップファイルのクリーンアップ
   */
  static async cleanupBackups(directoryPath: string): Promise<void> {
    try {
      const files = await fs.readdir(directoryPath);
      const backupFiles = files.filter(file => file.endsWith(this.BACKUP_SUFFIX));
      
      for (const backupFile of backupFiles) {
        const backupPath = path.join(directoryPath, backupFile);
        await fs.unlink(backupPath);
        console.log(`🗑️ バックアップ削除: ${backupPath}`);
      }
      
      console.log(`✅ バックアップクリーンアップ完了: ${backupFiles.length}ファイル削除`);
      
    } catch (error) {
      console.error(`❌ バックアップクリーンアップ失敗:`, error);
    }
  }
}