class BackgroundQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
    this.processedCount = 0;
    this.failedCount = 0;
  }

  enqueue(name, handler) {
    this.jobs.push({ name, handler, enqueuedAt: Date.now() });
    this.#processNext();
  }

  async #processNext() {
    if (this.processing || this.jobs.length === 0) return;
    this.processing = true;

    const job = this.jobs.shift();
    try {
      await job.handler();
      this.processedCount += 1;
    } catch (error) {
      this.failedCount += 1;
      console.error(`[Queue Error] ${job.name}:`, error.message);
    } finally {
      this.processing = false;
      if (this.jobs.length > 0) {
        setImmediate(() => this.#processNext());
      }
    }
  }

  stats() {
    return {
      pending: this.jobs.length,
      processing: this.processing,
      processedTotal: this.processedCount,
      failedTotal: this.failedCount,
    };
  }
}

export const jobQueue = new BackgroundQueue();