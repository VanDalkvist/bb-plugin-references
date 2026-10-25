/**
 * Keyed async mutex for serializing operations by string key (AP-034).
 */
export class KeyedAsyncMutex {
  private queues = new Map<string, Promise<unknown>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(key) || Promise.resolve();
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((r) => {
      resolveLock = r;
    });

    const next = prev.catch(() => {}).then(() => lockPromise);
    this.queues.set(key, next);

    await prev.catch(() => {});
    try {
      return await fn();
    } finally {
      resolveLock();
      if (this.queues.get(key) === next) {
        this.queues.delete(key);
      }
    }
  }
}
