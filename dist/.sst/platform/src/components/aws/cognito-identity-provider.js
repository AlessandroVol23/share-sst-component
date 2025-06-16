import { output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { cognito } from "@pulumi/aws";
import { VisibleError } from "../error";
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
export class CognitoIdentityProvider extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const providerType = normalizeProviderType();
        const identityProvider = createIdentityProvider();
        this.identityProvider = identityProvider;
        function normalizeProviderType() {
            const type = output(args.type).apply((type) => ({
                saml: "SAML",
                oidc: "OIDC",
                facebook: "Facebook",
                google: "Google",
                amazon: "LoginWithAmazon",
                apple: "SignInWithApple",
            })[type]);
            if (!type)
                throw new VisibleError(`Invalid provider type: ${args.type}`);
            return type;
        }
        function createIdentityProvider() {
            return new cognito.IdentityProvider(...transform(args.transform?.identityProvider, `${name}IdentityProvider`, {
                userPoolId: args.userPool,
                providerName: name,
                providerType,
                providerDetails: args.details,
                attributeMapping: args.attributes,
            }, { parent }));
        }
    }
    /**
     * The Cognito identity provider name.
     */
    get providerName() {
        return this.identityProvider.providerName;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Cognito identity provider.
             */
            identityProvider: this.identityProvider,
        };
    }
}
const __pulumiType = "sst:aws:CognitoIdentityProvider";
// @ts-expect-error
CognitoIdentityProvider.__pulumiType = __pulumiType;
