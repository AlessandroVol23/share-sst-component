import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import { FunctionArgs, Function } from "./function";
import { s3 } from "@pulumi/aws";
export interface AuthArgs {
    authenticator: FunctionArgs;
    transform?: {
        bucketPolicy?: Transform<s3.BucketPolicyArgs>;
    };
}
export declare class Auth extends Component implements Link.Linkable {
    private readonly _key;
    private readonly _authenticator;
    constructor(name: string, args: AuthArgs, opts?: ComponentResourceOptions);
    get key(): import("@pulumi/tls/privateKey").PrivateKey;
    get authenticator(): Output<Function>;
    get url(): Output<string>;
    /** @internal */
    getSSTLink(): {
        properties: {
            publicKey: Output<string>;
        };
    };
}
