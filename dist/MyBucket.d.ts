import { ComponentResourceOptions } from "@pulumi/pulumi";
export interface SSTContext {
    app: {
        name: string;
        stage: string;
    };
    dev: boolean;
}
/**
 * Initialize the MyBucket package with SST context
 * Call this once in your SST app before using MyBucket components
 */
export declare function initMyBucket(context: SSTContext): void;
export interface MyBucketArgs {
    /**
     * A prefix to add to the bucket name for organization
     */
    prefix: string;
    /**
     * Enable public read access for all the files in the bucket.
     */
    access?: "public" | "cloudfront";
    /**
     * The CORS configuration for the bucket.
     */
    cors?: boolean | {
        allowHeaders?: string[];
        allowMethods?: string[];
        allowOrigins?: string[];
        exposeHeaders?: string[];
        maxAge?: string;
    };
    /**
     * Enable versioning for the bucket.
     */
    versioning?: boolean;
    /**
     * Transform how this component creates its underlying resources.
     */
    transform?: {
        bucket?: any;
        cors?: any;
        policy?: any;
        versioning?: any;
        publicAccessBlock?: any;
    };
}
/**
 * A custom bucket component that extends SST's bucket functionality with a prefix.
 * Make sure to call initMyBucket() before using this component.
 */
export declare class MyBucket {
    private bucket;
    readonly prefix: string;
    private readonly originalName;
    constructor(name: string, args: MyBucketArgs, opts?: ComponentResourceOptions);
    /**
     * The generated name of the S3 Bucket.
     */
    get name(): any;
    /**
     * The domain name of the bucket.
     */
    get domain(): any;
    /**
     * The ARN of the S3 Bucket.
     */
    get arn(): any;
    /**
     * The underlying resources this component creates.
     */
    get nodes(): any;
    /**
     * Get the full prefixed name of the bucket
     */
    getPrefixedName(): string;
    /**
     * Subscribe to event notifications from this bucket.
     */
    notify(args: any): any;
    /**
     * Get the SST context used to initialize this package
     */
    static getContext(): SSTContext | null;
    /**
     * Reference an existing bucket with the given bucket name.
     */
    static get(name: string, bucketName: string, opts?: ComponentResourceOptions): any;
}
