/**
 * MetaEgg システム - IRBANK スクレイパー
 * 
 * 企業の詳細財務データと分析情報の取得
 * - ROE、自己資本比率、営業利益率
 * - 企業分析と投資指標
 * - セクター別財務データ
 * - 安全性と収益性の指標
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { BaseUnifiedFetcher } from '../unified/UnifiedFetcher.js';
import type { FetchOptions, FetcherCapabilities } from '../../schema/types.js';

export class IRBankFetcher extends BaseUnifiedFetcher {
  public readonly name = 'irbank';
  private client: AxiosInstance;
  private lastRequest: number = 0;
  private readonly rateLimitDelay = 3000; // 3秒間隔（より慎重）
  private readonly cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private historicalDataCache = new Map<string, number[]>();

  constructor() {
    super();
    
    this.client = axios.create({
      timeout: 45000, // 長めのタイムアウト
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      response => {
        this.updateRequestStats(true);
        return response;
      },
      error => {
        this.updateRequestStats(false);
        console.error(`❌ IRBANK リクエスト失敗:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 単一フィールドデータ取得
   */
  async fetch<T>(field: string, code: string, options?: FetchOptions): Promise<T | undefined> {
    const mergedOptions = this.mergeOptions(options);
    const cacheKey = `${field}_${code}`;
    
    // キャッシュチェック
    if (mergedOptions.cache) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached) {
        console.log(`💾 キャッシュヒット: ${this.name} - ${field}(${code})`);
        return cached;
      }
    }

    // レート制限チェック
    await this.enforceRateLimit();

    try {
      console.log(`🌐 データ取得開始: ${this.name} - ${field}(${code})`);
      
      let result: T | undefined;

      switch (field) {
        case 'roe':
          result = await this.fetchROE(code) as T;
          break;
        case 'equityRatio':
          result = await this.fetchEquityRatio(code) as T;
          break;
        case 'operatingMargin':
          result = await this.fetchOperatingMargin(code) as T;
          break;
        case 'per':
          result = await this.fetchPER(code) as T;
          break;
        case 'pbr':
          result = await this.fetchPBR(code) as T;
          break;
        case 'dividendYield':
          result = await this.fetchDividendYield(code) as T;
          break;
        case 'industry':
          result = await this.fetchIndustry(code) as T;
          break;
        case 'sector':
          result = await this.fetchSector(code) as T;
          break;
        case 'name':
          result = await this.fetchCompanyName(code) as T;
          break;
        case 'debtRatio':
          result = await this.fetchDebtRatio(code) as T;
          break;
        case 'roa':
          result = await this.fetchROA(code) as T;
          break;
        default:
          console.warn(`⚠️ 未対応フィールド: ${field}`);
          return undefined;
      }

      // キャッシュ保存
      if (result !== undefined && mergedOptions.cache) {
        this.setCachedData(cacheKey, result, this.getTTL(field));
      }

      // 履歴データ更新
      if (typeof result === 'number') {
        this.updateHistoricalData(field, code, result);
      }

      console.log(`✅ データ取得完了: ${this.name} - ${field}(${code}) = ${result}`);
      return result;

    } catch (error) {
      console.error(`❌ データ取得失敗: ${this.name} - ${field}(${code})`, error);
      return undefined;
    }
  }

  /**
   * フェッチャー能力取得
   */
  getCapabilities(): FetcherCapabilities {
    return {
      supportedFields: [
        'roe', 'equityRatio', 'operatingMargin', 'per', 'pbr', 
        'dividendYield', 'industry', 'sector', 'name', 'debtRatio', 'roa'
      ],
      rateLimits: {
        requestsPerSecond: 0.33,  // 3秒間隔
        requestsPerMinute: 20,
        requestsPerHour: 1200
      },
      reliability: 0.8,
      dataQuality: 0.95
    };
  }

  /**
   * ROE取得
   */
  private async fetchROE(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      // ROE関連のセレクター
      const selectors = [
        'td:contains("ROE") + td',
        'td:contains("自己資本利益率") + td',
        'th:contains("ROE") + td',
        '.data-table td:contains("ROE") + td'
      ];

      for (const selector of selectors) {
        const roeText = $(selector).text().trim();
        if (roeText && roeText !== '-' && roeText !== 'N/A') {
          const roe = this.parsePercentage(roeText);
          if (roe !== undefined && roe >= -100 && roe <= 200) {
            return roe;
          }
        }
      }

      // テーブルからの検索
      const roeFromTable = this.findDataInTable($, ['ROE', '自己資本利益率']);
      if (roeFromTable !== undefined) {
        return roeFromTable;
      }

      console.warn(`⚠️ ROEデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ ROE取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 自己資本比率取得
   */
  private async fetchEquityRatio(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("自己資本比率") + td',
        'td:contains("株主資本比率") + td',
        'th:contains("自己資本比率") + td'
      ];

      for (const selector of selectors) {
        const ratioText = $(selector).text().trim();
        if (ratioText && ratioText !== '-' && ratioText !== 'N/A') {
          const ratio = this.parsePercentage(ratioText);
          if (ratio !== undefined && ratio >= 0 && ratio <= 100) {
            return ratio;
          }
        }
      }

      const ratioFromTable = this.findDataInTable($, ['自己資本比率', '株主資本比率']);
      if (ratioFromTable !== undefined) {
        return ratioFromTable;
      }

      console.warn(`⚠️ 自己資本比率データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 自己資本比率取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 営業利益率取得
   */
  private async fetchOperatingMargin(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("営業利益率") + td',
        'td:contains("営業利益") + td',
        'th:contains("営業利益率") + td'
      ];

      for (const selector of selectors) {
        const marginText = $(selector).text().trim();
        if (marginText && marginText !== '-' && marginText !== 'N/A') {
          const margin = this.parsePercentage(marginText);
          if (margin !== undefined && margin >= -50 && margin <= 100) {
            return margin;
          }
        }
      }

      const marginFromTable = this.findDataInTable($, ['営業利益率']);
      if (marginFromTable !== undefined) {
        return marginFromTable;
      }

      console.warn(`⚠️ 営業利益率データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 営業利益率取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * PER取得
   */
  private async fetchPER(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("PER") + td',
        'td:contains("株価収益率") + td',
        'th:contains("PER") + td'
      ];

      for (const selector of selectors) {
        const perText = $(selector).text().trim();
        if (perText && perText !== '-' && perText !== 'N/A') {
          const per = this.parseNumber(perText);
          if (per !== undefined && per > 0 && per < 1000) {
            return per;
          }
        }
      }

      const perFromTable = this.findDataInTable($, ['PER', '株価収益率']);
      if (perFromTable !== undefined) {
        return perFromTable;
      }

      console.warn(`⚠️ PERデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ PER取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * PBR取得
   */
  private async fetchPBR(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("PBR") + td',
        'td:contains("株価純資産倍率") + td',
        'th:contains("PBR") + td'
      ];

      for (const selector of selectors) {
        const pbrText = $(selector).text().trim();
        if (pbrText && pbrText !== '-' && pbrText !== 'N/A') {
          const pbr = this.parseNumber(pbrText);
          if (pbr !== undefined && pbr > 0 && pbr < 100) {
            return pbr;
          }
        }
      }

      const pbrFromTable = this.findDataInTable($, ['PBR', '株価純資産倍率']);
      if (pbrFromTable !== undefined) {
        return pbrFromTable;
      }

      console.warn(`⚠️ PBRデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ PBR取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 配当利回り取得
   */
  private async fetchDividendYield(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("配当利回り") + td',
        'td:contains("配当") + td',
        'th:contains("配当利回り") + td'
      ];

      for (const selector of selectors) {
        const yieldText = $(selector).text().trim();
        if (yieldText && yieldText !== '-' && yieldText !== 'N/A') {
          const yieldValue = this.parsePercentage(yieldText);
          if (yieldValue !== undefined && yieldValue >= 0 && yieldValue <= 50) {
            return yieldValue;
          }
        }
      }

      const yieldFromTable = this.findDataInTable($, ['配当利回り']);
      if (yieldFromTable !== undefined) {
        return yieldFromTable;
      }

      console.warn(`⚠️ 配当利回りデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 配当利回り取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 業種取得
   */
  private async fetchIndustry(code: string): Promise<string | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("業種") + td',
        'th:contains("業種") + td',
        '.company-info td:contains("業種") + td'
      ];

      for (const selector of selectors) {
        const industryText = $(selector).text().trim();
        if (industryText && industryText.length > 1 && industryText !== '-') {
          return industryText;
        }
      }

      console.warn(`⚠️ 業種データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 業種取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * セクター取得
   */
  private async fetchSector(code: string): Promise<string | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("セクター") + td',
        'td:contains("分類") + td',
        'th:contains("セクター") + td'
      ];

      for (const selector of selectors) {
        const sectorText = $(selector).text().trim();
        if (sectorText && sectorText.length > 1 && sectorText !== '-') {
          return sectorText;
        }
      }

      console.warn(`⚠️ セクターデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ セクター取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 会社名取得
   */
  private async fetchCompanyName(code: string): Promise<string | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'h1',
        '.company-name',
        'title',
        '.page-title'
      ];

      for (const selector of selectors) {
        const nameText = $(selector).text().trim();
        if (nameText && nameText.length > 1 && !nameText.includes('IRBANK')) {
          // 銘柄コードを除去
          const cleanName = nameText.replace(/\([0-9]+\)/g, '').trim();
          if (cleanName.length > 1) {
            return cleanName;
          }
        }
      }

      console.warn(`⚠️ 会社名データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 会社名取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 負債比率取得
   */
  private async fetchDebtRatio(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("負債比率") + td',
        'td:contains("負債") + td',
        'th:contains("負債比率") + td'
      ];

      for (const selector of selectors) {
        const ratioText = $(selector).text().trim();
        if (ratioText && ratioText !== '-' && ratioText !== 'N/A') {
          const ratio = this.parsePercentage(ratioText);
          if (ratio !== undefined && ratio >= 0 && ratio <= 1000) {
            return ratio;
          }
        }
      }

      const ratioFromTable = this.findDataInTable($, ['負債比率']);
      if (ratioFromTable !== undefined) {
        return ratioFromTable;
      }

      console.warn(`⚠️ 負債比率データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 負債比率取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * ROA取得
   */
  private async fetchROA(code: string): Promise<number | undefined> {
    try {
      const url = `https://irbank.net/E0${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td:contains("ROA") + td',
        'td:contains("総資産利益率") + td',
        'th:contains("ROA") + td'
      ];

      for (const selector of selectors) {
        const roaText = $(selector).text().trim();
        if (roaText && roaText !== '-' && roaText !== 'N/A') {
          const roa = this.parsePercentage(roaText);
          if (roa !== undefined && roa >= -50 && roa <= 100) {
            return roa;
          }
        }
      }

      const roaFromTable = this.findDataInTable($, ['ROA', '総資産利益率']);
      if (roaFromTable !== undefined) {
        return roaFromTable;
      }

      console.warn(`⚠️ ROAデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ ROA取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * ヘルスチェック用リクエスト
   */
  protected async performHealthCheckRequest(): Promise<boolean> {
    try {
      const response = await this.client.get('https://irbank.net', { timeout: 15000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * バリデーションルール取得
   */
  protected getValidationRules(): Record<string, any> {
    return {
      roe: { type: 'number', range: [-100, 200], required: false },
      equityRatio: { type: 'number', range: [0, 100], required: false },
      operatingMargin: { type: 'number', range: [-50, 100], required: false },
      per: { type: 'number', range: [0.1, 1000], required: false },
      pbr: { type: 'number', range: [0.01, 100], required: false },
      dividendYield: { type: 'number', range: [0, 50], required: false },
      industry: { type: 'string', pattern: /^.{1,50}$/, required: false },
      sector: { type: 'string', pattern: /^.{1,50}$/, required: false },
      name: { type: 'string', pattern: /^.{1,100}$/, required: false },
      debtRatio: { type: 'number', range: [0, 1000], required: false },
      roa: { type: 'number', range: [-50, 100], required: false }
    };
  }

  /**
   * 履歴データ取得
   */
  protected getHistoricalData(field: string, code: string): number[] {
    const key = `${field}_${code}`;
    return this.historicalDataCache.get(key) || [];
  }

  /**
   * 推奨値取得
   */
  protected getSuggestedValue(field: string, value: any, issues: string[]): any {
    const rules = this.getValidationRules()[field];
    
    if (!rules) return value;
    
    // 数値の範囲外修正
    if (typeof value === 'number' && rules.range) {
      const [min, max] = rules.range;
      if (value < min) return min;
      if (value > max) return max;
    }

    return value;
  }

  /**
   * プライベートヘルパーメソッド
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏰ レート制限待機: ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }

  private parseNumber(text: string): number | undefined {
    if (!text) return undefined;
    
    const cleanText = text.replace(/[,¥$€£]/g, '').trim();
    const parsed = parseFloat(cleanText);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parsePercentage(text: string): number | undefined {
    if (!text) return undefined;
    
    const cleanText = text.replace(/[,¥$€£%]/g, '').trim();
    const parsed = parseFloat(cleanText);
    return isNaN(parsed) ? undefined : parsed;
  }

  private findDataInTable($: cheerio.CheerioAPI, keywords: string[]): number | undefined {
    for (const keyword of keywords) {
      $('table tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        
        cells.each((index, cell) => {
          const cellText = $(cell).text().trim();
          if (cellText.includes(keyword)) {
            const nextCell = cells.eq(index + 1);
            if (nextCell.length > 0) {
              const valueText = nextCell.text().trim();
              if (valueText && valueText !== '-' && valueText !== 'N/A') {
                const value = keyword.includes('%') || keyword.includes('率') || keyword.includes('利回り') ?
                  this.parsePercentage(valueText) : this.parseNumber(valueText);
                if (value !== undefined) {
                  return value;
                }
              }
            }
          }
        });
      });
    }
    
    return undefined;
  }

  private getCachedData<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.data as T;
  }

  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getTTL(field: string): number {
    const ttlMap: Record<string, number> = {
      roe: 6 * 60 * 60 * 1000,              // 6時間
      equityRatio: 6 * 60 * 60 * 1000,      // 6時間
      operatingMargin: 6 * 60 * 60 * 1000,  // 6時間
      per: 2 * 60 * 60 * 1000,              // 2時間
      pbr: 2 * 60 * 60 * 1000,              // 2時間
      dividendYield: 24 * 60 * 60 * 1000,   // 24時間
      industry: 7 * 24 * 60 * 60 * 1000,    // 7日
      sector: 7 * 24 * 60 * 60 * 1000,      // 7日
      name: 7 * 24 * 60 * 60 * 1000,        // 7日
      debtRatio: 6 * 60 * 60 * 1000,        // 6時間
      roa: 6 * 60 * 60 * 1000               // 6時間
    };
    
    return ttlMap[field] || 2 * 60 * 60 * 1000; // デフォルト2時間
  }

  private updateHistoricalData(field: string, code: string, value: number): void {
    const key = `${field}_${code}`;
    const history = this.historicalDataCache.get(key) || [];
    
    history.push(value);
    
    // 最新50件まで保持
    if (history.length > 50) {
      history.shift();
    }
    
    this.historicalDataCache.set(key, history);
  }
}