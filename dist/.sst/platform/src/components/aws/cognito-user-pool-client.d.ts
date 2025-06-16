import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component } from "../component";
import { Input } from "../input";
import { CognitoUserPoolClientArgs } from "./cognito-user-pool.js";
import { Link } from "../link";
export interface Args extends CognitoUserPoolClientArgs {
    /**
     * The Cognito user pool ID.
     */
    userPool: Input<string>;
}
/**
 * The `CognitoUserPoolClient` component is internally used by the `CognitoUserPool`
 * component to add clients to your [Amazon Cognito user pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addClient` method of the `CognitoUserPool` component.
 */
export declare class CognitoUserPoolClient extends Component implements Link.Linkable {
    private client;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The Cognito User Pool client ID.
     */
    get id(): import("@pulumi/pulumi").Output<string>;
    /**
     * The Cognito User Pool client secret.
     */
    get secret(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cognito User Pool client.
         */
        client: import("@pulumi/aws/cognito/userPoolClient").UserPoolClient;
    };
    /** @internal */
    getSSTLink(): {
        properties: {
            id: import("@pulumi/pulumi").Output<string>;
            secret: import("@pulumi/pulumi").Output<string>;
        };
    };
}
