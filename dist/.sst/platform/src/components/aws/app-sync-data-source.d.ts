import { ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { Component } from "../component";
import { Function } from "./function";
import { AppSyncDataSourceArgs } from "./app-sync";
export interface DataSourceArgs extends AppSyncDataSourceArgs {
    /**
     * The AppSync GraphQL API ID.
     */
    apiId: Input<string>;
    /**
     * The AppSync component name.
     */
    apiComponentName: string;
}
/**
 * The `AppSyncDataSource` component is internally used by the `AppSync` component to add
 * data sources to [AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html).
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 *
 * You'll find this component returned by the `addDataSource` method of the `AppSync` component.
 */
export declare class AppSyncDataSource extends Component {
    private readonly dataSource;
    private readonly lambda?;
    private readonly serviceRole?;
    constructor(name: string, args: DataSourceArgs, opts?: ComponentResourceOptions);
    /**
     * The name of the data source.
     */
    get name(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon AppSync DataSource.
         */
        dataSource: import("@pulumi/aws/appsync/dataSource").DataSource;
        /**
         * The Lambda function used by the data source.
         */
        readonly function: Output<Function>;
        /**
         * The DataSource service's IAM role.
         */
        readonly serviceRole: import("@pulumi/aws/iam/role").Role;
    };
}
