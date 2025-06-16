import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
export interface BucketFile {
    source: string;
    key: string;
    cacheControl?: string;
    contentType: string;
    hash?: string;
}
export interface BucketFilesInputs {
    bucketName: Input<string>;
    files: Input<BucketFile[]>;
    purge: Input<boolean>;
    region: Input<string>;
}
export declare class BucketFiles extends dynamic.Resource {
    constructor(name: string, args: BucketFilesInputs, opts?: CustomResourceOptions);
}
