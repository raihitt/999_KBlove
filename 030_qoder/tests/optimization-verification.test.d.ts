declare class OptimizationVerifier {
    private benchmarks;
    private testDataPath;
    constructor();
    setupPerformanceTests(): Promise<void>;
    teardownPerformanceTests(): Promise<void>;
    private generateLargeTestDataSet;
    private generateComplexCSVFiles;
    private generateLargeCSV;
    recordBenchmark(operation: string, baseline: number, optimized: number, target: number): void;
    generatePerformanceReport(): any;
}
export { OptimizationVerifier };
//# sourceMappingURL=optimization-verification.test.d.ts.map