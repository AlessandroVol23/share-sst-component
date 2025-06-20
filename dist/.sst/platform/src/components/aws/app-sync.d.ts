import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs, FunctionArn } from "./function";
import { AppSyncDataSource } from "./app-sync-data-source";
import { AppSyncResolver } from "./app-sync-resolver";
import { AppSyncFunction } from "./app-sync-function";
import { Dns } from "../dns";
import { appsync, iam } from "@pulumi/aws";
export interface AppSyncArgs {
    /**
     * Path to the GraphQL schema file. This path is relative to your `sst.config.ts`.
     * @example
     * ```js
     * {
     *   schema: "schema.graphql",
     * }
     * ```
     */
    schema: Input<string>;
    /**
     * Set a custom domain for your AppSync GraphQL API.
     *
     * Automatically manages domains hosted on AWS Route 53, Cloudflare, and Vercel. For other
     * providers, you'll need to pass in a `cert` that validates domain ownership and add the
     * DNS records.
     *
     * :::tip
     * Built-in support for AWS Route 53, Cloudflare, and Vercel. And manual setup for other
     * providers.
     * :::
     *
     * @example
     *
     * By default this assumes the domain is hosted on Route 53.
     *
     * ```js
     * {
     *   domain: "example.com"
     * }
     * ```
     *
     * For domains hosted on Cloudflare.
     *
     * ```js
     * {
     *   domain: {
     *     name: "example.com",
     *     dns: sst.cloudflare.dns()
     *   }
     * }
     * ```
     */
    domain?: Input<string | {
        /**
         * The custom domain you want to use.
         *
         * @example
         * ```js
         * {
         *   domain: {
         *     name: "example.com"
         *   }
         * }
         * ```
         *
         * Can also include subdomains based on the current stage.
         *
         * ```js
         * {
         *   domain: {
         *     name: `${$app.stage}.example.com`
         *   }
         * }
         * ```
         */
        name: Input<string>;
        /**
         * The ARN of an ACM (AWS Certificate Manager) certificate that proves ownership of the
         * domain. By default, a certificate is created and validated automatically.
         *
         * The certificate will be created in the `us-east-1` region as required by AWS AppSync.
         * If you are creating your own certificate, you must also create it in `us-east-1`.
         *
         * :::tip
         * You need to pass in a `cert` for domains that are not hosted on supported `dns` providers.
         * :::
         *
         * To manually set up a domain on an unsupported provider, you'll need to:
         *
         * 1. [Validate that you own the domain](https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html) by creating an ACM certificate. You can either validate it by setting a DNS record or by verifying an email sent to the domain owner.
         * 2. Once validated, set the certificate ARN as the `cert` and set `dns` to `false`.
         * 3. Add the DNS records in your provider to point to the API Gateway URL.
         *
         * @example
         * ```js
         * {
         *   domain: {
         *     name: "example.com",
         *     dns: false,
         *     cert: "arn:aws:acm:us-east-1:112233445566:certificate/3a958790-8878-4cdc-a396-06d95064cf63"
         *   }
         * }
         * ```
         */
        cert?: Input<string>;
        /**
         * The DNS provider to use for the domain. Defaults to the AWS.
         *
         * Takes an adapter that can create the DNS records on the provider. This can automate
         * validating the domain and setting up the DNS routing.
         *
         * Supports Route 53, Cloudflare, and Vercel adapters. For other providers, you'll need
         * to set `dns` to `false` and pass in a certificate validating ownership via `cert`.
         *
         * @default `sst.aws.dns`
         *
         * @example
         *
         * Specify the hosted zone ID for the Route 53 domain.
         *
         * ```js
         * {
         *   domain: {
         *     name: "example.com",
         *     dns: sst.aws.dns({
         *       zone: "Z2FDTNDATAQYW2"
         *     })
         *   }
         * }
         * ```
         *
         * Use a domain hosted on Cloudflare, needs the Cloudflare provider.
         *
         * ```js
         * {
         *   domain: {
         *     name: "example.com",
         *     dns: sst.cloudflare.dns()
         *   }
         * }
         * ```
         *
         * Use a domain hosted on Vercel, needs the Vercel provider.
         *
         * ```js
         * {
         *   domain: {
         *     name: "example.com",
         *     dns: sst.vercel.dns()
         *   }
         * }
         * ```
         */
        dns?: Input<false | (Dns & {})>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the AppSync GraphQL API resource.
         */
        api?: Transform<appsync.GraphQLApiArgs>;
        /**
         * Transform the AppSync domain name resource.
         */
        domainName?: Transform<appsync.DomainNameArgs>;
    };
}
export interface AppSyncDataSourceArgs {
    /**
     * The name of the data source.
     * @example
     * ```js
     * {
     *   name: "lambdaDS"
     * }
     * ```
     */
    name: string;
    /**
     * The handler for the Lambda function.
     * @example
     * ```js
     * {
     *   lambda: "src/lambda.handler"
     * }
     * ```
     *
     * You can pass in the full function props.
     *
     * ```js
     * {
     *   lambda: {
     *     handler: "src/lambda.handler",
     *     timeout: "60 seconds"
     *   }
     * }
     * ```
     *
     * You can also pass in the function ARN.
     *
     * ```js
     * {
     *   lambda: "arn:aws:lambda:us-east-1:123456789012:function:my-function"
     * }
     * ```
     */
    lambda?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * The ARN for the DynamoDB table.
     * @example
     * ```js
     * {
     *   dynamodb: "arn:aws:dynamodb:us-east-1:123456789012:table/my-table"
     * }
     * ```
     */
    dynamodb?: Input<string>;
    /**
     * The ARN for the Elasticsearch domain.
     * @example
     * ```js
     * {
     *   elasticSearch: "arn:aws:es:us-east-1:123456789012:domain/my-domain"
     * }
     * ```
     */
    elasticSearch?: Input<string>;
    /**
     * The ARN for the EventBridge event bus.
     * @example
     * ```js
     * {
     *   eventBridge: "arn:aws:events:us-east-1:123456789012:event-bus/my-event-bus"
     * }
     * ```
     */
    eventBridge?: Input<string>;
    /**
     * The URL for the HTTP endpoint.
     * @example
     * ```js
     * {
     *   http: "https://api.example.com"
     * }
     * ```
     */
    http?: Input<string>;
    /**
     * The ARN for the OpenSearch domain.
     * @example
     * ```js
     * {
     *   openSearch: "arn:aws:opensearch:us-east-1:123456789012:domain/my-domain"
     * }
     * ```
     */
    openSearch?: Input<string>;
    /**
     * Configure the RDS data source.
     * @example
     * ```js
     * {
     *   rds: {
     *     cluster: "arn:aws:rds:us-east-1:123456789012:cluster:my-cluster",
     *     credentials: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret"
     *   }
     * }
     * ```
     */
    rds?: Input<{
        /**
         * The ARN for the RDS cluster.
         */
        cluster: Input<string>;
        /**
         * The ARN for the credentials secret store.
         */
        credentials: Input<string>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the AppSync DataSource resource.
         */
        dataSource?: Transform<appsync.DataSourceArgs>;
        /**
         * Transform the AppSync DataSource service role resource.
         */
        serviceRole?: Transform<iam.RoleArgs>;
    };
}
export interface AppSyncResolverArgs {
    /**
     * The type of the resolver.
     * @default `"unit"`
     * @example
     * ```js
     * {
     *   kind: "pipeline"
     * }
     * ```
     */
    kind?: Input<"unit" | "pipeline">;
    /**
     * The data source this resolver is using. This only applies for `unit` resolvers.
     * @example
     * ```js
     * {
     *   dataSource: "lambdaDS"
     * }
     * ```
     */
    dataSource?: Input<string>;
    /**
     * The functions this resolver is using. This only applies for `pipeline` resolvers.
     * @example
     * ```js
     * {
     *  functions: ["myFunction1", "myFunction2"]
     * }
     * ```
     */
    functions?: Input<Input<string>[]>;
    /**
     * The function code that contains the request and response functions.
     * @example
     * ```js
     * {
     *   code: fs.readFileSync("functions.js")
     * }
     * ```
     */
    code?: Input<string>;
    /**
     * For `unit` resolvers, this is the request mapping template. And for `pipeline`
     * resolvers, this is the before mapping template.
     * @example
     * ```js
     * {
     *   requestTemplate: `{
     *     "version": "2017-02-28",
     *     "operation": "Scan"
     *   }`
     * }
     * ```
     */
    requestTemplate?: Input<string>;
    /**
     * For `unit` resolvers, this is the response mapping template. And for `pipeline`
     * resolvers, this is the after mapping template.
     * @example
     * ```js
     * {
     *   responseTemplate: `{
     *     "users": $utils.toJson($context.result.items)
     *   }`
     * }
     * ```
     */
    responseTemplate?: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the AppSync Resolver resource.
         */
        resolver?: Transform<appsync.ResolverArgs>;
    };
}
export interface AppSyncFunctionArgs {
    /**
     * The name of the AppSync function.
     * @example
     * ```js
     * {
     *   name: "myFunction"
     * }
     * ```
     */
    name: string;
    /**
     * The data source this resolver is using.
     * @example
     * ```js
     * {
     *   dataSource: "lambdaDS"
     * }
     * ```
     */
    dataSource: Input<string>;
    /**
     * The function code that contains the request and response functions.
     * @example
     * ```js
     * {
     *   code: fs.readFileSync("functions.js")
     * }
     * ```
     */
    code?: Input<string>;
    /**
     * The function request mapping template.
     * @example
     * ```js
     * {
     *   requestTemplate: `{
     *     "version": "2018-05-29",
     *     "operation": "Scan",
     *   }`,
     * }
     * ```
     */
    requestMappingTemplate?: Input<string>;
    /**
     * The function response mapping template.
     * @example
     * ```js
     * {
     *   responseTemplate: `{
     *     "users": $utils.toJson($context.result.items)
     *   }`,
     * }
     * ```
     */
    responseMappingTemplate?: Input<string>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the AppSync Function resource.
         */
        function?: Transform<appsync.FunctionArgs>;
    };
}
/**
 * The `AppSync` component lets you add an [Amazon AppSync GraphQL API](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html) to your app.
 *
 * @example
 *
 * #### Create a GraphQL API
 *
 * ```ts title="sst.config.ts"
 * const api = new sst.aws.AppSync("MyApi", {
 *   schema: "schema.graphql",
 * });
 * ```
 *
 * #### Add a data source
 *
 * ```ts title="sst.config.ts"
 * const lambdaDS = api.addDataSource({
 *   name: "lambdaDS",
 *   lambda: "src/lambda.handler",
 * });
 * ```
 *
 * #### Add a resolver
 *
 * ```ts title="sst.config.ts"
 * api.addResolver("Query user", {
 *   dataSource: lambdaDS.name,
 * });
 * ```
 */
export declare class AppSync extends Component implements Link.Linkable {
    private constructorName;
    private constructorOpts;
    private api;
    private domainName?;
    constructor(name: string, args: AppSyncArgs, opts?: ComponentResourceOptions);
    /**
     * The GraphQL API ID.
     */
    get id(): import("@pulumi/pulumi").Output<string>;
    /**
     * The URL of the GraphQL API.
     */
    get url(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon AppSync GraphQL API.
         */
        api: import("@pulumi/aws/appsync/graphQLApi").GraphQLApi;
    };
    /**
     * Add a data source to this AppSync API.
     *
     * @param args Configure the data source.
     *
     * @example
     *
     * Add a Lambda function as a data source.
     *
     * ```js title="sst.config.ts"
     * api.addDataSource({
     *   name: "lambdaDS",
     *   lambda: "src/lambda.handler"
     * });
     * ```
     *
     * Customize the Lambda function.
     *
     * ```js title="sst.config.ts"
     * api.addDataSource({
     *   name: "lambdaDS",
     *   lambda: {
     *     handler: "src/lambda.handler",
     *     timeout: "60 seconds"
     *   }
     * });
     * ```
     *
     * Add a data source with an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * api.addDataSource({
     *   name: "lambdaDS",
     *   lambda: "arn:aws:lambda:us-east-1:123456789012:function:my-function"
     * })
     * ```
     *
     * Add a DynamoDB table as a data source.
     *
     * ```js title="sst.config.ts"
     * api.addDataSource({
     *   name: "dynamoDS",
     *   dynamodb: "arn:aws:dynamodb:us-east-1:123456789012:table/my-table"
     * })
     * ```
     */
    addDataSource(args: AppSyncDataSourceArgs): AppSyncDataSource;
    /**
     * Add a function to this AppSync API.
     *
     * @param args Configure the function.
     *
     * @example
     *
     * Add a function using a Lambda data source.
     *
     * ```js title="sst.config.ts"
     * api.addFunction({
     *   name: "myFunction",
     *   dataSource: "lambdaDS",
     * });
     * ```
     *
     * Add a function using a DynamoDB data source.
     *
     * ```js title="sst.config.ts"
     * api.addResolver("Query user", {
     *   name: "myFunction",
     *   dataSource: "dynamoDS",
     *   requestTemplate: `{
     *     "version": "2017-02-28",
     *     "operation": "Scan",
     *   }`,
     *   responseTemplate: `{
     *     "users": $utils.toJson($context.result.items)
     *   }`,
     * });
     * ```
     */
    addFunction(args: AppSyncFunctionArgs): AppSyncFunction;
    /**
     * Add a resolver to this AppSync API.
     *
     * @param operation The type and name of the operation.
     * @param args Configure the resolver.
     *
     * @example
     *
     * Add a resolver using a Lambda data source.
     *
     * ```js title="sst.config.ts"
     * api.addResolver("Query user", {
     *   dataSource: "lambdaDS",
     * });
     * ```
     *
     * Add a resolver using a DynamoDB data source.
     *
     * ```js title="sst.config.ts"
     * api.addResolver("Query user", {
     *   dataSource: "dynamoDS",
     *   requestTemplate: `{
     *     "version": "2017-02-28",
     *     "operation": "Scan",
     *   }`,
     *   responseTemplate: `{
     *     "users": $utils.toJson($context.result.items)
     *   }`,
     * });
     * ```
     *
     * Add a pipeline resolver.
     *
     * ```js title="sst.config.ts"
     * api.addResolver("Query user", {
     *   functions: [
     *     "MyFunction1",
     *     "MyFunction2"
     *   ]
     *   code: `
     *     export function request(ctx) {
     *       return {};
     *     }
     *     export function response(ctx) {
     *       return ctx.result;
     *     }
     *   `,
     * });
     * ```
     */
    addResolver(operation: string, args: AppSyncResolverArgs): AppSyncResolver;
    /** @internal */
    getSSTLink(): {
        properties: {
            url: import("@pulumi/pulumi").Output<string>;
        };
    };
}
