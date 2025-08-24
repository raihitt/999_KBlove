/**
 * MetaEgg システム - Yahoo Finance スクレイパー
 * 
 * リアルタイム株価データと財務指標の取得
 * - 株価、時価総額、出来高データ
 * - PER、PBR、配当利回り等の財務指標
 * - レート制限とエラーハンドリング
 * - データキャッシュと品質保証
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { BaseUnifiedFetcher } from '../unified/UnifiedFetcher.js';
import type { FetchOptions, FetcherCapabilities } from '../../schema/types.js';

export class YahooFinanceFetcher extends BaseUnifiedFetcher {
  public readonly name = 'yahoo-finance';
  private client: AxiosInstance;
  private lastRequest: number = 0;
  private readonly rateLimitDelay = 2000; // 2秒間隔
  private readonly cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private historicalDataCache = new Map<string, number[]>();

  constructor() {
    super();
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
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
        case 'price':
          result = await this.fetchPrice(code) as T;
          break;
        case 'marketCap':
          result = await this.fetchMarketCap(code) as T;
          break;
        case 'volume':
          result = await this.fetchVolume(code) as T;
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
        case 'name':
          result = await this.fetchCompanyName(code) as T;
          break;
        case 'industry':
          result = await this.fetchIndustry(code) as T;
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
        'price', 'marketCap', 'volume', 'per', 'pbr', 
        'dividendYield', 'name', 'industry'
      ],
      rateLimits: {
        requestsPerSecond: 0.5,
        requestsPerMinute: 30,
        requestsPerHour: 1800
      },
      reliability: 0.85,
      dataQuality: 0.9
    };
  }

  /**
   * 株価取得
   */
  private async fetchPrice(code: string): Promise<number | undefined> {
    try {
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      // 複数のセレクターを試行
      const selectors = [
        'fin-streamer[data-symbol$=".T"][data-field="regularMarketPrice"]',
        'span[data-reactid*="price"]',
        '.Trsdu\\(0\\.3s\\).Fw\\(b\\).Fz\\(36px\\).Mb\\(-4px\\).D\\(ib\\)',
        '.livePrice span'
      ];

      for (const selector of selectors) {
        const priceText = $(selector).first().text().trim();
        if (priceText) {
          const price = this.parseNumber(priceText);
          if (price !== undefined && price > 0) {
            return price;
          }
        }
      }

      console.warn(`⚠️ 株価データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 株価取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 時価総額取得
   */
  private async fetchMarketCap(code: string): Promise<number | undefined> {
    try {
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      // 時価総額のセレクター
      const selectors = [
        'td[data-test="MARKET_CAP-value"]',
        'span:contains("時価総額")' 
      ];

      for (const selector of selectors) {
        const element = $(selector);
        let marketCapText = '';
        
        if (selector.includes('contains')) {
          marketCapText = element.next().text().trim();
        } else {
          marketCapText = element.text().trim();
        }

        if (marketCapText) {
          const marketCap = this.parseMarketCap(marketCapText);
          if (marketCap !== undefined && marketCap > 0) {
            return marketCap;
          }
        }
      }

      console.warn(`⚠️ 時価総額データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 時価総額取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 出来高取得
   */
  private async fetchVolume(code: string): Promise<number | undefined> {
    try {
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td[data-test="TD_VOLUME-value"]',
        'fin-streamer[data-field="regularMarketVolume"]'
      ];

      for (const selector of selectors) {
        const volumeText = $(selector).text().trim();
        if (volumeText) {
          const volume = this.parseNumber(volumeText);
          if (volume !== undefined && volume > 0) {
            return volume;
          }
        }
      }

      console.warn(`⚠️ 出来高データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 出来高取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * PER取得
   */
  private async fetchPER(code: string): Promise<number | undefined> {
    try {
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td[data-test="PE_RATIO-value"]',
        'span:contains("PER")' 
      ];

      for (const selector of selectors) {
        const element = $(selector);
        let perText = '';
        
        if (selector.includes('contains')) {
          perText = element.next().text().trim();
        } else {
          perText = element.text().trim();
        }

        if (perText && perText !== 'N/A' && perText !== '-') {
          const per = this.parseNumber(perText);
          if (per !== undefined && per > 0) {
            return per;
          }
        }
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
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td[data-test="BOOK_VALUE-value"]',
        'span:contains("PBR")'
      ];

      for (const selector of selectors) {
        const element = $(selector);
        let pbrText = '';
        
        if (selector.includes('contains')) {
          pbrText = element.next().text().trim();
        } else {
          pbrText = element.text().trim();
        }

        if (pbrText && pbrText !== 'N/A' && pbrText !== '-') {
          const pbr = this.parseNumber(pbrText);
          if (pbr !== undefined && pbr > 0) {
            return pbr;
          }
        }
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
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'td[data-test="DIVIDEND_AND_YIELD-value"]',
        'span:contains("配当利回り")'
      ];

      for (const selector of selectors) {
        const element = $(selector);
        let dividendText = '';
        
        if (selector.includes('contains')) {
          dividendText = element.next().text().trim();
        } else {
          dividendText = element.text().trim();
        }

        if (dividendText && dividendText !== 'N/A' && dividendText !== '-') {
          // "1.23 (2.45%)" のような形式から利回りを抽出
          const yieldMatch = dividendText.match(/\(([0-9.]+)%\)/);
          if (yieldMatch) {
            const yieldValue = parseFloat(yieldMatch[1]);
            if (!isNaN(yieldValue)) {
              return yieldValue;
            }
          }
        }
      }

      console.warn(`⚠️ 配当利回りデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 配当利回り取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 会社名取得
   */
  private async fetchCompanyName(code: string): Promise<string | undefined> {
    try {
      const url = `https://finance.yahoo.com/quote/${code}.T`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'h1[data-reactid*="title"]',
        '.D\\(ib\\).Fz\\(18px\\)',
        '.companyName'
      ];

      for (const selector of selectors) {
        const nameText = $(selector).first().text().trim();
        if (nameText && !nameText.includes('(') && nameText.length > 1) {
          return nameText;
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
   * 業種取得
   */
  private async fetchIndustry(code: string): Promise<string | undefined> {
    try {
      const url = `https://finance.yahoo.com/quote/${code}.T/profile`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'span:contains("Industry")',
        'span:contains("業種")'
      ];

      for (const selector of selectors) {
        const industryText = $(selector).next().text().trim();
        if (industryText && industryText.length > 1) {
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
   * ヘルスチェック用リクエスト
   */
  protected async performHealthCheckRequest(): Promise<boolean> {
    try {
      const response = await this.client.get('https://finance.yahoo.com', { timeout: 10000 });
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
      price: { type: 'number', range: [0.1, 1000000], required: true },
      marketCap: { type: 'number', range: [1000000, 100000000000000], required: false },
      volume: { type: 'number', range: [0, 1000000000], required: false },
      per: { type: 'number', range: [0.1, 1000], required: false },
      pbr: { type: 'number', range: [0.01, 100], required: false },
      dividendYield: { type: 'number', range: [0, 50], required: false },
      name: { type: 'string', pattern: /^.{1,100}$/, required: false },
      industry: { type: 'string', pattern: /^.{1,50}$/, required: false }
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
    
    // カンマ、通貨記号、パーセント記号を除去
    const cleanText = text.replace(/[,¥$€£%]/g, '').trim();
    
    // K, M, B, T suffixes
    let multiplier = 1;
    const suffixMatch = cleanText.match(/([0-9.]+)([KMBTG])/i);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1]);
      const suffix = suffixMatch[2].toUpperCase();
      
      switch (suffix) {
        case 'K': multiplier = 1000; break;
        case 'M': multiplier = 1000000; break;
        case 'B': multiplier = 1000000000; break;
        case 'T': multiplier = 1000000000000; break;
        case 'G': multiplier = 1000000000; break;
      }
      
      return num * multiplier;
    }
    
    const parsed = parseFloat(cleanText);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseMarketCap(text: string): number | undefined {
    if (!text) return undefined;
    
    // 兆、億、万の日本語単位対応
    const japaneseMatch = text.match(/([0-9,.]+)(兆|億|万)/);
    if (japaneseMatch) {
      const num = parseFloat(japaneseMatch[1].replace(/,/g, ''));
      const unit = japaneseMatch[2];
      
      let multiplier = 1;
      switch (unit) {
        case '万': multiplier = 10000; break;
        case '億': multiplier = 100000000; break;
        case '兆': multiplier = 1000000000000; break;
      }
      
      return num * multiplier;
    }
    
    return this.parseNumber(text);
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
    // フィールド別TTL設定（ミリ秒）
    const ttlMap: Record<string, number> = {
      price: 30 * 1000,          // 30秒
      volume: 60 * 1000,         // 1分
      marketCap: 5 * 60 * 1000,  // 5分
      per: 60 * 60 * 1000,       // 1時間
      pbr: 60 * 60 * 1000,       // 1時間
      dividendYield: 24 * 60 * 60 * 1000, // 24時間
      name: 7 * 24 * 60 * 60 * 1000,      // 7日
      industry: 7 * 24 * 60 * 60 * 1000   // 7日
    };
    
    return ttlMap[field] || 60 * 60 * 1000; // デフォルト1時間
  }

  private updateHistoricalData(field: string, code: string, value: number): void {
    const key = `${field}_${code}`;
    const history = this.historicalDataCache.get(key) || [];
    
    history.push(value);
    
    // 最新100件まで保持
    if (history.length > 100) {
      history.shift();
    }
    
    this.historicalDataCache.set(key, history);
  }
}