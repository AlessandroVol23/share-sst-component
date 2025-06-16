// Global context storage
let sstContext = null;
let BucketClass = null;
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
    // Dynamically import the Bucket class at runtime
    try {
        const bucketModule = require('../.sst/platform/src/components/aws/bucket');
        BucketClass = bucketModule.Bucket;
    }
    catch (error) {
        throw new Error('Could not load SST Bucket component. Make sure you are running this in an SST project with .sst folder available.');
    }
}
/**
 * A custom bucket component that extends SST's bucket functionality with a prefix.
 * Make sure to call initMyBucket() before using this component.
 */
export class MyBucket {
    constructor(name, args, opts) {
        if (!sstContext) {
            throw new Error('MyBucket package not initialized. Call initMyBucket(context) first.');
        }
        if (!BucketClass) {
            throw new Error('SST Bucket class not loaded. Make sure initMyBucket() was called successfully.');
        }
        this.prefix = args.prefix;
        this.originalName = name;
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
        // Create the SST Bucket instance
        this.bucket = new BucketClass(name, prefixedArgs, opts);
    }
    /**
     * The generated name of the S3 Bucket.
     */
    get name() {
        return this.bucket.name;
    }
    /**
     * The domain name of the bucket.
     */
    get domain() {
        return this.bucket.domain;
    }
    /**
     * The ARN of the S3 Bucket.
     */
    get arn() {
        return this.bucket.arn;
    }
    /**
     * The underlying resources this component creates.
     */
    get nodes() {
        return this.bucket.nodes;
    }
    /**
     * Get the full prefixed name of the bucket
     */
    getPrefixedName() {
        return this.prefix ? `${this.prefix}-${this.originalName}` : this.originalName;
    }
    /**
     * Subscribe to event notifications from this bucket.
     */
    notify(args) {
        return this.bucket.notify(args);
    }
    /**
     * Get the SST context used to initialize this package
     */
    static getContext() {
        return sstContext;
    }
    /**
     * Reference an existing bucket with the given bucket name.
     */
    static get(name, bucketName, opts) {
        if (!BucketClass) {
            throw new Error('SST Bucket class not loaded. Make sure initMyBucket() was called successfully.');
        }
        return BucketClass.get(name, bucketName, opts);
    }
}
