import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, outputId, transform, } from "../component";
import { hashStringToPrettyString, physicalName, logicalName } from "../naming";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { RETENTION } from "./logging";
import { dns as awsDns } from "./dns.js";
import { ApiGatewayV2Authorizer } from "./apigatewayv2-authorizer";
import { ApiGatewayWebSocketRoute } from "./apigateway-websocket-route";
import { setupApiGatewayAccount } from "./helpers/apigateway-account";
import { apigatewayv2, cloudwatch } from "@pulumi/aws";
import { permission } from "./permission";
import { VisibleError } from "../error";
/**
 * The `ApiGatewayWebSocket` component lets you add an [Amazon API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
 * to your app.
 *
 * @example
 *
 * #### Create the API
 *
 * ```ts title="sst.config.ts"
 * const api = new sst.aws.ApiGatewayWebSocket("MyApi");
 * ```
 *
 * #### Add a custom domain
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.ApiGatewayWebSocket("MyApi", {
 *   domain: "api.example.com"
 * });
 * ```
 *
 * #### Add routes
 *
 * ```ts title="sst.config.ts"
 * api.route("$connect", "src/connect.handler");
 * api.route("$disconnect", "src/disconnect.handler");
 * api.route("$default", "src/default.handler");
 * api.route("sendMessage", "src/sendMessage.handler");
 * ```
 */
export class ApiGatewayWebSocket extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const accessLog = normalizeAccessLog();
        const domain = normalizeDomain();
        const apigAccount = setupApiGatewayAccount(name, opts);
        const api = createApi();
        const logGroup = createLogGroup();
        const stage = createStage();
        const certificateArn = createSsl();
        const apigDomain = createDomainName();
        createDnsRecords();
        const apiMapping = createDomainMapping();
        this.constructorName = name;
        this.constructorArgs = args;
        this.constructorOpts = opts;
        this.api = api;
        this.stage = stage;
        this.apigDomain = apigDomain;
        this.apiMapping = apiMapping;
        this.logGroup = logGroup;
        this.registerOutputs({
            _hint: this.url,
        });
        function normalizeAccessLog() {
            return output(args.accessLog).apply((accessLog) => ({
                ...accessLog,
                retention: accessLog?.retention ?? "1 month",
            }));
        }
        function normalizeDomain() {
            if (!args.domain)
                return;
            return output(args.domain).apply((domain) => {
                // validate
                if (typeof domain !== "string") {
                    if (domain.name && domain.nameId)
                        throw new VisibleError(`Cannot configure both domain "name" and "nameId" for the "${name}" API.`);
                    if (!domain.name && !domain.nameId)
                        throw new VisibleError(`Either domain "name" or "nameId" is required for the "${name}" API.`);
                    if (domain.dns === false && !domain.cert)
                        throw new VisibleError(`Domain "cert" is required when "dns" is disabled for the "${name}" API.`);
                }
                // normalize
                const norm = typeof domain === "string" ? { name: domain } : domain;
                return {
                    name: norm.name,
                    nameId: norm.nameId,
                    path: norm.path,
                    dns: norm.dns === false ? undefined : norm.dns ?? awsDns(),
                    cert: norm.cert,
                };
            });
        }
        function createApi() {
            return new apigatewayv2.Api(...transform(args.transform?.api, `${name}Api`, {
                protocolType: "WEBSOCKET",
                routeSelectionExpression: "$request.body.action",
            }, { parent }));
        }
        function createLogGroup() {
            return new cloudwatch.LogGroup(...transform(args.transform?.accessLog, `${name}AccessLog`, {
                name: `/aws/vendedlogs/apis/${physicalName(64, name)}`,
                retentionInDays: accessLog.apply((accessLog) => RETENTION[accessLog.retention]),
            }, { parent, ignoreChanges: ["name"] }));
        }
        function createStage() {
            return new apigatewayv2.Stage(...transform(args.transform?.stage, `${name}Stage`, {
                apiId: api.id,
                autoDeploy: true,
                name: "$default",
                accessLogSettings: {
                    destinationArn: logGroup.arn,
                    format: JSON.stringify({
                        // request info
                        requestTime: `"$context.requestTime"`,
                        requestId: `"$context.requestId"`,
                        eventType: `"$context.eventType"`,
                        routeKey: `"$context.routeKey"`,
                        status: `$context.status`, // integer value, do not wrap in quotes
                        // integration info
                        integrationRequestId: `"$context.awsEndpointRequestId"`,
                        integrationStatus: `"$context.integrationStatus"`,
                        integrationLatency: `"$context.integrationLatency"`,
                        integrationServiceStatus: `"$context.integration.integrationStatus"`,
                        // caller info
                        ip: `"$context.identity.sourceIp"`,
                        userAgent: `"$context.identity.userAgent"`,
                        //cognitoIdentityId:`"$context.identity.cognitoIdentityId"`, // not supported in us-west-2 region
                        connectedAt: `"$context.connectedAt"`,
                        connectionId: `"$context.connectionId"`,
                    }),
                },
            }, { parent, dependsOn: apigAccount }));
        }
        function createSsl() {
            if (!domain)
                return output(undefined);
            return domain.apply((domain) => {
                if (domain.cert)
                    return output(domain.cert);
                if (domain.nameId)
                    return output(undefined);
                return new DnsValidatedCertificate(`${name}Ssl`, {
                    domainName: domain.name,
                    dns: domain.dns,
                }, { parent }).arn;
            });
        }
        function createDomainName() {
            if (!domain || !certificateArn)
                return;
            return all([domain, certificateArn]).apply(([domain, certificateArn]) => {
                return domain.nameId
                    ? apigatewayv2.DomainName.get(`${name}DomainName`, domain.nameId, {}, { parent })
                    : new apigatewayv2.DomainName(...transform(args.transform?.domainName, `${name}DomainName`, {
                        domainName: domain.name,
                        domainNameConfiguration: {
                            certificateArn: certificateArn,
                            endpointType: "REGIONAL",
                            securityPolicy: "TLS_1_2",
                        },
                    }, { parent }));
            });
        }
        function createDnsRecords() {
            if (!domain || !apigDomain)
                return;
            domain.apply((domain) => {
                if (!domain.dns)
                    return;
                if (domain.nameId)
                    return;
                domain.dns.createAlias(name, {
                    name: domain.name,
                    aliasName: apigDomain.domainNameConfiguration.targetDomainName,
                    aliasZone: apigDomain.domainNameConfiguration.hostedZoneId,
                }, { parent });
            });
        }
        function createDomainMapping() {
            if (!domain || !apigDomain)
                return;
            return domain.path?.apply((path) => new apigatewayv2.ApiMapping(`${name}DomainMapping`, {
                apiId: api.id,
                domainName: apigDomain.id,
                stage: "$default",
                apiMappingKey: path,
            }, { parent }));
        }
    }
    /**
     * The URL of the API.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated API Gateway URL.
     */
    get url() {
        // Note: If mapping key is set, the URL needs a trailing slash. Without the
        //       trailing slash, the API fails with the error {"message":"Not Found"}
        return this.apigDomain && this.apiMapping
            ? all([this.apigDomain.domainName, this.apiMapping.apiMappingKey]).apply(([domain, key]) => key ? `wss://${domain}/${key}/` : `wss://${domain}`)
            : interpolate `${this.api.apiEndpoint}/${this.stage.name}`;
    }
    /**
     * The management endpoint for the API used by the API Gateway Management API client.
     * This is useful for sending messages to connected clients.
     *
     * @example
     * ```js
     * import { Resource } from "sst";
     * import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
     *
     * const client = new ApiGatewayManagementApiClient({
     *   endpoint: Resource.MyApi.managementEndpoint,
     * });
     * ```
     */
    get managementEndpoint() {
        // ie. https://v1lmfez2nj.execute-api.us-east-1.amazonaws.com/$default
        return this.api.apiEndpoint.apply((endpoint) => interpolate `${endpoint.replace("wss", "https")}/${this.stage.name}`);
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        const self = this;
        return {
            /**
             * The Amazon API Gateway V2 API.
             */
            api: this.api,
            /**
             * The API Gateway HTTP API domain name.
             */
            get domainName() {
                if (!self.apigDomain)
                    throw new VisibleError(`"nodes.domainName" is not available when domain is not configured for the "${self.constructorName}" API.`);
                return self.apigDomain;
            },
            /**
             * The CloudWatch LogGroup for the access logs.
             */
            logGroup: this.logGroup,
        };
    }
    /**
     * Add a route to the API Gateway WebSocket API.
     *
     * There are three predefined routes:
     * - `$connect`: When the client connects to the API.
     * - `$disconnect`: When the client or the server disconnects from the API.
     * - `$default`: The default or catch-all route.
     *
     * In addition, you can create custom routes. When a request comes in, the API Gateway
     * will look for the specific route defined by the user. If no route matches, the `$default`
     * route will be invoked.
     *
     * @param route The path for the route.
     * @param handler The function that'll be invoked.
     * @param args Configure the route.
     *
     * @example
     * Add a simple route.
     *
     * ```js title="sst.config.ts"
     * api.route("sendMessage", "src/sendMessage.handler");
     * ```
     *
     * Add a predefined route.
     *
     * ```js title="sst.config.ts"
     * api.route("$default", "src/default.handler");
     * ```
     *
     * Enable auth for a route.
     *
     * ```js title="sst.config.ts"
     * api.route("sendMessage", "src/sendMessage.handler", {
     *   auth: {
     *     iam: true
     *   }
     * });
     * ```
     *
     * Customize the route handler.
     *
     * ```js title="sst.config.ts"
     * api.route("sendMessage", {
     *   handler: "src/sendMessage.handler",
     *   memory: "2048 MB"
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * api.route("sendMessage", "arn:aws:lambda:us-east-1:123456789012:function:my-function");
     * ```
     */
    route(route, handler, args = {}) {
        const prefix = this.constructorName;
        const suffix = logicalName(["$connect", "$disconnect", "$default"].includes(route)
            ? route
            : hashStringToPrettyString(`${outputId}${route}`, 6));
        const transformed = transform(this.constructorArgs.transform?.route?.args, `${prefix}Route${suffix}`, args, { provider: this.constructorOpts.provider });
        return new ApiGatewayWebSocketRoute(transformed[0], {
            api: {
                name: prefix,
                id: this.api.id,
                executionArn: this.api.executionArn,
            },
            route,
            handler,
            handlerTransform: this.constructorArgs.transform?.route?.handler,
            ...transformed[1],
        }, transformed[2]);
    }
    /**
     * Add an authorizer to the API Gateway WebSocket API.
     *
     * @param name The name of the authorizer.
     * @param args Configure the authorizer.
     *
     * @example
     * Add a Lambda authorizer.
     *
     * ```js title="sst.config.ts"
     * api.addAuthorizer({
     *   name: "myAuthorizer",
     *   lambda: {
     *     function: "src/authorizer.index"
     *   }
     * });
     * ```
     *
     * Add a JWT authorizer.
     *
     * ```js title="sst.config.ts"
     * const authorizer = api.addAuthorizer({
     *   name: "myAuthorizer",
     *   jwt: {
     *     issuer: "https://issuer.com/",
     *     audiences: ["https://api.example.com"],
     *     identitySource: "$request.header.AccessToken"
     *   }
     * });
     * ```
     *
     * Add a Cognito UserPool as a JWT authorizer.
     *
     * ```js title="sst.config.ts"
     * const pool = new sst.aws.CognitoUserPool("MyUserPool");
     * const poolClient = userPool.addClient("Web");
     *
     * const authorizer = api.addAuthorizer({
     *   name: "myCognitoAuthorizer",
     *   jwt: {
     *     issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${pool.id}`,
     *     audiences: [poolClient.id]
     *   }
     * });
     * ```
     *
     * Now you can use the authorizer in your routes.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /", "src/get.handler", {
     *   auth: {
     *     jwt: {
     *       authorizer: authorizer.id
     *     }
     *   }
     * });
     * ```
     */
    addAuthorizer(name, args) {
        const self = this;
        const constructorName = this.constructorName;
        return new ApiGatewayV2Authorizer(`${constructorName}Authorizer${name}`, {
            api: {
                id: self.api.id,
                name: constructorName,
                executionArn: this.api.executionArn,
            },
            type: "websocket",
            name,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.url,
                managementEndpoint: this.managementEndpoint,
            },
            include: [
                permission({
                    actions: ["execute-api:ManageConnections"],
                    resources: [interpolate `${this.api.executionArn}/*/*/@connections/*`],
                }),
            ],
        };
    }
}
const __pulumiType = "sst:aws:ApiGatewayWebSocket";
// @ts-expect-error
ApiGatewayWebSocket.__pulumiType = __pulumiType;
