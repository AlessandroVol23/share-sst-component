import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { AppSyncResolverArgs } from "./app-sync";
export interface ResolverArgs extends AppSyncResolverArgs {
    /**
     * The AppSync GraphQL API ID.
     */
    apiId: Input<string>;
    /**
     * The type name from the schema defined.
     */
    type: Input<string>;
    /**
     * The field name from the schema defined.
     */
    field: Input<string>;
}
/**
 * The `AppSyncResolver` component is internally used by the `AppSync` component to add
 * resolvers to [AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addResolver` method of the `AppSync` component.
 */
export declare class AppSyncResolver extends Component {
    private readonly resolver;
    constructor(name: string, args: ResolverArgs, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon AppSync Resolver.
         */
        resolver: import("@pulumi/aws/appsync/resolver").Resolver;
    };
}
