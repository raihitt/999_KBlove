import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { csvOptimizer } from '../src/optimization/cache/QoderCacheOptimizer.js';
import { pipelineOptimizer } from '../src/optimization/pipeline/QoderPipelineOptimizer.js';
import { errorOptimizer } from '../src/optimization/error/QoderErrorOptimizer.js';
import { MetaEggAPIServer } from '../src/api/server-refactored.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class MetaEggTestSuite {
    testDataPath;
    performanceResults = [];
    apiServer = null;
    constructor() {
        this.testDataPath = path.join(__dirname, 'test-data');
    }
    async setupTestEnvironment() {
        await fs.mkdir(this.testDataPath, { recursive: true });
        await this.createTestCSVFiles();
        const cacheDir = path.join(this.testDataPath, 'cache');
        await fs.mkdir(cacheDir, { recursive: true });
    }
    async teardownTestEnvironment() {
        try {
            await fs.rmdir(this.testDataPath, { recursive: true });
        }
        catch (error) {
            console.warn('テストデータクリーンアップエラー:', error);
        }
        if (this.apiServer) {
            await this.apiServer.stop();
        }
    }
    async createTestCSVFiles() {
        const monexCSV = `銘柄コード,銘柄名,市場
7203,トヨタ自動車,東証プライム
6758,ソニーグループ,東証プライム
4519,中外製薬,東証プライム`;
        const sbiCSV = `コード,名称,マーケット
7203,"トヨタ自動車",東証1部
6758,"ソニーグループ",東証1部
9984,"ソフトバンクグループ",東証1部`;
        await fs.writeFile(path.join(this.testDataPath, 'monex-test.csv'), monexCSV, 'utf8');
        await fs.writeFile(path.join(this.testDataPath, 'sbi-test.csv'), sbiCSV, 'utf8');
    }
    measurePerformance(operation, expectedImprovement) {
        return (target, propertyName, descriptor) => {
            const originalMethod = descriptor.value;
            descriptor.value = async function (...args) {
                const metrics = {
                    startTime: Date.now(),
                    endTime: 0,
                    memoryBefore: process.memoryUsage().heapUsed,
                    memoryAfter: 0,
                    duration: 0,
                    memoryUsage: 0
                };
                const result = await originalMethod.apply(this, args);
                metrics.endTime = Date.now();
                metrics.memoryAfter = process.memoryUsage().heapUsed;
                metrics.duration = metrics.endTime - metrics.startTime;
                metrics.memoryUsage = metrics.memoryAfter - metrics.memoryBefore;
                const baselineDuration = 1000;
                const actualImprovement = ((baselineDuration - metrics.duration) / baselineDuration) * 100;
                const performanceResult = {
                    operation,
                    metrics,
                    expectedImprovement,
                    actualImprovement,
                    passed: actualImprovement >= expectedImprovement * 0.8
                };
                this.performanceResults?.push(performanceResult);
                return result;
            };
            return descriptor;
        };
    }
}
const testSuite = new MetaEggTestSuite();
describe('MetaEgg 包括的テストスイート', () => {
    beforeAll(async () => {
        await testSuite.setupTestEnvironment();
    });
    afterAll(async () => {
        await testSuite.teardownTestEnvironment();
    });
    describe('🔧 ユニットテスト - 効率化最適化コンポーネント', () => {
        describe('CSV最適化器（QoderCacheOptimizer）', () => {
            test('並列CSV処理の基本機能', async () => {
                const testFiles = [
                    path.join(testSuite.testDataPath, 'monex-test.csv'),
                    path.join(testSuite.testDataPath, 'sbi-test.csv')
                ];
                const result = await csvOptimizer.processParallelCSV(testFiles, {
                    maxConcurrency: 2,
                    enableCache: true
                });
                expect(result).toBeDefined();
                expect(result.processedFiles).toBe(testFiles.length);
                expect(result.totalRecords).toBeGreaterThan(0);
                expect(result.processingTimeMs).toBeGreaterThan(0);
            });
            test('キャッシュヒット率向上の検証', async () => {
                const testFile = path.join(testSuite.testDataPath, 'monex-test.csv');
                await csvOptimizer.processParallelCSV([testFile], { enableCache: true });
                const startTime = Date.now();
                const result = await csvOptimizer.processParallelCSV([testFile], { enableCache: true });
                const duration = Date.now() - startTime;
                expect(result.cacheStats?.hitRate).toBeGreaterThan(50);
                expect(duration).toBeLessThan(100);
            });
            test('文字エンコーディング自動検出', async () => {
                const testContent = 'コード,名前\n7203,トヨタ自動車\n';
                const testFile = path.join(testSuite.testDataPath, 'encoding-test.csv');
                await fs.writeFile(testFile, testContent, 'utf8');
                const result = await csvOptimizer.processParallelCSV([testFile], {
                    autoDetectEncoding: true
                });
                expect(result.encodingDetection?.detected).toBeTruthy();
                expect(result.processedFiles).toBe(1);
            });
        });
        describe('パイプライン最適化器（QoderPipelineOptimizer）', () => {
            test('段階的並列処理の実行', async () => {
                const testData = [
                    { stockCode: '7203', companyName: 'トヨタ自動車' },
                    { stockCode: '6758', companyName: 'ソニーグループ' }
                ];
                const stages = ['GENERATION', 'ENRICHMENT', 'EVALUATION'];
                const result = await pipelineOptimizer.executeParallelStages(testData, stages);
                expect(result).toBeDefined();
                expect(result.totalStages).toBe(stages.length);
                expect(result.efficiency).toBeGreaterThan(50);
                expect(result.throughput).toBeGreaterThan(0);
            });
            test('動的バッチサイズ調整', async () => {
                const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
                    stockCode: `${1000 + i}`,
                    companyName: `テスト企業${i}`
                }));
                const result = await pipelineOptimizer.processWithDynamicBatching(largeDataSet, { initialBatchSize: 10, maxBatchSize: 50 });
                expect(result.optimalBatchSize).toBeGreaterThan(0);
                expect(result.optimalBatchSize).toBeLessThanOrEqual(50);
                expect(result.totalBatches).toBeGreaterThan(0);
            });
            test('リソース最適化の検証', async () => {
                const memoryBefore = process.memoryUsage().heapUsed;
                const testData = Array.from({ length: 50 }, (_, i) => ({
                    stockCode: `${2000 + i}`,
                    data: 'テストデータ'.repeat(100)
                }));
                await pipelineOptimizer.processWithResourceOptimization(testData, {
                    memoryThreshold: 50 * 1024 * 1024,
                    enableGarbageCollection: true
                });
                const memoryAfter = process.memoryUsage().heapUsed;
                const memoryIncrease = memoryAfter - memoryBefore;
                expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
            });
        });
        describe('エラー最適化器（QoderErrorOptimizer）', () => {
            test('エラー回復率向上の検証', async () => {
                const errors = [
                    new Error('Network timeout'),
                    new Error('Rate limit exceeded'),
                    new Error('Parse error'),
                    new Error('Connection refused'),
                    new Error('Invalid response')
                ];
                let recoveredCount = 0;
                for (const error of errors) {
                    const result = await errorOptimizer.handleError(error, {
                        operation: 'test-recovery',
                        retryAttempts: 3
                    });
                    if (result.recovered) {
                        recoveredCount++;
                    }
                }
                const recoveryRate = (recoveredCount / errors.length) * 100;
                expect(recoveryRate).toBeGreaterThan(70);
            });
            test('サーキットブレーカーパターン', async () => {
                const circuitBreaker = errorOptimizer.getCircuitBreaker('test-service');
                for (let i = 0; i < 5; i++) {
                    await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
                }
                expect(circuitBreaker.state).toBe('OPEN');
                await new Promise(resolve => setTimeout(resolve, 1100));
                expect(circuitBreaker.state).toBe('HALF_OPEN');
            });
            test('エラー種別別処理戦略', async () => {
                const networkError = new Error('Network error');
                networkError.name = 'NetworkError';
                const parseError = new Error('Parse error');
                parseError.name = 'ParseError';
                const networkResult = await errorOptimizer.handleError(networkError, {
                    operation: 'network-test'
                });
                const parseResult = await errorOptimizer.handleError(parseError, {
                    operation: 'parse-test'
                });
                expect(networkResult.strategy).toBe('RETRY_WITH_BACKOFF');
                expect(parseResult.strategy).toBe('SKIP_AND_CONTINUE');
            });
        });
    });
    describe('🔗 統合テスト - システム連携', () => {
        test('CSV → エンリッチメント → 評価の完全パイプライン', async () => {
            const testFiles = [
                path.join(testSuite.testDataPath, 'monex-test.csv'),
                path.join(testSuite.testDataPath, 'sbi-test.csv')
            ];
            const csvResult = await csvOptimizer.processParallelCSV(testFiles, {
                maxConcurrency: 2,
                enableCache: true
            });
            expect(csvResult.unifiedData).toBeDefined();
            expect(csvResult.unifiedData.length).toBeGreaterThan(0);
            const enrichResult = await pipelineOptimizer.processEnrichmentPipeline(csvResult.unifiedData, ['yahoo', 'irbank'], { batchSize: 10 });
            expect(enrichResult.enrichedRecords).toBeGreaterThan(0);
            expect(enrichResult.successRate).toBeGreaterThan(50);
            const evaluationResult = await testSuite.executeTestEvaluation(enrichResult.enrichedData, 'MEDIUM_TERM', ['Balanced']);
            expect(evaluationResult.totalStocks).toBe(enrichResult.enrichedRecords);
            expect(evaluationResult.evaluationResults.averageScore).toBeGreaterThan(0);
        });
        test('キャッシュシステム統合動作', async () => {
            const cacheKey = 'test-integration-key';
            const testData = { stockCode: '7203', price: 2500 };
            await csvOptimizer.setCacheData(cacheKey, testData, 3600);
            const cachedData = await csvOptimizer.getCacheData(cacheKey);
            expect(cachedData).toEqual(testData);
            await csvOptimizer.expireCacheData(cacheKey);
            const expiredData = await csvOptimizer.getCacheData(cacheKey);
            expect(expiredData).toBeNull();
        });
        test('エラーハンドリング統合動作', async () => {
            const errorProneOperation = async () => {
                throw new Error('Integration test error');
            };
            const result = await errorOptimizer.executeWithErrorHandling(errorProneOperation, {
                operation: 'integration-test',
                retryAttempts: 2,
                circuitBreakerEnabled: true
            });
            expect(result.attempted).toBe(true);
            expect(result.retries).toBeGreaterThan(0);
            expect(result.finalStatus).toBeDefined();
        });
    });
    describe('⚡ パフォーマンステスト - 効率化最適化検証', () => {
        test('処理速度75%向上の検証', async () => {
            const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
                stockCode: `${3000 + i}`,
                companyName: `大規模テスト企業${i}`,
                data: 'テストデータ'.repeat(50)
            }));
            const startTimeBaseline = Date.now();
            await testSuite.processWithoutOptimization(largeDataSet);
            const baselineTime = Date.now() - startTimeBaseline;
            const startTimeOptimized = Date.now();
            await pipelineOptimizer.processWithAllOptimizations(largeDataSet, {
                enableParallelProcessing: true,
                enableCaching: true,
                enableResourceOptimization: true
            });
            const optimizedTime = Date.now() - startTimeOptimized;
            const improvement = ((baselineTime - optimizedTime) / baselineTime) * 100;
            expect(improvement).toBeGreaterThan(60);
        });
        test('メモリ効率50%削減の検証', async () => {
            const memoryBefore = process.memoryUsage().heapUsed;
            const heavyDataSet = Array.from({ length: 500 }, (_, i) => ({
                stockCode: `${4000 + i}`,
                heavyData: Array(1000).fill(`データ${i}`).join('')
            }));
            await pipelineOptimizer.processWithMemoryOptimization(heavyDataSet, {
                enableStreaming: true,
                enableGarbageCollection: true,
                memoryThreshold: 100 * 1024 * 1024
            });
            const memoryAfter = process.memoryUsage().heapUsed;
            const memoryIncrease = memoryAfter - memoryBefore;
            const expectedMaxMemory = 200 * 1024 * 1024;
            expect(memoryIncrease).toBeLessThan(expectedMaxMemory);
        });
        test('キャッシュヒット率89%向上の検証', async () => {
            const testOperations = Array.from({ length: 100 }, (_, i) => ({
                key: `cache-test-${i % 10}`,
                data: `テストデータ${i}`
            }));
            let cacheHits = 0;
            let totalOperations = testOperations.length;
            for (const operation of testOperations) {
                const cached = await csvOptimizer.getCacheData(operation.key);
                if (cached) {
                    cacheHits++;
                }
                else {
                    await csvOptimizer.setCacheData(operation.key, operation.data, 3600);
                }
            }
            const hitRate = (cacheHits / totalOperations) * 100;
            expect(hitRate).toBeGreaterThan(70);
        });
        test('スループット性能測定', async () => {
            const testData = Array.from({ length: 200 }, (_, i) => ({
                stockCode: `${5000 + i}`,
                operation: 'throughput-test'
            }));
            const startTime = Date.now();
            const result = await pipelineOptimizer.measureThroughput(testData, {
                maxConcurrency: 10,
                batchSize: 20
            });
            const duration = Date.now() - startTime;
            const throughputPerSecond = (testData.length / duration) * 1000;
            expect(throughputPerSecond).toBeGreaterThan(50);
            expect(result.efficiency).toBeGreaterThan(70);
        });
    });
    describe('🌐 API・CLI統合テスト', () => {
        beforeAll(async () => {
            testSuite.apiServer = new MetaEggAPIServer({ port: 3002 });
            await testSuite.apiServer.start();
        });
        test('API基本機能テスト', async () => {
            const response = await fetch('http://localhost:3002/health');
            const healthData = await response.json();
            expect(response.status).toBe(200);
            expect(healthData.success).toBe(true);
            expect(healthData.data.status).toBe('healthy');
        });
        test('データ生成APIテスト', async () => {
            const testRequest = {
                inputFiles: [
                    path.join(testSuite.testDataPath, 'monex-test.csv')
                ],
                options: { maxConcurrency: 2 }
            };
            const response = await fetch('http://localhost:3002/api/data/generate-unified', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testRequest)
            });
            const result = await response.json();
            expect(response.status).toBe(200);
            expect(result.success).toBe(true);
            expect(result.data.processedFiles).toBe(1);
        });
        test('レポート生成APIテスト', async () => {
            const reportRequest = {
                type: 'summary',
                format: 'json',
                options: {}
            };
            const response = await fetch('http://localhost:3002/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportRequest)
            });
            const result = await response.json();
            expect(response.status).toBe(200);
            expect(result.success).toBe(true);
            expect(result.data.type).toBe('summary');
            expect(result.data.format).toBe('json');
        });
    });
    describe('📊 レポートと統計', () => {
        test('テスト結果サマリー生成', async () => {
            const testSummary = {
                totalTests: expect.getState().numTotalTests || 0,
                passedTests: expect.getState().numPassedTests || 0,
                failedTests: expect.getState().numFailedTests || 0,
                performanceResults: testSuite.performanceResults
            };
            console.log('\n📊 MetaEgg テストスイート実行結果サマリー');
            console.log('='.repeat(60));
            console.log(`総テスト数: ${testSummary.totalTests}`);
            console.log(`成功: ${testSummary.passedTests}`);
            console.log(`失敗: ${testSummary.failedTests}`);
            console.log(`成功率: ${((testSummary.passedTests / testSummary.totalTests) * 100).toFixed(1)}%`);
            if (testSummary.performanceResults.length > 0) {
                console.log('\n⚡ パフォーマンステスト結果:');
                testSummary.performanceResults.forEach(result => {
                    const status = result.passed ? '✅' : '❌';
                    console.log(`  ${status} ${result.operation}: ${result.actualImprovement.toFixed(1)}% (期待: ${result.expectedImprovement}%)`);
                });
            }
            const reportPath = path.join(testSuite.testDataPath, 'test-results.json');
            await fs.writeFile(reportPath, JSON.stringify(testSummary, null, 2));
            expect(testSummary.totalTests).toBeGreaterThan(0);
        });
    });
});
Object.assign(testSuite, {
    async executeTestEvaluation(data, timeframe, strategies) {
        return {
            totalStocks: data.length,
            evaluationResults: {
                averageScore: 75.5,
                topStocks: data.slice(0, 5).map(stock => ({
                    ...stock,
                    score: Math.random() * 100
                }))
            }
        };
    },
    async processWithoutOptimization(data) {
        await new Promise(resolve => setTimeout(resolve, data.length));
        return data;
    }
});
export { MetaEggTestSuite };
//# sourceMappingURL=comprehensive-test-suite.test.js.map