import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import { WorkerArgs, Worker } from "./worker";
import { BucketPolicyArgs } from "@pulumi/aws/s3";
export interface AuthArgs {
    authenticator: WorkerArgs;
    transform?: {
        bucketPolicy?: Transform<BucketPolicyArgs>;
    };
}
export declare class Auth extends Component implements Link.Linkable {
    private readonly _key;
    private readonly _authenticator;
    constructor(name: string, args: AuthArgs, opts?: ComponentResourceOptions);
    get key(): import("@pulumi/tls/privateKey").PrivateKey;
    get authenticator(): Output<Worker>;
    get url(): Output<string | undefined>;
    /** @internal */
    getSSTLink(): Link.Definition;
}
