import fs from "fs/promises";
import { interpolate, output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { logicalName } from "../naming";
import { VisibleError } from "../error";
import { AppSyncDataSource } from "./app-sync-data-source";
import { AppSyncResolver } from "./app-sync-resolver";
import { AppSyncFunction } from "./app-sync-function";
import { dns as awsDns } from "./dns.js";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { useProvider } from "./helpers/provider";
import { appsync } from "@pulumi/aws";
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
export class AppSync extends Component {
    constructor(name, args, opts = {}) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const domain = normalizeDomain();
        const schema = loadSchema();
        const api = createGraphQLApi();
        const certificateArn = createSsl();
        const domainName = createDomainName();
        createDnsRecords();
        this.constructorName = name;
        this.constructorOpts = opts;
        this.api = api;
        this.domainName = domainName;
        this.registerOutputs({ _hint: this.url });
        function normalizeDomain() {
            if (!args.domain)
                return;
            // validate
            output(args.domain).apply((domain) => {
                if (typeof domain === "string")
                    return;
                if (!domain.name)
                    throw new Error(`Missing "name" for domain.`);
                if (domain.dns === false && !domain.cert)
                    throw new Error(`Need to provide a validated certificate via "cert" when DNS is disabled`);
            });
            // normalize
            return output(args.domain).apply((domain) => {
                const norm = typeof domain === "string" ? { name: domain } : domain;
                return {
                    name: norm.name,
                    dns: norm.dns === false ? undefined : norm.dns ?? awsDns(),
                    cert: norm.cert,
                };
            });
        }
        function loadSchema() {
            return output(args.schema).apply(async (schema) => fs.readFile(schema, { encoding: "utf-8" }));
        }
        function createGraphQLApi() {
            return new appsync.GraphQLApi(...transform(args.transform?.api, `${name}Api`, {
                schema,
                authenticationType: "API_KEY",
            }, { parent }));
        }
        function createSsl() {
            if (!domain)
                return;
            return domain.apply((domain) => {
                if (domain.cert)
                    return output(domain.cert);
                // Certificates used for AppSync are required to be created in the us-east-1 region
                return new DnsValidatedCertificate(`${name}Ssl`, {
                    domainName: domain.name,
                    dns: domain.dns,
                }, { parent, provider: useProvider("us-east-1") }).arn;
            });
        }
        function createDomainName() {
            if (!domain || !certificateArn)
                return;
            const domainName = new appsync.DomainName(...transform(args.transform?.domainName, `${name}DomainName`, {
                domainName: domain?.name,
                certificateArn,
            }, { parent }));
            new appsync.DomainNameApiAssociation(`${name}DomainAssociation`, {
                apiId: api.id,
                domainName: domainName.domainName,
            });
            return domainName;
        }
        function createDnsRecords() {
            if (!domain || !domainName)
                return;
            domain.apply((domain) => {
                if (!domain.dns)
                    return;
                domain.dns.createAlias(name, {
                    name: domain.name,
                    aliasName: domainName.appsyncDomainName,
                    aliasZone: domainName.hostedZoneId,
                }, { parent });
            });
        }
    }
    /**
     * The GraphQL API ID.
     */
    get id() {
        return this.api.id;
    }
    /**
     * The URL of the GraphQL API.
     */
    get url() {
        return this.domainName
            ? interpolate `https://${this.domainName.domainName}/graphql`
            : this.api.uris["GRAPHQL"];
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon AppSync GraphQL API.
             */
            api: this.api,
        };
    }
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
    addDataSource(args) {
        const self = this;
        const selfName = this.constructorName;
        const nameSuffix = logicalName(args.name);
        return new AppSyncDataSource(`${selfName}DataSource${nameSuffix}`, {
            apiId: self.api.id,
            apiComponentName: selfName,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
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
    addFunction(args) {
        const self = this;
        const selfName = this.constructorName;
        const nameSuffix = logicalName(args.name);
        return new AppSyncFunction(`${selfName}Function${nameSuffix}`, {
            apiId: self.api.id,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
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
    addResolver(operation, args) {
        const self = this;
        const selfName = this.constructorName;
        // Parse field and type
        const parts = operation.trim().split(/\s+/);
        if (parts.length !== 2)
            throw new VisibleError(`Invalid resolver ${operation}`);
        const [type, field] = parts;
        const nameSuffix = `${logicalName(type)}` + `${logicalName(field)}`;
        return new AppSyncResolver(`${selfName}Resolver${nameSuffix}`, {
            apiId: self.api.id,
            type,
            field,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
            },
        };
    }
}
const __pulumiType = "sst:aws:AppSync";
// @ts-expect-error
AppSync.__pulumiType = __pulumiType;
