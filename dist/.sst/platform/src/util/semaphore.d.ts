export declare class Semaphore {
    private max;
    private current;
    private queue;
    constructor(max: number);
    acquire(name: string): Promise<void>;
    release(): void;
}
