declare class IntegratedPipelineTester {
    private results;
    private testDataPath;
    constructor();
    setupPipelineTests(): Promise<void>;
    teardownPipelineTests(): Promise<void>;
    private createTestDataFiles;
    recordBenchmark(operation: string, metrics: any): void;
    private calculateScore;
    generateBenchmarkReport(): any;
    simulateEvaluation(data: any[]): Promise<any>;
    runOptimizationTest(suiteName: string): Promise<number>;
}
export { IntegratedPipelineTester };
//# sourceMappingURL=pipeline-benchmark.test.d.ts.map