import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, outputId, transform, } from "../component";
import { hashStringToPrettyString, physicalName, logicalName } from "../naming";
import { VisibleError } from "../error";
import { RETENTION } from "./logging";
import { ApiGatewayV1LambdaRoute } from "./apigatewayv1-lambda-route";
import { ApiGatewayV1Authorizer } from "./apigatewayv1-authorizer";
import { setupApiGatewayAccount } from "./helpers/apigateway-account";
import { apigateway, cloudwatch, getRegionOutput } from "@pulumi/aws";
import { dns as awsDns } from "./dns";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { ApiGatewayV1IntegrationRoute } from "./apigatewayv1-integration-route";
import { ApiGatewayV1UsagePlan } from "./apigatewayv1-usage-plan";
import { useProvider } from "./helpers/provider";
/**
 * The `ApiGatewayV1` component lets you add an [Amazon API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html) to your app.
 *
 * @example
 *
 * #### Create the API
 *
 * ```ts title="sst.config.ts"
 * const api = new sst.aws.ApiGatewayV1("MyApi");
 * ```
 *
 * #### Add routes
 *
 * ```ts title="sst.config.ts"
 * api.route("GET /", "src/get.handler");
 * api.route("POST /", "src/post.handler");
 *
 * api.deploy();
 * ```
 *
 * :::note
 * You need to call `deploy` after you've added all your routes.
 * :::
 *
 * #### Configure the routes
 *
 * ```ts title="sst.config.ts"
 * api.route("GET /", "src/get.handler", {
 *   auth: { iam: true }
 * });
 * ```
 *
 * #### Configure the route handler
 *
 * You can configure the Lambda function that'll handle the route.
 *
 * ```ts title="sst.config.ts"
 * api.route("POST /", {
 *   handler: "src/post.handler",
 *   memory: "2048 MB"
 * });
 * ```
 *
 * #### Default props for all routes
 *
 * You can use a `transform` to set some default props for all your routes. For
 * example, instead of setting the `memory` for each route.
 *
 * ```ts title="sst.config.ts"
 * api.route("GET /", { handler: "src/get.handler", memory: "2048 MB" });
 * api.route("POST /", { handler: "src/post.handler", memory: "2048 MB" });
 * ```
 *
 * You can set it through the `transform`.
 *
 * ```ts title="sst.config.ts" {6}
 * const api = new sst.aws.ApiGatewayV1("MyApi", {
 *   transform: {
 *     route: {
 *       handler: (args, opts) => {
 *         // Set the default if it's not set by the route
 *         args.memory ??= "2048 MB";
 *       }
 *     }
 *   }
 * });
 *
 * api.route("GET /", "src/get.handler");
 * api.route("POST /", "src/post.handler");
 * ```
 *
 * With this we set the `memory` if it's not overridden by the route.
 */
export class ApiGatewayV1 extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        this.resources = {};
        this.routes = [];
        this.deployed = false;
        const parent = this;
        const region = normalizeRegion();
        const endpoint = normalizeEndpoint();
        const apigAccount = setupApiGatewayAccount(name, opts);
        const api = createApi();
        this.resources["/"] = api.rootResourceId;
        this.constructorName = name;
        this.constructorArgs = args;
        this.constructorOpts = opts;
        this.api = api;
        this.region = region;
        this.endpointType = endpoint.types;
        function normalizeRegion() {
            return getRegionOutput(undefined, { parent }).name;
        }
        function normalizeEndpoint() {
            return output(args.endpoint).apply((endpoint) => {
                if (!endpoint)
                    return { types: "EDGE" };
                if (endpoint.type === "private" && !endpoint.vpcEndpointIds)
                    throw new VisibleError("Please provide the VPC endpoint IDs for the private endpoint.");
                return endpoint.type === "regional"
                    ? { types: "REGIONAL" }
                    : endpoint.type === "private"
                        ? {
                            types: "PRIVATE",
                            vpcEndpointIds: endpoint.vpcEndpointIds,
                        }
                        : { types: "EDGE" };
            });
        }
        function createApi() {
            return new apigateway.RestApi(...transform(args.transform?.api, `${name}Api`, {
                endpointConfiguration: endpoint,
            }, { parent, dependsOn: apigAccount }));
        }
    }
    /**
     * The URL of the API.
     */
    get url() {
        return this.apigDomain && this.apiMapping
            ? all([this.apigDomain.domainName, this.apiMapping.basePath]).apply(([domain, key]) => key ? `https://${domain}/${key}/` : `https://${domain}`)
            : interpolate `https://${this.api.id}.execute-api.${this.region}.amazonaws.com/${$app.stage}/`;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        const self = this;
        return {
            /**
             * The Amazon API Gateway REST API
             */
            api: this.api,
            /**
             * The Amazon API Gateway REST API stage
             */
            stage: this.stage,
            /**
             * The CloudWatch LogGroup for the access logs.
             */
            logGroup: this.logGroup,
            /**
             * The API Gateway REST API domain name.
             */
            get domainName() {
                if (!self.deployed)
                    throw new VisibleError(`"nodes.domainName" is not available before the "${self.constructorName}" API is deployed.`);
                if (!self.apigDomain)
                    throw new VisibleError(`"nodes.domainName" is not available when domain is not configured for the "${self.constructorName}" API.`);
                return self.apigDomain;
            },
        };
    }
    /**
     * Add a route to the API Gateway REST API. The route is a combination of an HTTP method and a path, `{METHOD} /{path}`.
     *
     * A method could be one of `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, or `ANY`. Here `ANY` matches any HTTP method.
     *
     * The path can be a combination of
     * - Literal segments, `/notes`, `/notes/new`, etc.
     * - Parameter segments, `/notes/{noteId}`, `/notes/{noteId}/attachments/{attachmentId}`, etc.
     * - Greedy segments, `/{proxy+}`, `/notes/{proxy+}`,  etc. The `{proxy+}` segment is a greedy segment that matches all child paths. It needs to be at the end of the path.
     *
     * :::tip
     * The `{proxy+}` is a greedy segment, it matches all its child paths.
     * :::
     *
     * When a request comes in, the API Gateway will look for the most specific match.
     *
     * :::note
     * You cannot have duplicate routes.
     * :::
     *
     * @param route The path for the route.
     * @param handler The function that'll be invoked.
     * @param args Configure the route.
     *
     * @example
     * Add a simple route.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /", "src/get.handler");
     * ```
     *
     * Match any HTTP method.
     *
     * ```js title="sst.config.ts"
     * api.route("ANY /", "src/route.handler");
     * ```
     *
     * Add a default or fallback route. Here for every request other than `GET /hi`,
     * the `default.handler` function will be invoked.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /hi", "src/get.handler");
     *
     * api.route("ANY /", "src/default.handler");
     * api.route("ANY /{proxy+}", "src/default.handler");
     * ```
     *
     * The `/{proxy+}` matches any path that starts with `/`, so if you want a
     * fallback route for the root `/` path, you need to add a `ANY /` route as well.
     *
     * Add a parameterized route.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /notes/{id}", "src/get.handler");
     * ```
     *
     * Add a greedy route.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /notes/{proxy+}", "src/greedy.handler");
     * ```
     *
     * Enable auth for a route.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /", "src/get.handler")
     * api.route("POST /", "src/post.handler", {
     *   auth: {
     *     iam: true
     *   }
     * });
     * ```
     *
     * Customize the route handler.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /", {
     *   handler: "src/get.handler",
     *   memory: "2048 MB"
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /", "arn:aws:lambda:us-east-1:123456789012:function:my-function");
     * ```
     */
    route(route, handler, args = {}) {
        const { method, path } = this.parseRoute(route);
        this.createResource(path);
        const transformed = transform(this.constructorArgs.transform?.route?.args, this.buildRouteId(method, path), args, { provider: this.constructorOpts.provider });
        const apigRoute = new ApiGatewayV1LambdaRoute(transformed[0], {
            api: {
                name: this.constructorName,
                id: this.api.id,
                executionArn: this.api.executionArn,
            },
            method,
            path,
            resourceId: this.resources[path],
            handler,
            handlerTransform: this.constructorArgs.transform?.route?.handler,
            ...transformed[1],
        }, transformed[2]);
        this.routes.push(apigRoute);
        return apigRoute;
    }
    /**
     * Add a custom integration to the API Gateway REST API. [Learn more about
     * integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-integration-settings.html).
     *
     * @param route The path for the route.
     * @param integration The integration configuration.
     * @param args Configure the route.
     *
     * @example
     * Add a route to trigger a Step Function state machine execution.
     *
     * ```js title="sst.config.ts"
     * api.routeIntegration("POST /run-my-state-machine", {
     *   type: "aws",
     *   uri: "arn:aws:apigateway:us-east-1:states:startExecution",
     *   credentials: "arn:aws:iam::123456789012:role/apigateway-execution-role",
     *   integrationHttpMethod: "POST",
     *   requestTemplates: {
     *     "application/json": JSON.stringify({
     *       input: "$input.json('$')",
     *       stateMachineArn: "arn:aws:states:us-east-1:123456789012:stateMachine:MyStateMachine"
     *     })
     *   },
     *   passthroughBehavior: "when-no-match"
     * });
     * ```
     */
    routeIntegration(route, integration, args = {}) {
        const { method, path } = this.parseRoute(route);
        this.createResource(path);
        const transformed = transform(this.constructorArgs.transform?.route?.args, this.buildRouteId(method, path), args, { provider: this.constructorOpts.provider });
        const apigRoute = new ApiGatewayV1IntegrationRoute(transformed[0], {
            api: {
                name: this.constructorName,
                id: this.api.id,
                executionArn: this.api.executionArn,
            },
            method,
            path,
            resourceId: this.resources[path],
            integration,
            ...transformed[1],
        }, transformed[2]);
        this.routes.push(apigRoute);
        return apigRoute;
    }
    parseRoute(route) {
        const parts = route.split(" ");
        if (parts.length !== 2) {
            throw new VisibleError(`Invalid route ${route}. A route must be in the format "METHOD /path".`);
        }
        const [methodRaw, path] = route.split(" ");
        const method = methodRaw.toUpperCase();
        if (![
            "ANY",
            "DELETE",
            "GET",
            "HEAD",
            "OPTIONS",
            "PATCH",
            "POST",
            "PUT",
        ].includes(method))
            throw new VisibleError(`Invalid method ${methodRaw} in route ${route}`);
        if (!path.startsWith("/"))
            throw new VisibleError(`Invalid path ${path} in route ${route}. Path must start with "/".`);
        return { method, path };
    }
    buildRouteId(method, path) {
        const suffix = logicalName(hashStringToPrettyString([outputId, method, path].join(""), 6));
        return `${this.constructorName}Route${suffix}`;
    }
    createResource(path) {
        const pathParts = path.replace(/^\//, "").split("/");
        for (let i = 0, l = pathParts.length; i < l; i++) {
            const parentPath = "/" + pathParts.slice(0, i).join("/");
            const subPath = "/" + pathParts.slice(0, i + 1).join("/");
            if (!this.resources[subPath]) {
                const suffix = logicalName(hashStringToPrettyString([this.api.id, subPath].join(""), 6));
                const resource = new apigateway.Resource(`${this.constructorName}Resource${suffix}`, {
                    restApi: this.api.id,
                    parentId: parentPath === "/"
                        ? this.api.rootResourceId
                        : this.resources[parentPath],
                    pathPart: pathParts[i],
                }, { parent: this });
                this.resources[subPath] = resource.id;
            }
        }
    }
    /**
     * Add an authorizer to the API Gateway REST API.
     *
     * @param args Configure the authorizer.
     * @example
     * For example, add a Lambda token authorizer.
     *
     * ```js title="sst.config.ts"
     * api.addAuthorizer({
     *   name: "myAuthorizer",
     *   tokenFunction: "src/authorizer.index"
     * });
     * ```
     *
     * Add a Lambda REQUEST authorizer.
     *
     * ```js title="sst.config.ts"
     * api.addAuthorizer({
     *   name: "myAuthorizer",
     *   requestFunction: "src/authorizer.index"
     * });
     * ```
     *
     * Add a Cognito User Pool authorizer.
     *
     * ```js title="sst.config.ts"
     * const userPool = new aws.cognito.UserPool();
     *
     * api.addAuthorizer({
     *   name: "myAuthorizer",
     *   userPools: [userPool.arn]
     * });
     * ```
     *
     * You can also customize the authorizer.
     *
     * ```js title="sst.config.ts"
     * api.addAuthorizer({
     *   name: "myAuthorizer",
     *   tokenFunction: "src/authorizer.index",
     *   ttl: 30
     * });
     * ```
     */
    addAuthorizer(args) {
        const self = this;
        const selfName = this.constructorName;
        const nameSuffix = logicalName(args.name);
        return new ApiGatewayV1Authorizer(`${selfName}Authorizer${nameSuffix}`, {
            api: {
                id: self.api.id,
                name: selfName,
                executionArn: self.api.executionArn,
            },
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
    /**
     * Add a usage plan to the API Gateway REST API.
     *
     * @param name The name of the usage plan.
     * @param args Configure the usage plan.
     * @example
     *
     * To add a usage plan to an API, you need to enable the API key for a route, and
     * then deploy the API.
     *
     * ```ts title="sst.config.ts" {4}
     * const api = new sst.aws.ApiGatewayV1("MyApi");
     *
     * api.route("GET /", "src/get.handler", {
     *   apiKey: true
     * });
     *
     * api.deploy();
     * ```
     *
     * Then define your usage plan.
     *
     * ```js title="sst.config.ts"
     * const plan = api.addUsagePlan("MyPlan", {
     *   throttle: {
     *     rate: 100,
     *     burst: 200
     *   },
     *   quota: {
     *     limit: 1000,
     *     period: "month",
     *     offset: 0
     *   }
     * });
     * ```
     *
     * And create the API key for the plan.
     *
     * ```js title="sst.config.ts"
     * const key = plan.addApiKey("MyKey");
     * ```
     *
     * You can now link the API and API key to other resources, like a function.
     *
     * ```ts title="sst.config.ts"
     * new sst.aws.Function("MyFunction", {
     *   handler: "src/lambda.handler",
     *   link: [api, key]
     * });
     * ```
     *
     * Once linked, include the key in the `x-api-key` header with your requests.
     *
     * ```ts title="src/lambda.ts"
     * import { Resource } from "sst";
     *
     * await fetch(Resource.MyApi.url, {
     *   headers: {
     *     "x-api-key": Resource.MyKey.value
     *   }
     * });
     * ```
     */
    addUsagePlan(name, args) {
        if (!this.stage)
            throw new VisibleError(`Cannot add a usage plan to the "${this.constructorName}" API before it's deployed. Make sure to call deploy() to deploy the API first.`);
        return new ApiGatewayV1UsagePlan(name, {
            apiId: this.api.id,
            apiStage: this.stage.stageName,
            ...args,
        }, { provider: this.constructorOpts.provider });
    }
    /**
     * Creates a deployment for the API Gateway REST API.
     *
     * :::caution
     * Your routes won't be added if `deploy` isn't called.
     * :::
     *
     * Your routes won't be added if this isn't called after you've added them. This
     * is due to a quirk in the way API Gateway V1 is created internally.
     */
    deploy() {
        const name = this.constructorName;
        const args = this.constructorArgs;
        const parent = this;
        const api = this.api;
        const routes = this.routes;
        const region = this.region;
        const endpointType = this.endpointType;
        const accessLog = normalizeAccessLog();
        const domain = normalizeDomain();
        const corsRoutes = createCorsRoutes();
        const corsResponses = createCorsResponses();
        const deployment = createDeployment();
        const logGroup = createLogGroup();
        const stage = createStage();
        const certificateArn = createSsl();
        const apigDomain = createDomainName();
        createDnsRecords();
        const apiMapping = createDomainMapping();
        this.deployed = true;
        this.logGroup = logGroup;
        this.stage = stage;
        this.apigDomain = apigDomain;
        this.apiMapping = apiMapping;
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
        function createCorsRoutes() {
            const resourceIds = routes.map((route) => route.nodes.integration.resourceId);
            return all([args.cors, resourceIds]).apply(([cors, resourceIds]) => {
                if (cors === false)
                    return [];
                // filter unique resource ids
                const uniqueResourceIds = [...new Set(resourceIds)];
                // create cors integrations for the paths
                return uniqueResourceIds.map((resourceId) => {
                    const method = new apigateway.Method(`${name}CorsMethod${resourceId}`, {
                        restApi: api.id,
                        resourceId,
                        httpMethod: "OPTIONS",
                        authorization: "NONE",
                    }, { parent });
                    const methodResponse = new apigateway.MethodResponse(`${name}CorsMethodResponse${resourceId}`, {
                        restApi: api.id,
                        resourceId,
                        httpMethod: method.httpMethod,
                        statusCode: "204",
                        responseParameters: {
                            "method.response.header.Access-Control-Allow-Headers": true,
                            "method.response.header.Access-Control-Allow-Methods": true,
                            "method.response.header.Access-Control-Allow-Origin": true,
                        },
                    }, { parent });
                    const integration = new apigateway.Integration(`${name}CorsIntegration${resourceId}`, {
                        restApi: api.id,
                        resourceId,
                        httpMethod: method.httpMethod,
                        type: "MOCK",
                        requestTemplates: {
                            "application/json": "{ statusCode: 200 }",
                        },
                    }, { parent });
                    const integrationResponse = new apigateway.IntegrationResponse(`${name}CorsIntegrationResponse${resourceId}`, {
                        restApi: api.id,
                        resourceId,
                        httpMethod: method.httpMethod,
                        statusCode: methodResponse.statusCode,
                        responseParameters: {
                            "method.response.header.Access-Control-Allow-Headers": "'*'",
                            "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                            "method.response.header.Access-Control-Allow-Origin": "'*'",
                        },
                    }, { parent, dependsOn: [integration] });
                    return { method, methodResponse, integration, integrationResponse };
                });
            });
        }
        function createCorsResponses() {
            return output(args.cors).apply((cors) => {
                if (cors === false)
                    return [];
                return ["4XX", "5XX"].map((type) => new apigateway.Response(`${name}Cors${type}Response`, {
                    restApiId: api.id,
                    responseType: `DEFAULT_${type}`,
                    responseParameters: {
                        "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
                        "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
                    },
                    responseTemplates: {
                        "application/json": '{"message":$context.error.messageString}',
                    },
                }, { parent }));
            });
        }
        function createDeployment() {
            const resources = all([corsRoutes, corsResponses]).apply(([corsRoutes, corsResponses]) => [
                api,
                corsRoutes.map((v) => Object.values(v)),
                corsResponses,
                routes.map((route) => [
                    route.nodes.integration,
                    route.nodes.method,
                ]),
            ].flat(3));
            // filter serializable output values
            const resourcesSanitized = all([resources]).apply(([resources]) => resources.map((resource) => Object.fromEntries(Object.entries(resource).filter(([k, v]) => !k.startsWith("_") && typeof v !== "function"))));
            return new apigateway.Deployment(...transform(args.transform?.deployment, `${name}Deployment`, {
                restApi: api.id,
                triggers: all([resourcesSanitized]).apply(([resources]) => Object.fromEntries(resources.map((resource) => [
                    resource.urn,
                    JSON.stringify(resource),
                ]))),
            }, { parent }));
        }
        function createLogGroup() {
            return new cloudwatch.LogGroup(...transform(args.transform?.accessLog, `${name}AccessLog`, {
                name: `/aws/vendedlogs/apis/${physicalName(64, name)}`,
                retentionInDays: accessLog.apply((accessLog) => RETENTION[accessLog.retention]),
            }, { parent, ignoreChanges: ["name"] }));
        }
        function createStage() {
            return new apigateway.Stage(...transform(args.transform?.stage, `${name}Stage`, {
                restApi: api.id,
                stageName: $app.stage,
                deployment: deployment.id,
                accessLogSettings: {
                    destinationArn: logGroup.arn,
                    format: JSON.stringify({
                        // request info
                        requestTime: `"$context.requestTime"`,
                        requestId: `"$context.requestId"`,
                        httpMethod: `"$context.httpMethod"`,
                        path: `"$context.path"`,
                        resourcePath: `"$context.resourcePath"`,
                        status: `$context.status`, // integer value, do not wrap in quotes
                        responseLatency: `$context.responseLatency`, // integer value, do not wrap in quotes
                        xrayTraceId: `"$context.xrayTraceId"`,
                        // integration info
                        functionResponseStatus: `"$context.integration.status"`,
                        integrationRequestId: `"$context.integration.requestId"`,
                        integrationLatency: `"$context.integration.latency"`,
                        integrationServiceStatus: `"$context.integration.integrationStatus"`,
                        // caller info
                        ip: `"$context.identity.sourceIp"`,
                        userAgent: `"$context.identity.userAgent"`,
                        principalId: `"$context.authorizer.principalId"`,
                    }),
                },
            }, { parent }));
        }
        function createSsl() {
            if (!domain)
                return;
            return all([domain, endpointType, region]).apply(([domain, endpointType, region]) => {
                if (domain.cert)
                    return output(domain.cert);
                if (domain.nameId)
                    return output(undefined);
                return new DnsValidatedCertificate(`${name}Ssl`, {
                    domainName: domain.name,
                    dns: domain.dns,
                }, {
                    parent,
                    provider: endpointType === "EDGE" && region !== "us-east-1"
                        ? useProvider("us-east-1")
                        : undefined,
                }).arn;
            });
        }
        function createDomainName() {
            if (!domain || !certificateArn)
                return;
            return all([domain, endpointType]).apply(([domain, endpointType]) => domain.nameId
                ? apigateway.DomainName.get(`${name}DomainName`, domain.nameId, {}, { parent })
                : new apigateway.DomainName(...transform(args.transform?.domainName, `${name}DomainName`, {
                    domainName: domain?.name,
                    endpointConfiguration: { types: endpointType },
                    ...(endpointType === "REGIONAL"
                        ? {
                            regionalCertificateArn: certificateArn,
                        }
                        : { certificateArn: certificateArn }),
                }, { parent })));
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
                    aliasName: endpointType.apply((v) => v === "EDGE"
                        ? apigDomain.cloudfrontDomainName
                        : apigDomain.regionalDomainName),
                    aliasZone: endpointType.apply((v) => v === "EDGE"
                        ? apigDomain.cloudfrontZoneId
                        : apigDomain.regionalZoneId),
                }, { parent });
            });
        }
        function createDomainMapping() {
            if (!domain || !apigDomain)
                return;
            return domain.path?.apply((path) => new apigateway.BasePathMapping(`${name}DomainMapping`, {
                restApi: api.id,
                domainName: apigDomain.id,
                stageName: stage.stageName,
                basePath: path,
            }, { parent }));
        }
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
const __pulumiType = "sst:aws:ApiGatewayV1";
// @ts-expect-error
ApiGatewayV1.__pulumiType = __pulumiType;
