import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { AppSyncFunctionArgs } from "./app-sync";
export interface FunctionArgs extends AppSyncFunctionArgs {
    /**
     * The AppSync GraphQL API ID.
     */
    apiId: Input<string>;
}
/**
 * The `AppSyncFunction` component is internally used by the `AppSync` component to add
 * functions to [AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addFunction` method of the `AppSync` component.
 */
export declare class AppSyncFunction extends Component {
    private readonly fn;
    constructor(name: string, args: FunctionArgs, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon AppSync Function.
         */
        function: import("@pulumi/aws/appsync/function").Function;
    };
}
