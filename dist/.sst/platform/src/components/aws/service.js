import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component.js";
import { dns as awsDns } from "./dns.js";
import { VisibleError } from "../error.js";
import { DnsValidatedCertificate } from "./dns-validated-certificate.js";
import { URL_UNAVAILABLE } from "./linkable.js";
import { appautoscaling, ec2, ecs, getRegionOutput, lb, servicediscovery, } from "@pulumi/aws";
import { Vpc } from "./vpc.js";
import { DevCommand } from "../experimental/dev-command.js";
import { toSeconds } from "../duration.js";
import { createExecutionRole, createTaskDefinition, createTaskRole, normalizeArchitecture, normalizeContainers, normalizeCpu, normalizeMemory, normalizeStorage, } from "./fargate.js";
import { hashStringToPrettyString } from "../naming.js";
/**
 * The `Service` component lets you create containers that are always running, like web or
 * application servers. It uses [Amazon ECS](https://aws.amazon.com/ecs/) on [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html).
 *
 * @example
 *
 * #### Create a Service
 *
 * Services are run inside an ECS Cluster. If you haven't already, create one.
 *
 * ```ts title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const cluster = new sst.aws.Cluster("MyCluster", { vpc });
 * ```
 *
 * Add the service to it.
 *
 * ```ts title="sst.config.ts"
 * const service = new sst.aws.Service("MyService", { cluster });
 * ```
 *
 * #### Configure the container image
 *
 * By default, the service will look for a Dockerfile in the root directory. Optionally
 * configure the image context and dockerfile.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Service("MyService", {
 *   cluster,
 *   image: {
 *     context: "./app",
 *     dockerfile: "Dockerfile"
 *   }
 * });
 * ```
 *
 * To add multiple containers in the service, pass in an array of containers args.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Service("MyService", {
 *   cluster,
 *   containers: [
 *     {
 *       name: "app",
 *       image: "nginxdemos/hello:plain-text"
 *     },
 *     {
 *       name: "admin",
 *       image: {
 *         context: "./admin",
 *         dockerfile: "Dockerfile"
 *       }
 *     }
 *   ]
 * });
 * ```
 *
 * This is useful for running sidecar containers.
 *
 * #### Enable auto-scaling
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Service("MyService", {
 *   cluster,
 *   scaling: {
 *     min: 4,
 *     max: 16,
 *     cpuUtilization: 50,
 *     memoryUtilization: 50
 *   }
 * });
 * ```
 *
 * #### Expose through API Gateway
 *
 * You can give your service a public URL by exposing it through API Gateway HTTP API. You can
 * also optionally give it a custom domain.
 *
 * ```ts title="sst.config.ts"
 * const service = new sst.aws.Service("MyService", {
 *   cluster,
 *   serviceRegistry: {
 *     port: 80
 *   }
 * });
 *
 * const api = new sst.aws.ApiGatewayV2("MyApi", {
 *   vpc,
 *   domain: "example.com"
 * });
 * api.routePrivate("$default", service.nodes.cloudmapService.arn);
 * ```
 *
 * #### Add a load balancer
 *
 * You can also expose your service by adding a load balancer to it and optionally
 * adding a custom domain.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Service("MyService", {
 *   cluster,
 *   loadBalancer: {
 *     domain: "example.com",
 *     rules: [
 *       { listen: "80/http" },
 *       { listen: "443/https", forward: "80/http" }
 *     ]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your service. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Service("MyService", {
 *   cluster,
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources in your service.
 *
 * ```ts title="app.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Service discovery
 *
 * This component automatically creates a Cloud Map service host name for the
 * service. So anything in the same VPC can access it using the service's host name.
 *
 * For example, if you link the service to a Lambda function that's in the same VPC.
 *
 * ```ts title="sst.config.ts" {2,4}
 * new sst.aws.Function("MyFunction", {
 *   vpc,
 *   url: true,
 *   link: [service],
 *   handler: "lambda.handler"
 * });
 * ```
 *
 * You can access the service by its host name using the [SDK](/docs/reference/sdk/).
 *
 * ```ts title="lambda.ts"
 * import { Resource } from "sst";
 *
 * await fetch(`http://${Resource.MyService.service}`);
 * ```
 *
 * [Check out an example](/docs/examples/#aws-cluster-service-discovery).
 *
 * ---
 *
 * ### Cost
 *
 * By default, this uses a _Linux/X86_ _Fargate_ container with 0.25 vCPUs at $0.04048 per
 * vCPU per hour and 0.5 GB of memory at $0.004445 per GB per hour. It includes 20GB of
 * _Ephemeral Storage_ for free with additional storage at $0.000111 per GB per hour. Each
 * container also gets a public IPv4 address at $0.005 per hour.
 *
 * It works out to $0.04048 x 0.25 x 24 x 30 + $0.004445 x 0.5 x 24 x 30 + $0.005
 * x 24 x 30 or **$12 per month**.
 *
 * If you are using all Fargate Spot instances with `capacity: "spot"`, it's $0.01218784 x 0.25
 * x 24 x 30 + $0.00133831 x 0.5 x 24 x 30 + $0.005 x 24 x 30 or **$6 per month**
 *
 * Adjust this for the `cpu`, `memory` and `storage` you are using. And
 * check the prices for _Linux/ARM_ if you are using `arm64` as your `architecture`.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [Fargate pricing](https://aws.amazon.com/fargate/pricing/) and the
 * [Public IPv4 Address pricing](https://aws.amazon.com/vpc/pricing/) for more details.
 *
 * #### Scaling
 *
 * By default, `scaling` is disabled. If enabled, adjust the above for the number of containers.
 *
 * #### API Gateway
 *
 * If you expose your service through API Gateway, you'll need to add the cost of
 * [API Gateway HTTP API](https://aws.amazon.com/api-gateway/pricing/#HTTP_APIs) as well.
 * For services that don't get a lot of traffic, this ends up being a lot cheaper since API
 * Gateway is pay per request.
 *
 * Learn more about using
 * [Cluster with API Gateway](/docs/examples/#aws-cluster-with-api-gateway).
 *
 * #### Application Load Balancer
 *
 * If you add `loadBalancer` _HTTP_ or _HTTPS_ `rules`, an ALB is created at $0.0225 per hour,
 * $0.008 per LCU-hour, and $0.005 per hour if HTTPS with a custom domain is used. Where LCU
 * is a measure of how much traffic is processed.
 *
 * That works out to $0.0225 x 24 x 30 or **$16 per month**. Add $0.005 x 24 x 30 or **$4 per
 * month** for HTTPS. Also add the LCU-hour used.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [Application Load Balancer pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
 * for more details.
 *
 * #### Network Load Balancer
 *
 * If you add `loadBalancer` _TCP_, _UDP_, or _TLS_ `rules`, an NLB is created at $0.0225 per hour and
 * $0.006 per NLCU-hour. Where NCLU is a measure of how much traffic is processed.
 *
 * That works out to $0.0225 x 24 x 30 or **$16 per month**. Also add the NLCU-hour used.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [Network Load Balancer pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
 * for more details.
 */
export class Service extends Component {
    constructor(name, args, opts = {}) {
        super(__pulumiType, name, args, opts);
        this._name = name;
        const self = this;
        const clusterArn = args.cluster.nodes.cluster.arn;
        const clusterName = args.cluster.nodes.cluster.name;
        const region = getRegionOutput({}, opts).name;
        const dev = normalizeDev();
        const wait = output(args.wait ?? false);
        const architecture = normalizeArchitecture(args);
        const cpu = normalizeCpu(args);
        const memory = normalizeMemory(cpu, args);
        const storage = normalizeStorage(args);
        const containers = normalizeContainers("service", args, name, architecture);
        const lbArgs = normalizeLoadBalancer();
        const scaling = normalizeScaling();
        const capacity = normalizeCapacity();
        const vpc = normalizeVpc();
        const taskRole = createTaskRole(name, args, opts, self, !!dev);
        this.dev = !!dev;
        this.cloudmapNamespace = vpc.cloudmapNamespaceName;
        this.taskRole = taskRole;
        if (dev) {
            this.devUrl = !lbArgs ? undefined : dev.url;
            registerReceiver();
            return;
        }
        const executionRole = createExecutionRole(name, args, opts, self);
        const taskDefinition = createTaskDefinition(name, args, opts, self, containers, architecture, cpu, memory, storage, taskRole, executionRole);
        const certificateArn = createSsl();
        const loadBalancer = createLoadBalancer();
        const targetGroups = createTargets();
        createListeners();
        const cloudmapService = createCloudmapService();
        const service = createService();
        const autoScalingTarget = createAutoScaling();
        createDnsRecords();
        this._service = service;
        this.cloudmapService = cloudmapService;
        this.executionRole = executionRole;
        this.taskDefinition = taskDefinition;
        this.loadBalancer = loadBalancer;
        this.autoScalingTarget = autoScalingTarget;
        this.domain = lbArgs?.domain
            ? lbArgs.domain.apply((domain) => domain?.name)
            : output(undefined);
        this._url = !self.loadBalancer
            ? undefined
            : all([self.domain, self.loadBalancer?.dnsName]).apply(([domain, loadBalancer]) => domain ? `https://${domain}/` : `http://${loadBalancer}`);
        this.registerOutputs({ _hint: this._url });
        registerReceiver();
        function normalizeDev() {
            if (!$dev)
                return undefined;
            if (args.dev === false)
                return undefined;
            return {
                url: output(args.dev?.url ?? URL_UNAVAILABLE),
            };
        }
        function normalizeVpc() {
            // "vpc" is a Vpc component
            if (args.cluster.vpc instanceof Vpc) {
                const vpc = args.cluster.vpc;
                return {
                    isSstVpc: true,
                    id: vpc.id,
                    loadBalancerSubnets: lbArgs?.pub.apply((v) => v ? vpc.publicSubnets : vpc.privateSubnets),
                    containerSubnets: vpc.publicSubnets,
                    securityGroups: vpc.securityGroups,
                    cloudmapNamespaceId: vpc.nodes.cloudmapNamespace.id,
                    cloudmapNamespaceName: vpc.nodes.cloudmapNamespace.name,
                };
            }
            // "vpc" is object
            return output(args.cluster.vpc).apply((vpc) => ({
                isSstVpc: false,
                ...vpc,
            }));
        }
        function normalizeScaling() {
            return all([lbArgs?.type, args.scaling]).apply(([type, v]) => {
                if (type !== "application" && v?.requestCount)
                    throw new VisibleError(`Request count scaling is only supported for http/https protocols.`);
                return {
                    min: v?.min ?? 1,
                    max: v?.max ?? 1,
                    cpuUtilization: v?.cpuUtilization ?? 70,
                    memoryUtilization: v?.memoryUtilization ?? 70,
                    requestCount: v?.requestCount ?? false,
                };
            });
        }
        function normalizeCapacity() {
            if (!args.capacity)
                return;
            return output(args.capacity).apply((v) => {
                if (v === "spot")
                    return { spot: { weight: 1 }, fargate: { weight: 0 } };
                return v;
            });
        }
        function normalizeLoadBalancer() {
            const loadBalancer = (args.loadBalancer ??
                args.public);
            if (!loadBalancer)
                return;
            // normalize rules
            const rules = all([loadBalancer, containers]).apply(([lb, containers]) => {
                // validate rules
                const lbRules = lb.rules ?? lb.ports;
                if (!lbRules || lbRules.length === 0)
                    throw new VisibleError(`You must provide the ports to expose via "loadBalancer.rules".`);
                // validate container defined when multiple containers exists
                if (containers.length > 1) {
                    lbRules.forEach((v) => {
                        if (!v.container)
                            throw new VisibleError(`You must provide a container name in "loadBalancer.rules" when there is more than one container.`);
                    });
                }
                // parse protocols and ports
                const rules = lbRules.map((v) => {
                    const listenParts = v.listen.split("/");
                    const listenPort = parseInt(listenParts[0]);
                    const listenProtocol = listenParts[1];
                    const listenConditions = v.conditions || v.path
                        ? {
                            path: v.conditions?.path ?? v.path,
                            query: v.conditions?.query,
                            header: v.conditions?.header,
                        }
                        : undefined;
                    if (protocolType(listenProtocol) === "network" && listenConditions)
                        throw new VisibleError(`Invalid rule conditions for listen protocol "${v.listen}". Only "http" protocols support conditions.`);
                    const redirectParts = v.redirect?.split("/");
                    const redirectPort = redirectParts && parseInt(redirectParts[0]);
                    const redirectProtocol = redirectParts && redirectParts[1];
                    if (redirectPort && redirectProtocol) {
                        if (protocolType(listenProtocol) !== protocolType(redirectProtocol))
                            throw new VisibleError(`The listen protocol "${v.listen}" must match the redirect protocol "${v.redirect}".`);
                        return {
                            type: "redirect",
                            listenPort,
                            listenProtocol,
                            listenConditions,
                            redirectPort,
                            redirectProtocol,
                        };
                    }
                    const forwardParts = v.forward ? v.forward.split("/") : listenParts;
                    const forwardPort = forwardParts && parseInt(forwardParts[0]);
                    const forwardProtocol = forwardParts && forwardParts[1];
                    if (protocolType(listenProtocol) !== protocolType(forwardProtocol))
                        throw new VisibleError(`The listen protocol "${v.listen}" must match the forward protocol "${v.forward}".`);
                    return {
                        type: "forward",
                        listenPort,
                        listenProtocol,
                        listenConditions,
                        forwardPort,
                        forwardProtocol,
                        container: v.container ?? containers[0].name,
                    };
                });
                // validate protocols are consistent
                const appProtocols = rules.filter((rule) => protocolType(rule.listenProtocol) === "application");
                if (appProtocols.length > 0 && appProtocols.length < rules.length)
                    throw new VisibleError(`Protocols must be either all http/https, or all tcp/udp/tcp_udp/tls.`);
                // validate certificate exists for https/tls protocol
                rules.forEach((rule) => {
                    if (["https", "tls"].includes(rule.listenProtocol) && !lb.domain) {
                        throw new VisibleError(`You must provide a custom domain for ${rule.listenProtocol.toUpperCase()} protocol.`);
                    }
                });
                return rules;
            });
            // normalize domain
            const domain = output(loadBalancer).apply((lb) => {
                if (!lb.domain)
                    return undefined;
                // normalize domain
                const domain = typeof lb.domain === "string" ? { name: lb.domain } : lb.domain;
                return {
                    name: domain.name,
                    aliases: domain.aliases ?? [],
                    dns: domain.dns === false ? undefined : domain.dns ?? awsDns(),
                    cert: domain.cert,
                };
            });
            // normalize type
            const type = output(rules).apply((rules) => rules[0].listenProtocol.startsWith("http") ? "application" : "network");
            // normalize public/private
            const pub = output(loadBalancer).apply((lb) => lb?.public ?? true);
            // normalize health check
            const health = all([type, rules, loadBalancer]).apply(([type, rules, lb]) => Object.fromEntries(Object.entries(lb?.health ?? {}).map(([k, v]) => {
                if (!rules.find((r) => `${r.forwardPort}/${r.forwardProtocol}` === k))
                    throw new VisibleError(`Cannot configure health check for "${k}". Make sure it is defined in "loadBalancer.ports".`);
                return [
                    k,
                    {
                        path: v.path ?? "/",
                        interval: v.interval ? toSeconds(v.interval) : 30,
                        timeout: v.timeout
                            ? toSeconds(v.timeout)
                            : type === "application"
                                ? 5
                                : 6,
                        healthyThreshold: v.healthyThreshold ?? 5,
                        unhealthyThreshold: v.unhealthyThreshold ?? 2,
                        matcher: v.successCodes ?? "200",
                    },
                ];
            })));
            return { type, rules, domain, pub, health };
        }
        function createLoadBalancer() {
            if (!lbArgs)
                return;
            const securityGroup = new ec2.SecurityGroup(...transform(args?.transform?.loadBalancerSecurityGroup, `${name}LoadBalancerSecurityGroup`, {
                description: "Managed by SST",
                vpcId: vpc.id,
                egress: [
                    {
                        fromPort: 0,
                        toPort: 0,
                        protocol: "-1",
                        cidrBlocks: ["0.0.0.0/0"],
                    },
                ],
                ingress: [
                    {
                        fromPort: 0,
                        toPort: 0,
                        protocol: "-1",
                        cidrBlocks: ["0.0.0.0/0"],
                    },
                ],
            }, { parent: self }));
            return new lb.LoadBalancer(...transform(args.transform?.loadBalancer, `${name}LoadBalancer`, {
                internal: lbArgs.pub.apply((v) => !v),
                loadBalancerType: lbArgs.type,
                subnets: vpc.loadBalancerSubnets,
                securityGroups: [securityGroup.id],
                enableCrossZoneLoadBalancing: true,
            }, { parent: self }));
        }
        function createTargets() {
            if (!loadBalancer || !lbArgs)
                return;
            return all([lbArgs.rules, lbArgs.health]).apply(([rules, health]) => {
                const targets = {};
                rules.forEach((r) => {
                    if (r.type !== "forward")
                        return;
                    const container = r.container;
                    const forwardProtocol = r.forwardProtocol.toUpperCase();
                    const forwardPort = r.forwardPort;
                    const targetId = `${container}${forwardProtocol}${forwardPort}`;
                    const target = targets[targetId] ??
                        new lb.TargetGroup(...transform(args.transform?.target, `${name}Target${targetId}`, {
                            // TargetGroup names allow for 32 chars, but an 8 letter suffix
                            // ie. "-1234567" is automatically added.
                            // - If we don't specify "name" or "namePrefix", we need to ensure
                            //   the component name is less than 24 chars. Hard to guarantee.
                            // - If we specify "name", we need to ensure the $app-$stage-$name
                            //   if less than 32 chars. Hard to guarantee.
                            // - Hence we will use "namePrefix".
                            namePrefix: forwardProtocol,
                            port: forwardPort,
                            protocol: forwardProtocol,
                            targetType: "ip",
                            vpcId: vpc.id,
                            healthCheck: health[`${r.forwardPort}/${r.forwardProtocol}`],
                        }, { parent: self }));
                    targets[targetId] = target;
                });
                return targets;
            });
        }
        function createListeners() {
            if (!lbArgs || !loadBalancer || !targetGroups)
                return;
            return all([lbArgs.rules, targetGroups, certificateArn]).apply(([rules, targets, cert]) => {
                // Group listeners by protocol and port
                // Because listeners with the same protocol and port but different path
                // are just rules of the same listener.
                const listenersById = {};
                rules.forEach((r) => {
                    const listenProtocol = r.listenProtocol.toUpperCase();
                    const listenPort = r.listenPort;
                    const listenerId = `${listenProtocol}${listenPort}`;
                    listenersById[listenerId] = listenersById[listenerId] ?? [];
                    listenersById[listenerId].push(r);
                });
                // Create listeners
                return Object.entries(listenersById).map(([listenerId, rules]) => {
                    const listenProtocol = rules[0].listenProtocol.toUpperCase();
                    const listenPort = rules[0].listenPort;
                    const defaultRule = rules.find((r) => !r.listenConditions);
                    const customRules = rules.filter((r) => r.listenConditions);
                    const buildActions = (r) => [
                        ...(!r
                            ? [
                                {
                                    type: "fixed-response",
                                    fixedResponse: {
                                        statusCode: "403",
                                        contentType: "text/plain",
                                        messageBody: "Forbidden",
                                    },
                                },
                            ]
                            : []),
                        ...(r?.type === "forward"
                            ? [
                                {
                                    type: "forward",
                                    targetGroupArn: targets[`${r.container}${r.forwardProtocol.toUpperCase()}${r.forwardPort}`].arn,
                                },
                            ]
                            : []),
                        ...(r?.type === "redirect"
                            ? [
                                {
                                    type: "redirect",
                                    redirect: {
                                        port: r.redirectPort.toString(),
                                        protocol: r.redirectProtocol.toUpperCase(),
                                        statusCode: "HTTP_301",
                                    },
                                },
                            ]
                            : []),
                    ];
                    const listener = new lb.Listener(...transform(args.transform?.listener, `${name}Listener${listenerId}`, {
                        loadBalancerArn: loadBalancer.arn,
                        port: listenPort,
                        protocol: listenProtocol,
                        certificateArn: ["HTTPS", "TLS"].includes(listenProtocol)
                            ? cert
                            : undefined,
                        defaultActions: buildActions(defaultRule),
                    }, { parent: self }));
                    customRules.forEach((r) => new lb.ListenerRule(`${name}Listener${listenerId}Rule${hashStringToPrettyString(JSON.stringify(r.listenConditions), 4)}`, {
                        listenerArn: listener.arn,
                        actions: buildActions(r),
                        conditions: [
                            {
                                pathPattern: r.listenConditions.path
                                    ? { values: [r.listenConditions.path] }
                                    : undefined,
                                queryStrings: r.listenConditions.query,
                                httpHeader: r.listenConditions.header
                                    ? {
                                        httpHeaderName: r.listenConditions.header.name,
                                        values: r.listenConditions.header.values,
                                    }
                                    : undefined,
                            },
                        ],
                    }, { parent: self }));
                    return listener;
                });
            });
        }
        function createSsl() {
            if (!lbArgs)
                return output(undefined);
            return lbArgs.domain.apply((domain) => {
                if (!domain)
                    return output(undefined);
                if (domain.cert)
                    return output(domain.cert);
                return new DnsValidatedCertificate(`${name}Ssl`, {
                    domainName: domain.name,
                    alternativeNames: domain.aliases,
                    dns: domain.dns,
                }, { parent: self }).arn;
            });
        }
        function createCloudmapService() {
            return output(vpc.cloudmapNamespaceId).apply((cloudmapNamespaceId) => {
                if (!cloudmapNamespaceId)
                    return;
                return new servicediscovery.Service(`${name}CloudmapService`, {
                    name: `${name}.${$app.stage}.${$app.name}`,
                    namespaceId: output(vpc.cloudmapNamespaceId).apply((id) => id),
                    forceDestroy: true,
                    dnsConfig: {
                        namespaceId: output(vpc.cloudmapNamespaceId).apply((id) => id),
                        dnsRecords: [
                            ...(args.serviceRegistry ? [{ ttl: 60, type: "SRV" }] : []),
                            { ttl: 60, type: "A" },
                        ],
                    },
                }, { parent: self });
            });
        }
        function createService() {
            return cloudmapService.apply((cloudmapService) => new ecs.Service(...transform(args.transform?.service, `${name}Service`, {
                name,
                cluster: clusterArn,
                taskDefinition: taskDefinition.arn,
                desiredCount: scaling.min,
                ...(capacity
                    ? {
                        // setting `forceNewDeployment` ensures that the service is not recreated
                        // when the capacity provider config changes.
                        forceNewDeployment: true,
                        capacityProviderStrategies: capacity.apply((v) => [
                            ...(v.fargate
                                ? [
                                    {
                                        capacityProvider: "FARGATE",
                                        base: v.fargate?.base,
                                        weight: v.fargate?.weight,
                                    },
                                ]
                                : []),
                            ...(v.spot
                                ? [
                                    {
                                        capacityProvider: "FARGATE_SPOT",
                                        base: v.spot?.base,
                                        weight: v.spot?.weight,
                                    },
                                ]
                                : []),
                        ]),
                    }
                    : // @deprecated do not use `launchType`, set `capacityProviderStrategies`
                        // to `[{ capacityProvider: "FARGATE", weight: 1 }]` instead
                        {
                            launchType: "FARGATE",
                        }),
                networkConfiguration: {
                    // If the vpc is an SST vpc, services are automatically deployed to the public
                    // subnets. So we need to assign a public IP for the service to be accessible.
                    assignPublicIp: vpc.isSstVpc,
                    subnets: vpc.containerSubnets,
                    securityGroups: vpc.securityGroups,
                },
                deploymentCircuitBreaker: {
                    enable: true,
                    rollback: true,
                },
                loadBalancers: lbArgs &&
                    all([lbArgs.rules, targetGroups]).apply(([rules, targets]) => Object.values(targets).map((target) => ({
                        targetGroupArn: target.arn,
                        containerName: target.port.apply((port) => rules.find((r) => r.forwardPort === port).container),
                        containerPort: target.port.apply((port) => port),
                    }))),
                enableExecuteCommand: true,
                serviceRegistries: cloudmapService && {
                    registryArn: cloudmapService.arn,
                    port: args.serviceRegistry
                        ? output(args.serviceRegistry).port
                        : undefined,
                },
                waitForSteadyState: wait,
            }, { parent: self })));
        }
        function createAutoScaling() {
            const target = new appautoscaling.Target(...transform(args.transform?.autoScalingTarget, `${name}AutoScalingTarget`, {
                serviceNamespace: "ecs",
                scalableDimension: "ecs:service:DesiredCount",
                resourceId: interpolate `service/${clusterName}/${service.name}`,
                maxCapacity: scaling.max,
                minCapacity: scaling.min,
            }, { parent: self }));
            output(scaling.cpuUtilization).apply((cpuUtilization) => {
                if (cpuUtilization === false)
                    return;
                new appautoscaling.Policy(`${name}AutoScalingCpuPolicy`, {
                    serviceNamespace: target.serviceNamespace,
                    scalableDimension: target.scalableDimension,
                    resourceId: target.resourceId,
                    policyType: "TargetTrackingScaling",
                    targetTrackingScalingPolicyConfiguration: {
                        predefinedMetricSpecification: {
                            predefinedMetricType: "ECSServiceAverageCPUUtilization",
                        },
                        targetValue: cpuUtilization,
                    },
                }, { parent: self });
            });
            output(scaling.memoryUtilization).apply((memoryUtilization) => {
                if (memoryUtilization === false)
                    return;
                new appautoscaling.Policy(`${name}AutoScalingMemoryPolicy`, {
                    serviceNamespace: target.serviceNamespace,
                    scalableDimension: target.scalableDimension,
                    resourceId: target.resourceId,
                    policyType: "TargetTrackingScaling",
                    targetTrackingScalingPolicyConfiguration: {
                        predefinedMetricSpecification: {
                            predefinedMetricType: "ECSServiceAverageMemoryUtilization",
                        },
                        targetValue: memoryUtilization,
                    },
                }, { parent: self });
            });
            all([scaling.requestCount, targetGroups]).apply(([requestCount, targetGroups]) => {
                if (requestCount === false)
                    return;
                if (!targetGroups)
                    return;
                const targetGroup = Object.values(targetGroups)[0];
                new appautoscaling.Policy(`${name}AutoScalingRequestCountPolicy`, {
                    serviceNamespace: target.serviceNamespace,
                    scalableDimension: target.scalableDimension,
                    resourceId: target.resourceId,
                    policyType: "TargetTrackingScaling",
                    targetTrackingScalingPolicyConfiguration: {
                        predefinedMetricSpecification: {
                            predefinedMetricType: "ALBRequestCountPerTarget",
                            resourceLabel: all([
                                loadBalancer?.arn,
                                targetGroup.arn,
                            ]).apply(([loadBalancerArn, targetGroupArn]) => {
                                // arn:...:loadbalancer/app/frank-MyServiceLoadBalan/005af2ad12da1e52
                                // => app/frank-MyServiceLoadBalan/005af2ad12da1e52
                                const lbPart = loadBalancerArn
                                    ?.split(":")
                                    .pop()
                                    ?.split("/")
                                    .slice(1)
                                    .join("/");
                                // arn:...:targetgroup/HTTP20250103004618450100000001/e0811b8cf3a60762
                                // => targetgroup/HTTP20250103004618450100000001
                                const tgPart = targetGroupArn?.split(":").pop();
                                return `${lbPart}/${tgPart}`;
                            }),
                        },
                        targetValue: requestCount,
                    },
                }, { parent: self });
            });
            return target;
        }
        function createDnsRecords() {
            if (!lbArgs)
                return;
            lbArgs.domain.apply((domain) => {
                if (!domain?.dns)
                    return;
                for (const recordName of [domain.name, ...domain.aliases]) {
                    const namePrefix = recordName === domain.name ? name : `${name}${recordName}`;
                    domain.dns.createAlias(namePrefix, {
                        name: recordName,
                        aliasName: loadBalancer.dnsName,
                        aliasZone: loadBalancer.zoneId,
                    }, { parent: self });
                }
            });
        }
        function registerReceiver() {
            all([containers]).apply(([val]) => {
                for (const container of val) {
                    const title = val.length == 1 ? name : `${name}${container.name}`;
                    new DevCommand(`${title}Dev`, {
                        link: args.link,
                        dev: {
                            title,
                            autostart: true,
                            directory: (() => {
                                if (!container.image)
                                    return "";
                                if (typeof container.image === "string")
                                    return "";
                                if (container.image.context)
                                    return container.image.context;
                                return "";
                            })(),
                            ...container.dev,
                        },
                        environment: {
                            ...container.environment,
                            AWS_REGION: region,
                        },
                        aws: {
                            role: taskRole.arn,
                        },
                    });
                }
            });
        }
    }
    /**
     * The URL of the service.
     *
     * If `public.domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated load balancer URL.
     */
    get url() {
        const errorMessage = "Cannot access the URL because no public ports are exposed.";
        if (this.dev) {
            if (!this.devUrl)
                throw new VisibleError(errorMessage);
            return this.devUrl;
        }
        if (!this._url)
            throw new VisibleError(errorMessage);
        return this._url;
    }
    /**
     * The name of the Cloud Map service. This is useful for service discovery.
     */
    get service() {
        return all([this.cloudmapNamespace, this.cloudmapService]).apply(([namespace, service]) => {
            if (!namespace)
                throw new VisibleError(`Cannot access the AWS Cloud Map service name for the "${this._name}" Service. Cloud Map is not configured for the cluster.`);
            return this.dev
                ? interpolate `dev.${namespace}`
                : interpolate `${service.name}.${namespace}`;
        });
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        const self = this;
        return {
            /**
             * The Amazon ECS Service.
             */
            get service() {
                if (self.dev)
                    throw new VisibleError("Cannot access `nodes.service` in dev mode.");
                return self._service;
            },
            /**
             * The Amazon ECS Execution Role.
             */
            executionRole: this.executionRole,
            /**
             * The Amazon ECS Task Role.
             */
            taskRole: this.taskRole,
            /**
             * The Amazon ECS Task Definition.
             */
            get taskDefinition() {
                if (self.dev)
                    throw new VisibleError("Cannot access `nodes.taskDefinition` in dev mode.");
                return self.taskDefinition;
            },
            /**
             * The Amazon Elastic Load Balancer.
             */
            get loadBalancer() {
                if (self.dev)
                    throw new VisibleError("Cannot access `nodes.loadBalancer` in dev mode.");
                if (!self.loadBalancer)
                    throw new VisibleError("Cannot access `nodes.loadBalancer` when no public ports are exposed.");
                return self.loadBalancer;
            },
            /**
             * The Amazon Application Auto Scaling target.
             */
            get autoScalingTarget() {
                if (self.dev)
                    throw new VisibleError("Cannot access `nodes.autoScalingTarget` in dev mode.");
                return self.autoScalingTarget;
            },
            /**
             * The Amazon Cloud Map service.
             */
            get cloudmapService() {
                console.log("NODES GETTER");
                if (self.dev)
                    throw new VisibleError("Cannot access `nodes.cloudmapService` in dev mode.");
                return output(self.cloudmapService).apply((service) => {
                    if (!service)
                        throw new VisibleError(`Cannot access "nodes.cloudmapService" for the "${self._name}" Service. Cloud Map is not configured for the cluster.`);
                    return service;
                });
            },
        };
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                url: this.dev ? this.devUrl : this._url,
                service: output(this.cloudmapNamespace).apply((namespace) => namespace ? this.service : undefined),
            },
        };
    }
}
function protocolType(protocol) {
    return ["http", "https"].includes(protocol)
        ? "application"
        : "network";
}
const __pulumiType = "sst:aws:Service";
// @ts-expect-error
Service.__pulumiType = __pulumiType;
