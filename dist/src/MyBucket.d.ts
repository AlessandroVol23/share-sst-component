import { Bucket, BucketArgs } from "../.sst/platform/src/components/aws/bucket";
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
export interface MyBucketArgs extends Omit<BucketArgs, 'transform'> {
    /**
     * A prefix to add to the bucket name for organization
     */
    prefix: string;
    /**
     * Transform how this component creates its underlying resources.
     */
    transform?: BucketArgs['transform'];
}
/**
 * A custom bucket component that extends SST's bucket functionality with a prefix.
 * Make sure to call initMyBucket() before using this component.
 */
export declare class MyBucket extends Bucket {
    readonly prefix: string;
    private readonly originalName;
    constructor(name: string, args: MyBucketArgs, opts?: ComponentResourceOptions);
    /**
     * Get the full prefixed name of the bucket
     */
    getPrefixedName(): string;
    /**
     * Get the SST context used to initialize this package
     */
    static getContext(): SSTContext | null;
}
