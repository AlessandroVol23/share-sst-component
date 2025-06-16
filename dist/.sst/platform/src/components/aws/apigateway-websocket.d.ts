import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Prettify, Transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs, FunctionArn } from "./function";
import { RETENTION } from "./logging";
import { ApiGatewayV2DomainArgs } from "./helpers/apigatewayv2-domain";
import { ApiGatewayV2Authorizer } from "./apigatewayv2-authorizer";
import { ApiGatewayWebSocketRoute } from "./apigateway-websocket-route";
import { apigatewayv2, cloudwatch } from "@pulumi/aws";
export interface ApiGatewayWebSocketArgs {
    /**
     * Set a custom domain for your WebSocket API.
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
    domain?: Input<string | Prettify<ApiGatewayV2DomainArgs>>;
    /**
     * Configure the [API Gateway logs](https://docs.aws.amazon.com/apigateway/latest/developerguide/view-cloudwatch-log-events-in-cloudwatch-console.html) in CloudWatch. By default, access logs are enabled and kept for 1 month.
     * @default `{retention: "1 month"}`
     * @example
     * ```js
     * {
     *   accessLog: {
     *     retention: "forever"
     *   }
     * }
     * ```
     */
    accessLog?: Input<{
        /**
         * The duration the API Gateway logs are kept in CloudWatch.
         * @default `1 month`
         */
        retention?: Input<keyof typeof RETENTION>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the API Gateway WebSocket API resource.
         */
        api?: Transform<apigatewayv2.ApiArgs>;
        /**
         * Transform the API Gateway WebSocket API stage resource.
         */
        stage?: Transform<apigatewayv2.StageArgs>;
        /**
         * Transform the API Gateway WebSocket API domain name resource.
         */
        domainName?: Transform<apigatewayv2.DomainNameArgs>;
        /**
         * Transform the CloudWatch LogGroup resource used for access logs.
         */
        accessLog?: Transform<cloudwatch.LogGroupArgs>;
        /**
         * Transform the routes. This can be used to customize the handler function and
         * the arguments for each route.
         *
         * @example
         * ```js
         * {
         *   transform: {
         *     route: {
         *       handler: {
         *         link: [bucket, stripeKey]
         *       },
         *       args: {
         *         auth: { iam: true }
         *       }
         *     }
         *   }
         * }
         * ```
         */
        route?: {
            /**
             * Transform the handler function for the route.
             */
            handler?: Transform<FunctionArgs>;
            /**
             * Transform the arguments for the route.
             */
            args?: Transform<ApiGatewayWebSocketRouteArgs>;
        };
    };
}
export interface ApiGatewayWebSocketAuthorizerArgs {
    /**
     * Create a JWT or JSON Web Token authorizer that can be used by the routes.
     *
     * @example
     * Configure JWT auth.
     *
     * ```js
     * {
     *   jwt: {
     *     issuer: "https://issuer.com/",
     *     audiences: ["https://api.example.com"],
     *     identitySource: "$request.header.AccessToken"
     *   }
     * }
     * ```
     *
     * You can also use Cognito as the identity provider.
     *
     * ```js
     * {
     *   jwt: {
     *     audiences: [userPoolClient.id],
     *     issuer: $interpolate`https://cognito-idp.${aws.getArnOutput(userPool).region}.amazonaws.com/${userPool.id}`,
     *   }
     * }
     * ```
     *
     * Where `userPool` and `userPoolClient` are:
     *
     * ```js
     * const userPool = new aws.cognito.UserPool();
     * const userPoolClient = new aws.cognito.UserPoolClient();
     * ```
     */
    jwt?: Input<{
        /**
         * Base domain of the identity provider that issues JSON Web Tokens.
         * @example
         * ```js
         * {
         *   issuer: "https://issuer.com/"
         * }
         * ```
         */
        issuer: Input<string>;
        /**
         * List of the intended recipients of the JWT. A valid JWT must provide an `aud` that matches at least one entry in this list.
         */
        audiences: Input<Input<string>[]>;
        /**
         * Specifies where to extract the JWT from the request.
         * @default `"route.request.header.Authorization"`
         */
        identitySource?: Input<string>;
    }>;
    /**
     * Create a Lambda authorizer that can be used by the routes.
     *
     * @example
     * Configure Lambda auth.
     *
     * ```js
     * {
     *   lambda: {
     *     function: "src/authorizer.index"
     *   }
     * }
     * ```
     */
    lambda?: Input<{
        /**
         * The Lambda authorizer function. Takes the handler path or the function args.
         * @example
         * Add a simple authorizer.
         *
         * ```js
         * {
         *   function: "src/authorizer.index"
         * }
         * ```
         *
         * Customize the authorizer handler.
         *
         * ```js
         * {
         *   function: {
         *     handler: "src/authorizer.index",
         *     memory: "2048 MB"
         *   }
         * }
         * ```
         */
        function: Input<string | FunctionArgs>;
        /**
         * The JWT payload version.
         * @default `"2.0"`
         * @example
         * ```js
         * {
         *   payload: "2.0"
         * }
         * ```
         */
        payload?: Input<"1.0" | "2.0">;
        /**
         * The response type.
         * @default `"simple"`
         * @example
         * ```js
         * {
         *   response: "iam"
         * }
         * ```
         */
        response?: Input<"simple" | "iam">;
        /**
         * Specifies where to extract the identity from.
         * @default `["route.request.header.Authorization"]`
         * @example
         * ```js
         * {
         *   identitySources: ["$request.header.RequestToken"]
         * }
         * ```
         */
        identitySources?: Input<Input<string>[]>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the API Gateway authorizer resource.
         */
        authorizer?: Transform<apigatewayv2.AuthorizerArgs>;
    };
}
export interface ApiGatewayWebSocketRouteArgs {
    /**
     * Enable auth for your WebSocket API. By default, auth is disabled.
     *
     * @example
     * ```js
     * {
     *   auth: {
     *     iam: true
     *   }
     * }
     * ```
     */
    auth?: Input<false | {
        /**
         * Enable IAM authorization for a given API route. When IAM auth is enabled, clients
         * need to use Signature Version 4 to sign their requests with their AWS credentials.
         */
        iam?: Input<boolean>;
        /**
         * Enable JWT or JSON Web Token authorization for a given API route. When JWT auth is enabled, clients need to include a valid JWT in their requests.
         *
         * @example
         * You can configure JWT auth.
         *
         * ```js
         * {
         *   auth: {
         *     jwt: {
         *       authorizer: myAuthorizer.id,
         *       scopes: ["read:profile", "write:profile"]
         *     }
         *   }
         * }
         * ```
         *
         * Where `myAuthorizer` is created by calling the `addAuthorizer` method.
         */
        jwt?: Input<{
            /**
             * Authorizer ID of the JWT authorizer.
             */
            authorizer: Input<string>;
            /**
             * Defines the permissions or access levels that the JWT grants. If the JWT does not have the required scope, the request is rejected. By default it does not require any scopes.
             */
            scopes?: Input<Input<string>[]>;
        }>;
        /**
         * Enable custom Lambda authorization for a given API route. Pass in the authorizer ID.
         *
         * @example
         * ```js
         * {
         *   auth: {
         *     lambda: myAuthorizer.id
         *   }
         * }
         * ```
         *
         * Where `myAuthorizer` is created by calling the `addAuthorizer` method.
         */
        lambda?: Input<string>;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the API Gateway WebSocket API integration resource.
         */
        integration?: Transform<apigatewayv2.IntegrationArgs>;
        /**
         * Transform the API Gateway WebSocket API route resource.
         */
        route?: Transform<apigatewayv2.RouteArgs>;
    };
}
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
export declare class ApiGatewayWebSocket extends Component implements Link.Linkable {
    private constructorName;
    private constructorArgs;
    private constructorOpts;
    private api;
    private stage;
    private apigDomain?;
    private apiMapping?;
    private logGroup;
    constructor(name: string, args?: ApiGatewayWebSocketArgs, opts?: ComponentResourceOptions);
    /**
     * The URL of the API.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated API Gateway URL.
     */
    get url(): Output<string>;
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
    get managementEndpoint(): Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Amazon API Gateway V2 API.
         */
        api: import("@pulumi/aws/apigatewayv2/api").Api;
        /**
         * The API Gateway HTTP API domain name.
         */
        readonly domainName: Output<import("@pulumi/aws/apigatewayv2/domainName").DomainName>;
        /**
         * The CloudWatch LogGroup for the access logs.
         */
        logGroup: import("@pulumi/aws/cloudwatch/logGroup").LogGroup;
    };
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
    route(route: string, handler: Input<string | FunctionArgs | FunctionArn>, args?: ApiGatewayWebSocketRouteArgs): ApiGatewayWebSocketRoute;
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
    addAuthorizer(name: string, args: ApiGatewayWebSocketAuthorizerArgs): ApiGatewayV2Authorizer;
    /** @internal */
    getSSTLink(): {
        properties: {
            url: Output<string>;
            managementEndpoint: Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
}
