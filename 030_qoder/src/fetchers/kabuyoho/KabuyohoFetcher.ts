/**
 * MetaEgg システム - 株予報（Kabuyoho）スクレイパー
 * 
 * 株価予測データと投資分析情報の取得
 * - 株価予測と目標価格
 * - アナリスト評価とレーティング
 * - 投資判断とリスク分析
 * - マーケット動向と業界分析
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { BaseUnifiedFetcher } from '../unified/UnifiedFetcher.js';
import type { FetchOptions, FetcherCapabilities } from '../../schema/types.js';

export class KabuyohoFetcher extends BaseUnifiedFetcher {
  public readonly name = 'kabuyoho';
  private client: AxiosInstance;
  private lastRequest: number = 0;
  private readonly rateLimitDelay = 4000; // 4秒間隔（最も慎重）
  private readonly cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private historicalDataCache = new Map<string, number[]>();

  constructor() {
    super();
    
    this.client = axios.create({
      timeout: 60000, // 長めのタイムアウト
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
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
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
        console.error(`❌ 株予報 リクエスト失敗:`, error.message);
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
        case 'targetPrice':
          result = await this.fetchTargetPrice(code) as T;
          break;
        case 'rating':
          result = await this.fetchRating(code) as T;
          break;
        case 'recommendation':
          result = await this.fetchRecommendation(code) as T;
          break;
        case 'priceRange':
          result = await this.fetchPriceRange(code) as T;
          break;
        case 'marketSentiment':
          result = await this.fetchMarketSentiment(code) as T;
          break;
        case 'technicalAnalysis':
          result = await this.fetchTechnicalAnalysis(code) as T;
          break;
        case 'fundamentalScore':
          result = await this.fetchFundamentalScore(code) as T;
          break;
        case 'riskLevel':
          result = await this.fetchRiskLevel(code) as T;
          break;
        case 'price':
          result = await this.fetchCurrentPrice(code) as T;
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
        'targetPrice', 'rating', 'recommendation', 'priceRange', 
        'marketSentiment', 'technicalAnalysis', 'fundamentalScore', 
        'riskLevel', 'price', 'name', 'industry'
      ],
      rateLimits: {
        requestsPerSecond: 0.25,  // 4秒間隔
        requestsPerMinute: 15,
        requestsPerHour: 900
      },
      reliability: 0.75,
      dataQuality: 0.8
    };
  }

  /**
   * 目標価格取得
   */
  private async fetchTargetPrice(code: string): Promise<number | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.target-price .price',
        '.analyst-target .value',
        'span:contains("目標株価") + span',
        'td:contains("目標価格") + td'
      ];

      for (const selector of selectors) {
        const priceText = $(selector).text().trim();
        if (priceText) {
          const price = this.parsePrice(priceText);
          if (price !== undefined && price > 0) {
            return price;
          }
        }
      }

      console.warn(`⚠️ 目標価格データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 目標価格取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * レーティング取得
   */
  private async fetchRating(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.rating .value',
        '.analyst-rating',
        'span:contains("レーティング") + span',
        '.recommendation-text'
      ];

      for (const selector of selectors) {
        const ratingText = $(selector).text().trim();
        if (ratingText && this.isValidRating(ratingText)) {
          return this.normalizeRating(ratingText);
        }
      }

      console.warn(`⚠️ レーティングデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ レーティング取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 投資推奨取得
   */
  private async fetchRecommendation(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.recommendation .text',
        '.investment-advice',
        'span:contains("投資判断") + span',
        '.buy-sell-hold'
      ];

      for (const selector of selectors) {
        const recText = $(selector).text().trim();
        if (recText && this.isValidRecommendation(recText)) {
          return this.normalizeRecommendation(recText);
        }
      }

      console.warn(`⚠️ 投資推奨データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 投資推奨取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 価格レンジ取得
   */
  private async fetchPriceRange(code: string): Promise<{ min: number; max: number } | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.price-range',
        '.year-high-low',
        'span:contains("年初来高値") + span'
      ];

      for (const selector of selectors) {
        const rangeText = $(selector).text().trim();
        if (rangeText) {
          const range = this.parsePriceRange(rangeText);
          if (range) {
            return range;
          }
        }
      }

      // 個別に高値・安値を探す
      const highElement = $('span:contains("高値"), span:contains("年初来高値")').next();
      const lowElement = $('span:contains("安値"), span:contains("年初来安値")').next();
      
      if (highElement.length && lowElement.length) {
        const high = this.parsePrice(highElement.text().trim());
        const low = this.parsePrice(lowElement.text().trim());
        
        if (high !== undefined && low !== undefined && high > low) {
          return { min: low, max: high };
        }
      }

      console.warn(`⚠️ 価格レンジデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 価格レンジ取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * マーケットセンチメント取得
   */
  private async fetchMarketSentiment(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.market-sentiment',
        '.sentiment-indicator',
        'span:contains("市場心理") + span'
      ];

      for (const selector of selectors) {
        const sentimentText = $(selector).text().trim();
        if (sentimentText && this.isValidSentiment(sentimentText)) {
          return this.normalizeSentiment(sentimentText);
        }
      }

      console.warn(`⚠️ マーケットセンチメントデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ マーケットセンチメント取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * テクニカル分析取得
   */
  private async fetchTechnicalAnalysis(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.technical-analysis',
        '.chart-analysis',
        'span:contains("テクニカル") + span'
      ];

      for (const selector of selectors) {
        const analysisText = $(selector).text().trim();
        if (analysisText && analysisText.length > 5) {
          return analysisText;
        }
      }

      console.warn(`⚠️ テクニカル分析データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ テクニカル分析取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * ファンダメンタルスコア取得
   */
  private async fetchFundamentalScore(code: string): Promise<number | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.fundamental-score .score',
        '.financial-strength',
        'span:contains("スコア") + span'
      ];

      for (const selector of selectors) {
        const scoreText = $(selector).text().trim();
        if (scoreText) {
          const score = this.parseScore(scoreText);
          if (score !== undefined && score >= 0 && score <= 100) {
            return score;
          }
        }
      }

      console.warn(`⚠️ ファンダメンタルスコアデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ ファンダメンタルスコア取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * リスクレベル取得
   */
  private async fetchRiskLevel(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.risk-level',
        '.volatility-indicator',
        'span:contains("リスク") + span'
      ];

      for (const selector of selectors) {
        const riskText = $(selector).text().trim();
        if (riskText && this.isValidRiskLevel(riskText)) {
          return this.normalizeRiskLevel(riskText);
        }
      }

      console.warn(`⚠️ リスクレベルデータが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ リスクレベル取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 現在株価取得
   */
  private async fetchCurrentPrice(code: string): Promise<number | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.current-price .price',
        '.stock-price .value',
        '.price-display'
      ];

      for (const selector of selectors) {
        const priceText = $(selector).text().trim();
        if (priceText) {
          const price = this.parsePrice(priceText);
          if (price !== undefined && price > 0) {
            return price;
          }
        }
      }

      console.warn(`⚠️ 現在株価データが見つかりません: ${code}`);
      return undefined;

    } catch (error) {
      console.error(`❌ 現在株価取得失敗: ${code}`, error);
      return undefined;
    }
  }

  /**
   * 会社名取得
   */
  private async fetchCompanyName(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        'h1',
        '.company-name',
        '.stock-title',
        'title'
      ];

      for (const selector of selectors) {
        const nameText = $(selector).text().trim();
        if (nameText && nameText.length > 1 && !nameText.includes('株予報')) {
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
   * 業種取得
   */
  private async fetchIndustry(code: string): Promise<string | undefined> {
    try {
      const url = `https://kabuyoho.jp/stock/${code}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const selectors = [
        '.industry-name',
        'span:contains("業種") + span',
        '.sector-info'
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
   * ヘルスチェック用リクエスト
   */
  protected async performHealthCheckRequest(): Promise<boolean> {
    try {
      const response = await this.client.get('https://kabuyoho.jp', { timeout: 20000 });
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
      targetPrice: { type: 'number', range: [1, 1000000], required: false },
      rating: { type: 'string', pattern: /^(強い買い|買い|やや買い|中立|やや売り|売り|強い売り)$/, required: false },
      recommendation: { type: 'string', pattern: /^(BUY|HOLD|SELL)$/, required: false },
      fundamentalScore: { type: 'number', range: [0, 100], required: false },
      riskLevel: { type: 'string', pattern: /^(低|中|高)$/, required: false },
      price: { type: 'number', range: [1, 1000000], required: false },
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
    return value; // 株予報データは基本的にそのまま使用
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

  private parsePrice(text: string): number | undefined {
    if (!text) return undefined;
    
    const cleanText = text.replace(/[,¥$€£円]/g, '').trim();
    const parsed = parseFloat(cleanText);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseScore(text: string): number | undefined {
    if (!text) return undefined;
    
    const cleanText = text.replace(/[点%]/g, '').trim();
    const parsed = parseFloat(cleanText);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parsePriceRange(text: string): { min: number; max: number } | undefined {
    if (!text) return undefined;
    
    const rangeMatch = text.match(/([0-9,]+)\s*[-~]\s*([0-9,]+)/);
    if (rangeMatch) {
      const min = this.parsePrice(rangeMatch[1]);
      const max = this.parsePrice(rangeMatch[2]);
      
      if (min !== undefined && max !== undefined && max > min) {
        return { min, max };
      }
    }
    
    return undefined;
  }

  private isValidRating(text: string): boolean {
    const validRatings = ['強い買い', '買い', 'やや買い', '中立', 'やや売り', '売り', '強い売り'];
    return validRatings.some(rating => text.includes(rating));
  }

  private normalizeRating(text: string): string {
    if (text.includes('強い買い')) return '強い買い';
    if (text.includes('買い')) return '買い';
    if (text.includes('やや買い')) return 'やや買い';
    if (text.includes('中立')) return '中立';
    if (text.includes('やや売り')) return 'やや売り';
    if (text.includes('売り')) return '売り';
    if (text.includes('強い売り')) return '強い売り';
    return text;
  }

  private isValidRecommendation(text: string): boolean {
    const keywords = ['買い', '売り', 'ホールド', 'BUY', 'SELL', 'HOLD'];
    return keywords.some(keyword => text.toUpperCase().includes(keyword.toUpperCase()));
  }

  private normalizeRecommendation(text: string): string {
    const upperText = text.toUpperCase();
    if (upperText.includes('BUY') || upperText.includes('買い')) return 'BUY';
    if (upperText.includes('SELL') || upperText.includes('売り')) return 'SELL';
    if (upperText.includes('HOLD') || upperText.includes('ホールド')) return 'HOLD';
    return text;
  }

  private isValidSentiment(text: string): boolean {
    const sentiments = ['強気', '弱気', '中立', 'ポジティブ', 'ネガティブ'];
    return sentiments.some(sentiment => text.includes(sentiment));
  }

  private normalizeSentiment(text: string): string {
    if (text.includes('強気') || text.includes('ポジティブ')) return 'ポジティブ';
    if (text.includes('弱気') || text.includes('ネガティブ')) return 'ネガティブ';
    if (text.includes('中立')) return '中立';
    return text;
  }

  private isValidRiskLevel(text: string): boolean {
    const levels = ['低', '中', '高', 'リスク小', 'リスク大'];
    return levels.some(level => text.includes(level));
  }

  private normalizeRiskLevel(text: string): string {
    if (text.includes('低') || text.includes('リスク小')) return '低';
    if (text.includes('高') || text.includes('リスク大')) return '高';
    if (text.includes('中')) return '中';
    return text;
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
      targetPrice: 4 * 60 * 60 * 1000,          // 4時間
      rating: 8 * 60 * 60 * 1000,               // 8時間
      recommendation: 8 * 60 * 60 * 1000,       // 8時間
      priceRange: 24 * 60 * 60 * 1000,          // 24時間
      marketSentiment: 2 * 60 * 60 * 1000,      // 2時間
      technicalAnalysis: 2 * 60 * 60 * 1000,    // 2時間
      fundamentalScore: 12 * 60 * 60 * 1000,    // 12時間
      riskLevel: 12 * 60 * 60 * 1000,           // 12時間
      price: 30 * 60 * 1000,                    // 30分
      name: 7 * 24 * 60 * 60 * 1000,            // 7日
      industry: 7 * 24 * 60 * 60 * 1000         // 7日
    };
    
    return ttlMap[field] || 4 * 60 * 60 * 1000; // デフォルト4時間
  }

  private updateHistoricalData(field: string, code: string, value: number): void {
    const key = `${field}_${code}`;
    const history = this.historicalDataCache.get(key) || [];
    
    history.push(value);
    
    // 最新30件まで保持（少なめ）
    if (history.length > 30) {
      history.shift();
    }
    
    this.historicalDataCache.set(key, history);
  }
}