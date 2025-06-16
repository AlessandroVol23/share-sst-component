import { Bucket } from "../.sst/platform/src/components/aws/bucket";
// Global context storage
let sstContext = null;
/**
 * Initialize the MyBucket package with SST context
 * Call this once in your SST app before using MyBucket components
 */
export function initMyBucket(context) {
    sstContext = context;
    // Override the global variables that SST expects
    if (typeof globalThis !== 'undefined') {
        globalThis.$app = context.app;
        globalThis.$dev = context.dev;
    }
}
/**
 * A custom bucket component that extends SST's bucket functionality with a prefix.
 * Make sure to call initMyBucket() before using this component.
 */
export class MyBucket extends Bucket {
    constructor(name, args, opts) {
        if (!sstContext) {
            throw new Error('MyBucket package not initialized. Call initMyBucket(context) first.');
        }
        // Apply the prefix to the bucket name using transform
        const prefixedArgs = {
            ...args,
            transform: {
                ...args.transform,
                bucket: (bucketArgs, opts, resourceName) => {
                    // Apply prefix to the bucket name
                    if (args.prefix) {
                        bucketArgs.bucket = `${args.prefix}-${name.toLowerCase()}`;
                    }
                    // Apply any existing bucket transform
                    if (args.transform?.bucket) {
                        if (typeof args.transform.bucket === 'function') {
                            args.transform.bucket(bucketArgs, opts, resourceName);
                        }
                        else {
                            Object.assign(bucketArgs, args.transform.bucket);
                        }
                    }
                },
            },
        };
        super(name, prefixedArgs, opts);
        this.prefix = args.prefix;
        this.originalName = name;
    }
    /**
     * Get the full prefixed name of the bucket
     */
    getPrefixedName() {
        return this.prefix ? `${this.prefix}-${this.originalName}` : this.originalName;
    }
    /**
     * Get the SST context used to initialize this package
     */
    static getContext() {
        return sstContext;
    }
}
