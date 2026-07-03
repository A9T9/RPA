import { delayAsync } from "./utils";

export const enum TestRunnerState {
    Idle,
    Running,
    Aborting
}

export interface TestRunnerStatistics {
    succeeded: number;
    failed: number;
    totalTime: number;
}

export class TestRunner {
    private currentState: TestRunnerState;

    constructor() {
        this.currentState = TestRunnerState.Idle;
    }

    async startAsync(
        body: (step: number, maxSteps: number) => Promise<void>,
        count: number,
        delayMs: number
    ): Promise<TestRunnerStatistics> {
        const stats: TestRunnerStatistics = {
            succeeded: 0,
            failed: 0,
            totalTime: 0
        };

        if (this.currentState === TestRunnerState.Idle) {
            this.currentState = TestRunnerState.Running;
            for (let i = 0; i < count; ++i) {
                if (this.currentState !== TestRunnerState.Running) {
                    break;
                }

                const startTime = performance.now();
                try {
                    await body(i, count);
                    ++stats.succeeded;
                } catch (e) {
                    console.error("Test failed: ", e);
                    ++stats.failed;
                }

                const endTime = performance.now();
                const elapsedTime = endTime - startTime;
                stats.totalTime += elapsedTime;

                await delayAsync(() => {}, delayMs);
            }

            this.currentState = TestRunnerState.Idle;
        }

        return stats;
    }

    abort() {
        this.currentState = TestRunnerState.Aborting;
    }

    get state(): TestRunnerState {
        return this.currentState;
    }
}
