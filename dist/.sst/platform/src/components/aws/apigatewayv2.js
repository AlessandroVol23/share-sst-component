import { all, output } from "@pulumi/pulumi";
import { Component, outputId, transform, } from "../component";
import { hashStringToPrettyString, physicalName, logicalName } from "../naming";
import { VisibleError } from "../error";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { RETENTION } from "./logging";
import { dns as awsDns } from "./dns";
import { ApiGatewayV2LambdaRoute } from "./apigatewayv2-lambda-route";
import { ApiGatewayV2Authorizer } from "./apigatewayv2-authorizer";
import { apigatewayv2, cloudwatch } from "@pulumi/aws";
import { ApiGatewayV2UrlRoute } from "./apigatewayv2-url-route";
import { toSeconds, } from "../duration";
import { ApiGatewayV2PrivateRoute } from "./apigatewayv2-private-route";
import { Vpc } from "./vpc";
/**
 * The `ApiGatewayV2` component lets you add an [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) to your app.
 *
 * @example
 *
 * #### Create the API
 *
 * ```ts title="sst.config.ts"
 * const api = new sst.aws.ApiGatewayV2("MyApi");
 * ```
 *
 * #### Add a custom domain
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.ApiGatewayV2("MyApi", {
 *   domain: "api.example.com"
 * });
 * ```
 *
 * #### Add routes
 *
 * ```ts title="sst.config.ts"
 * api.route("GET /", "src/get.handler");
 * api.route("POST /", "src/post.handler");
 * ```
 *
 * #### Configure the routes
 *
 * You can configure the route.
 *
 * ```ts title="sst.config.ts"
 * api.route("GET /", "src/get.handler", {
 *   auth: { iam: true }
 * });
 * ```
 *
 * #### Configure the route handler
 *
 * You can configure the route handler function.
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
 * You can use the `transform` to set some default props for all your routes. For example,
 * instead of setting the `memory` for each route.
 *
 * ```ts title="sst.config.ts"
 * api.route("GET /", { handler: "src/get.handler", memory: "2048 MB" });
 * api.route("POST /", { handler: "src/post.handler", memory: "2048 MB" });
 * ```
 *
 * You can set it through the `transform`.
 *
 * ```ts title="sst.config.ts" {6}
 * const api = new sst.aws.ApiGatewayV2("MyApi", {
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
export class ApiGatewayV2 extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const accessLog = normalizeAccessLog();
        const domain = normalizeDomain();
        const cors = normalizeCors();
        const vpc = normalizeVpc();
        const vpcLink = createVpcLink();
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
        this.apigDomain = apigDomain;
        this.apiMapping = apiMapping;
        this.logGroup = logGroup;
        this.vpcLink = vpcLink;
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
        function normalizeCors() {
            return output(args.cors).apply((cors) => {
                if (cors === false)
                    return {};
                const defaultCors = {
                    allowHeaders: ["*"],
                    allowMethods: ["*"],
                    allowOrigins: ["*"],
                };
                return cors === true || cors === undefined
                    ? defaultCors
                    : {
                        ...defaultCors,
                        ...cors,
                        maxAge: cors.maxAge && toSeconds(cors.maxAge),
                    };
            });
        }
        function normalizeVpc() {
            // "vpc" is undefined
            if (!args.vpc)
                return;
            // "vpc" is a Vpc component
            if (args.vpc instanceof Vpc) {
                return {
                    subnets: args.vpc.publicSubnets,
                    securityGroups: args.vpc.securityGroups,
                };
            }
            // "vpc" is object
            return output(args.vpc);
        }
        function createVpcLink() {
            if (!vpc)
                return;
            return new apigatewayv2.VpcLink(...transform(args.transform?.vpcLink, `${name}VpcLink`, {
                securityGroupIds: vpc.securityGroups,
                subnetIds: vpc.subnets,
            }, { parent }));
        }
        function createApi() {
            return new apigatewayv2.Api(...transform(args.transform?.api, `${name}Api`, {
                protocolType: "HTTP",
                corsConfiguration: cors,
            }, { parent }));
        }
        function createLogGroup() {
            return new cloudwatch.LogGroup(...transform(args.transform?.logGroup, `${name}AccessLog`, {
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
                        httpMethod: `"$context.httpMethod"`,
                        path: `"$context.path"`,
                        routeKey: `"$context.routeKey"`,
                        status: `$context.status`, // integer value, do not wrap in quotes
                        responseLatency: `$context.responseLatency`, // integer value, do not wrap in quotes
                        // integration info
                        integrationRequestId: `"$context.integration.requestId"`,
                        integrationStatus: `"$context.integration.status"`,
                        integrationLatency: `"$context.integration.latency"`,
                        integrationServiceStatus: `"$context.integration.integrationStatus"`,
                        // caller info
                        ip: `"$context.identity.sourceIp"`,
                        userAgent: `"$context.identity.userAgent"`,
                        //cognitoIdentityId:`"$context.identity.cognitoIdentityId"`, // not supported in us-west-2 region
                    }),
                },
            }, { parent }));
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
            return output(domain).apply((domain) => {
                return domain.nameId
                    ? apigatewayv2.DomainName.get(`${name}DomainName`, domain.nameId, {}, { parent })
                    : new apigatewayv2.DomainName(...transform(args.transform?.domainName, `${name}DomainName`, {
                        domainName: domain.name,
                        domainNameConfiguration: certificateArn.apply((certificateArn) => ({
                            certificateArn: certificateArn,
                            endpointType: "REGIONAL",
                            securityPolicy: "TLS_1_2",
                        })),
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
                stage: stage.name,
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
            ? all([this.apigDomain.domainName, this.apiMapping.apiMappingKey]).apply(([domain, key]) => key ? `https://${domain}/${key}/` : `https://${domain}`)
            : this.api.apiEndpoint;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        const self = this;
        return {
            /**
             * The Amazon API Gateway HTTP API.
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
            /**
             * The API Gateway HTTP API VPC link.
             */
            vpcLink: this.vpcLink,
        };
    }
    /**
     * Add a route to the API Gateway HTTP API. The route is a combination of
     * - An HTTP method and a path, `{METHOD} /{path}`.
     * - Or a `$default` route.
     *
     * :::tip
     * The `$default` route is a default or catch-all route. It'll match if no other route matches.
     * :::
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
     * The `$default` is a reserved keyword for the default route. It'll be matched
     * if no other route matches. When a request comes in, the API Gateway will look
     * for the most specific match. If no route matches, the `$default` route will
     * be invoked.
     *
     * :::note
     * You cannot have duplicate routes.
     * :::
     *
     * @param rawRoute The path for the route.
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
     * Add a default or fallback route. Here for every request other than `GET /`,
     * the `$default` route will be invoked.
     *
     * ```js title="sst.config.ts"
     * api.route("GET /", "src/get.handler");
     *
     * api.route("$default", "src/default.handler");
     * ```
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
    route(rawRoute, handler, args = {}) {
        const route = this.parseRoute(rawRoute);
        const transformed = transform(this.constructorArgs.transform?.route?.args, this.buildRouteId(route), args, { provider: this.constructorOpts.provider });
        return new ApiGatewayV2LambdaRoute(transformed[0], {
            api: {
                name: this.constructorName,
                id: this.api.id,
                executionArn: this.api.executionArn,
            },
            route,
            handler,
            handlerLink: this.constructorArgs.link,
            handlerTransform: this.constructorArgs.transform?.route?.handler,
            ...transformed[1],
        }, transformed[2]);
    }
    /**
     * Add a URL route to the API Gateway HTTP API.
     *
     * @param rawRoute The path for the route.
     * @param url The URL to forward to.
     * @param args Configure the route.
     *
     * @example
     * Add a simple route.
     *
     * ```js title="sst.config.ts"
     * api.routeUrl("GET /", "https://google.com");
     * ```
     *
     * Enable auth for a route.
     *
     * ```js title="sst.config.ts"
     * api.routeUrl("POST /", "https://google.com", {
     *   auth: {
     *     iam: true
     *   }
     * });
     * ```
     */
    routeUrl(rawRoute, url, args = {}) {
        const route = this.parseRoute(rawRoute);
        const transformed = transform(this.constructorArgs.transform?.route?.args, this.buildRouteId(route), args, { provider: this.constructorOpts.provider });
        return new ApiGatewayV2UrlRoute(transformed[0], {
            api: {
                name: this.constructorName,
                id: this.api.id,
                executionArn: this.api.executionArn,
            },
            route,
            url,
            ...transformed[1],
        }, transformed[2]);
    }
    /**
     * Adds a private route to the API Gateway HTTP API.
     *
     * To add private routes, you need to have a VPC link. Make sure to pass in a `vpc`.
     * Learn more about [adding private routes](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html).
     *
     * :::tip
     * You need to pass `vpc` to add a private route.
     * :::
     *
     * A couple of things to note:
     *
     * 1. Your API Gateway HTTP API also needs to be in the **same VPC** as the service.
     *
     * 2. You also need to verify that your VPC's [**availability zones support VPC link**](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html#http-api-vpc-link-availability).
     *
     * 3. Run `aws ec2 describe-availability-zones` to get a list of AZs for your
     *    account.
     *
     * 4. Only list the AZ ID's that support VPC link.
     *    ```ts title="sst.config.ts" {4}
     *    vpc: {
     *      az: ["eu-west-3a", "eu-west-3c"]
     *    }
     *    ```
     *    If the VPC picks an AZ automatically that doesn't support VPC link, you'll get
     *    the following error:
     *    ```
     *    operation error ApiGatewayV2: BadRequestException: Subnet is in Availability
     *    Zone 'euw3-az2' where service is not available
     *    ```
     *
     * @param rawRoute The path for the route.
     * @param arn The ARN of the AWS Load Balancer or Cloud Map service.
     * @param args Configure the route.
     *
     * @example
     * Here are a few examples using the private route. Add a route to Application Load Balancer.
     *
     * ```js title="sst.config.ts"
     * const loadBalancerArn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188";
     * api.routePrivate("GET /", loadBalancerArn);
     * ```
     *
     * Add a route to AWS Cloud Map service.
     *
     * ```js title="sst.config.ts"
     * const serviceArn = "arn:aws:servicediscovery:us-east-2:123456789012:service/srv-id?stage=prod&deployment=green_deployment";
     * api.routePrivate("GET /", serviceArn);
     * ```
     *
     * Enable IAM authentication for a route.
     *
     * ```js title="sst.config.ts"
     * api.routePrivate("GET /", serviceArn, {
     *   auth: {
     *     iam: true
     *   }
     * });
     * ```
     */
    routePrivate(rawRoute, arn, args = {}) {
        if (!this.vpcLink)
            throw new VisibleError(`To add private routes, you need to have a VPC link. Configure "vpc" for the "${this.constructorName}" API to create a VPC link.`);
        const route = this.parseRoute(rawRoute);
        const transformed = transform(this.constructorArgs.transform?.route?.args, this.buildRouteId(route), args, { provider: this.constructorOpts.provider });
        return new ApiGatewayV2PrivateRoute(transformed[0], {
            api: {
                name: this.constructorName,
                id: this.api.id,
                executionArn: this.api.executionArn,
            },
            route,
            vpcLink: this.vpcLink.id,
            arn,
            ...transformed[1],
        }, transformed[2]);
    }
    parseRoute(rawRoute) {
        if (rawRoute.toLowerCase() === "$default")
            return "$default";
        const parts = rawRoute.split(" ");
        if (parts.length !== 2) {
            throw new VisibleError(`Invalid route ${rawRoute}. A route must be in the format "METHOD /path".`);
        }
        const [methodRaw, path] = rawRoute.split(" ");
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
            throw new VisibleError(`Invalid method ${methodRaw} in route ${rawRoute}`);
        if (!path.startsWith("/"))
            throw new VisibleError(`Invalid path ${path} in route ${rawRoute}. Path must start with "/".`);
        return `${method} ${path}`;
    }
    buildRouteId(route) {
        const suffix = logicalName(hashStringToPrettyString([outputId, route].join(""), 6));
        return `${this.constructorName}Route${suffix}`;
    }
    /**
     * Add an authorizer to the API Gateway HTTP API.
     *
     * @param args Configure the authorizer.
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
    addAuthorizer(args) {
        const self = this;
        const selfName = this.constructorName;
        const nameSuffix = logicalName(args.name);
        return new ApiGatewayV2Authorizer(`${selfName}Authorizer${nameSuffix}`, {
            api: {
                id: self.api.id,
                name: selfName,
                executionArn: this.api.executionArn,
            },
            type: "http",
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
const __pulumiType = "sst:aws:ApiGatewayV2";
// @ts-expect-error
ApiGatewayV2.__pulumiType = __pulumiType;
