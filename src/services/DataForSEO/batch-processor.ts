export interface BatchConfig {
  pollIntervalMs: number;
  timeoutMs: number;
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  pollIntervalMs: 5_000,
  timeoutMs: 300_000,
};

export interface BatchResult<T> {
  results: T[];
  errors: Error[];
}

export class BatchProcessor<T> {
  private readonly submitFn: (params: unknown) => Promise<string>;
  private readonly pollFn: (taskId: string) => Promise<T | null>;
  private readonly config: BatchConfig;

  constructor(
    submitFn: (params: unknown) => Promise<string>,
    pollFn: (taskId: string) => Promise<T | null>,
    config: Partial<BatchConfig> = {},
  ) {
    this.submitFn = submitFn;
    this.pollFn = pollFn;
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }

  async submitAndWait(params: unknown): Promise<T> {
    const taskId = await this.submitFn(params);
    const startTime = Date.now();

    while (Date.now() - startTime < this.config.timeoutMs) {
      const result = await this.pollFn(taskId);
      if (result !== null) return result;
      await new Promise((r) => setTimeout(r, this.config.pollIntervalMs));
    }

    throw new Error(
      `Batch task ${taskId} timed out after ${this.config.timeoutMs}ms`,
    );
  }

  async submitBatch(paramsList: unknown[]): Promise<BatchResult<T>> {
    const results: T[] = [];
    const errors: Error[] = [];

    const promises = paramsList.map(async (params) => {
      try {
        const result = await this.submitAndWait(params);
        results.push(result);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(promises);
    return { results, errors };
  }
}
