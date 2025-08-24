/**
 * MetaEgg システム効率化最適化 - 基本型定義
 * 
 * 並列処理、インテリジェントキャッシュ、スマートパイプライン最適化のための
 * 型安全なインターフェース定義
 */

export interface StockData {
  code: string;
  name?: string;
  companyName?: string;
  industry?: string;
  sector?: string;
  price?: number;
  dividendYield?: number;
  per?: number;
  pbr?: number;
  roe?: number;
  equityRatio?: number;
  operatingMargin?: number;
  marketCap?: number;
  volume?: number;
  
  // メタデータ
  source?: string;
  enrichedAt?: Date;
  enrichFields?: string[];
  quality?: number;
  confidence?: number;
}

export interface UnifiedStockData extends StockData {
  unified_id: string;
  priority_score: number;
  data_sources: string[];
  scraping_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_scraped_at?: Date;
  metadata: {
    sources: string[];
    schemaVersion: string;
    generatedAt: Date;
    enrichedAt?: Date;
    enrichFields?: string[];
  };
}

// ===== 効率化最適化コンポーネント型定義 =====

/**
 * 並列CSV処理システム（QoderCSVOptimizer）
 */
export interface OptimizedCSVProcessor {
  processInParallel(files: string[]): Promise<ProcessedData[]>;
  streamProcessing(largeFile: string): AsyncGenerator<DataChunk>;
  memoryOptimizedParsing(file: string): Promise<ParsedData>;
  calculateOptimalBatchSize(): number;
  chunkArray<T>(array: T[], size: number): T[][];
}

export interface ProcessedData {
  data: StockData[];
  metadata: {
    fileName: string;
    encoding: string;
    rowCount: number;
    processingTime: number;
    quality: number;
  };
}

export interface DataChunk {
  data: StockData[];
  chunkIndex: number;
  totalChunks: number;
  isLast: boolean;
}

export interface ParsedData {
  data: StockData[];
  encoding: string;
  headers: string[];
  rowCount: number;
}

/**
 * インテリジェント・キャッシュシステム（QoderCacheOptimizer）
 */
export interface AdaptiveCacheSystem {
  // データの性質に基づく動的TTL調整
  calculateOptimalTTL(dataType: DataType, updateFrequency: number): number;
  
  // 予測キャッシング
  predictiveCache(accessPatterns: AccessPattern[]): void;
  
  // 階層化キャッシュ
  hierarchicalCache: {
    L1: MemoryCache;     // 超高速アクセス用
    L2: FileCache;       // 中間キャッシュ
    L3: DatabaseCache;   // 永続化キャッシュ
  };
  
  // アクセスパターン学習による予測キャッシング
  optimizeBasedOnUsage(accessLog: AccessLog[]): Promise<void>;
}

export interface DataType {
  category: 'realtime' | 'daily' | 'static';
  field: string;
  updateFrequency: number; // seconds
  volatility: 'low' | 'medium' | 'high';
}

export interface AccessPattern {
  stockCode: string;
  fields: string[];
  frequency: number;
  lastAccessed: Date;
  predictedNextAccess?: Date;
}

export interface AccessLog {
  stockCode: string;
  field: string;
  timestamp: Date;
  hitType: 'L1' | 'L2' | 'L3' | 'MISS';
  responseTime: number;
}

export interface MemoryCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}

export interface FileCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface DatabaseCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  query(pattern: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * スマート・データパイプライン（QoderPipelineOptimizer）
 */
export interface SmartPipeline {
  stages: PipelineStage[];
  executeInParallel(data: InputData[]): Promise<ProcessedData[]>;
  faultTolerant: boolean;
  resourceOptimized: boolean;
  calculateOptimalBatchSize(): number;
  consolidateResults(results: PromiseSettledResult<any>[]): Promise<any>;
}

export interface PipelineStage {
  name: string;
  process(data: any): Promise<any>;
  canRunInParallel: boolean;
  resourceRequirements: ResourceRequirements;
  dependencies?: string[];
}

export interface ResourceRequirements {
  memory: number; // MB
  cpu: number;    // cores
  io: 'low' | 'medium' | 'high';
  network: boolean;
}

export interface InputData {
  stockCode: string;
  rawData: any;
  priority: number;
  batchId?: string;
}

/**
 * インテリジェント・エラーハンドリング（QoderErrorOptimizer）
 */
export interface SmartErrorHandler {
  classifyError(error: Error): ErrorType;
  calculateRetryStrategy(errorType: ErrorType, attempt: number): RetryStrategy;
  fallbackMechanism(failedOperation: Operation): Promise<FallbackResult>;
  executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceName: string
  ): Promise<T | null>;
}

export interface ErrorType {
  category: 'RATE_LIMIT' | 'NETWORK_ERROR' | 'DATA_ERROR' | 'SYSTEM_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context?: Record<string, any>;
}

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  fallback?: string;
}

export interface Operation {
  name: string;
  type: 'fetch' | 'process' | 'cache' | 'validate';
  target: string;
  params: Record<string, any>;
}

export interface FallbackResult {
  success: boolean;
  data?: any;
  source: 'cache' | 'alternative' | 'default';
  confidence: number;
}

export interface CircuitBreaker {
  isOpen(): boolean;
  isHalfOpen(): boolean;
  isClosed(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
  getState(): CircuitBreakerState;
}

export interface CircuitBreakerState {
  state: 'OPEN' | 'HALF_OPEN' | 'CLOSED';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

// ===== 統合フェッチャーアーキテクチャ =====

export interface UnifiedFetcher {
  name: string;
  fetch<T>(field: string, code: string, options?: FetchOptions): Promise<T | undefined>;
  fetchBatch(fields: string[], code: string, options?: FetchOptions): Promise<Record<string, any>>;
  getCapabilities(): FetcherCapabilities;
  getHealthStatus(): HealthStatus;
  healthCheck(): Promise<boolean>;
  validate(field: string, value: any): ValidationResult;
  detectAnomaly(field: string, value: number, code: string): AnomalyResult;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  priority?: 'low' | 'medium' | 'high';
  context?: Record<string, any>;
}

export interface FetcherCapabilities {
  supportedFields: string[];
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  reliability: number; // 0-1
  dataQuality: number; // 0-1
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues?: string[];
  suggestedValue?: any;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  expectedRange?: [number, number];
  explanation?: string;
}

// ===== 三軸評価システム =====

export interface EvaluationCriteria {
  dividendYield: { min: number; max: number; weight: number };
  equityRatio: { min: number; weight: number };
  per: { max: number; weight: number };
  pbr: { min: number; max: number; weight: number };
  operatingMargin: { min: number; weight: number };
  roe: { min: number; weight: number };
}

export interface InvestmentStrategy {
  name: 'Balanced' | 'Growth' | 'Income' | 'Momentum' | 'Value' | 'Quality';
  description: string;
  criteria: EvaluationCriteria;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
}

export interface SectorCriteria {
  [sector: string]: Partial<EvaluationCriteria>;
}

export interface EvaluationResult {
  stockCode: string;
  scores: {
    shortTerm: number;
    longTerm: number;
    buyingCriteria: number;
    overall: number;
  };
  strategies: Record<string, number>;
  risks: string[];
  opportunities: string[];
  recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
}

// ===== パフォーマンス監視 =====

export interface PerformanceMetrics {
  processingSpeed: {
    dataGeneration: number;  // seconds
    enrichment: number;      // seconds
    evaluation: number;      // seconds
    total: number;           // seconds
    improvement: number;     // percentage
  };
  memoryUsage: {
    peak: number;            // MB
    average: number;         // MB
    reduction: number;       // percentage
  };
  cachePerformance: {
    hitRate: number;         // percentage
    l1HitRate: number;       // percentage
    l2HitRate: number;       // percentage
    l3HitRate: number;       // percentage
    averageResponseTime: number; // ms
  };
  errorRecovery: {
    totalErrors: number;
    recoveredErrors: number;
    recoveryRate: number;    // percentage
    averageRecoveryTime: number; // ms
  };
  systemAvailability: {
    uptime: number;          // percentage
    mtbf: number;            // mean time between failures (hours)
    mttr: number;            // mean time to recovery (minutes)
  };
}

// ===== 統合最適化システム =====

export interface IntegratedOptimizationResult {
  timestamp: Date;
  namespace: string;
  metrics: PerformanceMetrics;
  improvements: {
    dataIntegrationEfficiency: number;
    fieldCompleteness: number;
    mappingAccuracy: number;
    ttlOptimizationEffect: number;
    overallQuality: number;
  };
  recommendations: string[];
  nextOptimizationSchedule?: Date;
}

export interface OptimizationConfig {
  enableParallelProcessing: boolean;
  enableIntelligentCaching: boolean;
  enableSmartPipeline: boolean;
  enableErrorRecovery: boolean;
  maxConcurrency: number;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
  optimizationLevel: 'basic' | 'advanced' | 'maximum';
}

// ===== システム設定 =====

export interface SystemConfig {
  environment: 'development' | 'testing' | 'staging' | 'production';
  optimization: OptimizationConfig;
  fetchers: {
    [key: string]: {
      enabled: boolean;
      priority: number;
      rateLimits: {
        requestsPerSecond: number;
        requestsPerMinute: number;
      };
    };
  };
  cache: {
    ttlStrategy: 'static' | 'dynamic' | 'adaptive';
    hierarchical: boolean;
    maxMemoryUsage: number; // MB
  };
  pipeline: {
    maxBatchSize: number;
    enableParallelStages: boolean;
    resourceLimits: ResourceRequirements;
  };
}

export default {
  StockData,
  UnifiedStockData,
  OptimizedCSVProcessor,
  AdaptiveCacheSystem,
  SmartPipeline,
  SmartErrorHandler,
  UnifiedFetcher,
  EvaluationResult,
  PerformanceMetrics,
  IntegratedOptimizationResult,
  SystemConfig
};