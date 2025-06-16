import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component } from "../component";
import { Input } from "../input";
import { CognitoIdentityProviderArgs } from "./cognito-user-pool";
export interface Args extends CognitoIdentityProviderArgs {
    /**
     * The Cognito user pool ID.
     */
    userPool: Input<string>;
}
/**
 * The `CognitoIdentityProvider` component is internally used by the `CognitoUserPool`
 * component to add identity providers to your [Amazon Cognito user pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addIdentityProvider` method of the `CognitoUserPool` component.
 */
export declare class CognitoIdentityProvider extends Component {
    private identityProvider;
    constructor(name: string, args: Args, opts?: ComponentResourceOptions);
    /**
     * The Cognito identity provider name.
     */
    get providerName(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cognito identity provider.
         */
        identityProvider: import("@pulumi/aws/cognito/identityProvider").IdentityProvider;
    };
}
