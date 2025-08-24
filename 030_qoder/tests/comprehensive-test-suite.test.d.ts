declare class MetaEggTestSuite {
    private testDataPath;
    private performanceResults;
    private apiServer;
    constructor();
    setupTestEnvironment(): Promise<void>;
    teardownTestEnvironment(): Promise<void>;
    private createTestCSVFiles;
    private measurePerformance;
}
export { MetaEggTestSuite };
//# sourceMappingURL=comprehensive-test-suite.test.d.ts.map