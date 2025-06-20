import { all, interpolate, output, } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { ec2, getAvailabilityZonesOutput, getPartitionOutput, iam, route53, servicediscovery, ssm, } from "@pulumi/aws";
import { Vpc as VpcV1 } from "./vpc-v1";
import { VisibleError } from "../error";
import { PrivateKey } from "@pulumi/tls";
/**
 * The `Vpc` component lets you add a VPC to your app. It uses [Amazon VPC](https://docs.aws.amazon.com/vpc/). This is useful for services like RDS and Fargate that need to be hosted inside
 * a VPC.
 *
 * This creates a VPC with 2 Availability Zones by default. It also creates the following
 * resources:
 *
 * 1. A default security group blocking all incoming internet traffic.
 * 2. A public subnet in each AZ.
 * 3. A private subnet in each AZ.
 * 4. An Internet Gateway. All the traffic from the public subnets are routed through it.
 * 5. If `nat` is enabled, a NAT Gateway or NAT instance in each AZ. All the traffic from
 *    the private subnets are routed to the NAT in the same AZ.
 *
 * :::note
 * By default, this does not create NAT Gateways or NAT instances.
 * :::
 *
 * @example
 *
 * #### Create a VPC
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Vpc("MyVPC");
 * ```
 *
 * #### Create it with 3 Availability Zones
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc("MyVPC", {
 *   az: 3
 * });
 * ```
 *
 * #### Enable NAT
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc("MyVPC", {
 *   nat: "managed"
 * });
 * ```
 *
 * ---
 *
 * ### Cost
 *
 * By default, this component is **free**. Following is the cost to enable the `nat` or `bastion`
 * options.
 *
 * #### Managed NAT
 *
 * If you enable `nat` with the `managed` option, it uses a _NAT Gateway_ per `az` at $0.045 per
 * hour, and $0.045 per GB processed per month.
 *
 * That works out to a minimum of $0.045 x 2 x 24 x 30 or **$65 per month**. Adjust this for the
 * number of `az` and add $0.045 per GB processed per month.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [NAT Gateway pricing](https://aws.amazon.com/vpc/pricing/) for more details. Standard [data
 * transfer charges](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer) apply.
 *
 * #### EC2 NAT
 *
 * If you enable `nat` with the `ec2` option, it uses `t4g.nano` EC2 _On Demand_ instances per
 * `az` at $0.0042 per hour, and $0.09 per GB processed per month for the first 10TB.
 *
 * That works out to a minimum of $0.0042 x 2 x 24 x 30 or **$6 per month**. Adjust this for the
 * `nat.ec2.instance` you are using and add $0.09 per GB processed per month.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [EC2 On-Demand pricing](https://aws.amazon.com/vpc/pricing/) and the
 * [EC2 Data Transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
 * for more details.
 *
 * #### Bastion
 *
 * If you enable `bastion`, it uses a single `t4g.nano` EC2 _On Demand_ instance at
 * $0.0042 per hour, and $0.09 per GB processed per month for the first 10TB.
 *
 * That works out to $0.0042 x 24 x 30 or **$3 per month**. Add $0.09 per GB processed per month.
 *
 * However if `nat: "ec2"` is enabled, one of the NAT EC2 instances will be reused; making this
 * **free**.
 *
 * The above are rough estimates for _us-east-1_, check out the
 * [EC2 On-Demand pricing](https://aws.amazon.com/vpc/pricing/) and the
 * [EC2 Data Transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
 * for more details.
 */
export class Vpc extends Component {
    constructor(name, args = {}, opts) {
        super(__pulumiType, name, args, opts);
        const _version = 2;
        const _refVersion = 2;
        const self = this;
        if (args && "ref" in args) {
            const ref = reference();
            this.vpc = ref.vpc;
            this.internetGateway = ref.internetGateway;
            this.securityGroup = ref.securityGroup;
            this._publicSubnets = output(ref.publicSubnets);
            this._privateSubnets = output(ref.privateSubnets);
            this.publicRouteTables = output(ref.publicRouteTables);
            this.privateRouteTables = output(ref.privateRouteTables);
            this.natGateways = output(ref.natGateways);
            this.natInstances = output(ref.natInstances);
            this.elasticIps = ref.elasticIps;
            this.bastionInstance = ref.bastionInstance;
            this.cloudmapNamespace = ref.cloudmapNamespace;
            this.privateKeyValue = output(ref.privateKeyValue);
            registerOutputs();
            return;
        }
        registerVersion();
        const zones = normalizeAz();
        const nat = normalizeNat();
        const partition = getPartitionOutput({}, opts).partition;
        const vpc = createVpc();
        const { keyPair, privateKeyValue } = createKeyPair();
        const internetGateway = createInternetGateway();
        const securityGroup = createSecurityGroup();
        const { publicSubnets, publicRouteTables } = createPublicSubnets();
        const elasticIps = createElasticIps();
        const natGateways = createNatGateways();
        const natInstances = createNatInstances();
        const { privateSubnets, privateRouteTables } = createPrivateSubnets();
        const bastionInstance = createBastion();
        const cloudmapNamespace = createCloudmapNamespace();
        this.vpc = vpc;
        this.internetGateway = internetGateway;
        this.securityGroup = securityGroup;
        this.natGateways = natGateways;
        this.natInstances = natInstances;
        this.elasticIps = elasticIps;
        this._publicSubnets = publicSubnets;
        this._privateSubnets = privateSubnets;
        this.publicRouteTables = publicRouteTables;
        this.privateRouteTables = privateRouteTables;
        this.bastionInstance = output(bastionInstance);
        this.cloudmapNamespace = cloudmapNamespace;
        this.privateKeyValue = output(privateKeyValue);
        registerOutputs();
        function reference() {
            const ref = args;
            const vpc = ec2.Vpc.get(`${name}Vpc`, ref.vpcId, undefined, {
                parent: self,
            });
            const vpcId = vpc.tags.apply((tags) => {
                registerVersion(tags?.["sst:component-version"]
                    ? parseInt(tags["sst:component-version"])
                    : undefined);
                if (tags?.["sst:ref-version"] !== _refVersion.toString()) {
                    throw new VisibleError([
                        `There have been some minor changes to the "Vpc" component that's being referenced by "${name}".\n`,
                        `To update, you'll need to redeploy the stage where the VPC was created. And then redeploy this stage.`,
                    ].join("\n"));
                }
                return output(ref.vpcId);
            });
            const internetGateway = ec2.InternetGateway.get(`${name}InstanceGateway`, ec2.getInternetGatewayOutput({
                filters: [{ name: "attachment.vpc-id", values: [vpcId] }],
            }, { parent: self }).internetGatewayId, undefined, { parent: self });
            const securityGroup = ec2.SecurityGroup.get(`${name}SecurityGroup`, ec2
                .getSecurityGroupsOutput({
                filters: [
                    { name: "group-name", values: ["default"] },
                    { name: "vpc-id", values: [vpcId] },
                ],
            }, { parent: self })
                .ids.apply((ids) => {
                if (!ids.length) {
                    throw new VisibleError(`Security group not found in VPC ${vpcId}`);
                }
                return ids[0];
            }), undefined, { parent: self });
            const privateSubnets = ec2
                .getSubnetsOutput({
                filters: [
                    { name: "vpc-id", values: [vpcId] },
                    { name: "tag:Name", values: ["*Private*"] },
                ],
            }, { parent: self })
                .ids.apply((ids) => ids.map((id, i) => ec2.Subnet.get(`${name}PrivateSubnet${i + 1}`, id, undefined, {
                parent: self,
            })));
            const privateRouteTables = privateSubnets.apply((subnets) => subnets.map((subnet, i) => ec2.RouteTable.get(`${name}PrivateRouteTable${i + 1}`, ec2.getRouteTableOutput({ subnetId: subnet.id }, { parent: self })
                .routeTableId, undefined, { parent: self })));
            const publicSubnets = ec2
                .getSubnetsOutput({
                filters: [
                    { name: "vpc-id", values: [vpcId] },
                    { name: "tag:Name", values: ["*Public*"] },
                ],
            }, { parent: self })
                .ids.apply((ids) => ids.map((id, i) => ec2.Subnet.get(`${name}PublicSubnet${i + 1}`, id, undefined, {
                parent: self,
            })));
            const publicRouteTables = publicSubnets.apply((subnets) => subnets.map((subnet, i) => ec2.RouteTable.get(`${name}PublicRouteTable${i + 1}`, ec2.getRouteTableOutput({ subnetId: subnet.id }, { parent: self })
                .routeTableId, undefined, { parent: self })));
            const natGateways = publicSubnets.apply((subnets) => {
                const natGatewayIds = subnets.map((subnet, i) => ec2
                    .getNatGatewaysOutput({
                    filters: [
                        { name: "subnet-id", values: [subnet.id] },
                        { name: "state", values: ["available"] },
                    ],
                }, { parent: self })
                    .ids.apply((ids) => ids[0]));
                return output(natGatewayIds).apply((ids) => ids
                    .filter((id) => id)
                    .map((id, i) => ec2.NatGateway.get(`${name}NatGateway${i + 1}`, id, undefined, {
                    parent: self,
                })));
            });
            const elasticIps = natGateways.apply((nats) => nats.map((nat, i) => ec2.Eip.get(`${name}ElasticIp${i + 1}`, nat.allocationId, undefined, { parent: self })));
            const natInstances = ec2
                .getInstancesOutput({
                filters: [
                    { name: "tag:sst:is-nat", values: ["true"] },
                    { name: "vpc-id", values: [vpcId] },
                ],
            }, { parent: self })
                .ids.apply((ids) => ids.map((id, i) => ec2.Instance.get(`${name}NatInstance${i + 1}`, id, undefined, {
                parent: self,
            })));
            const bastionInstance = ec2
                .getInstancesOutput({
                filters: [
                    { name: "tag:sst:is-bastion", values: ["true"] },
                    { name: "vpc-id", values: [vpcId] },
                ],
            }, { parent: self })
                .ids.apply((ids) => ids.length
                ? ec2.Instance.get(`${name}BastionInstance`, ids[0], undefined, {
                    parent: self,
                })
                : undefined);
            // Note: can also use servicediscovery.getDnsNamespaceOutput() here, ie.
            // ```ts
            // const namespaceId = servicediscovery.getDnsNamespaceOutput({
            //   name: "sst",
            //   type: "DNS_PRIVATE",
            // }).id;
            // ```
            // but if user deployed multiple VPCs into the same account. This will error because
            // there are multiple results. Even though `getDnsNamespaceOutput()` takes tags in args,
            // the tags are not used for lookup.
            const zone = output(vpcId).apply((vpcId) => route53.getZone({
                name: "sst",
                privateZone: true,
                vpcId,
            }, { parent: self }));
            const namespaceId = zone.linkedServiceDescription.apply((description) => {
                const match = description.match(/:namespace\/(ns-[a-z1-9]*)/)?.[1];
                if (!match) {
                    throw new VisibleError(`Cloud Map namespace not found for VPC ${vpcId}`);
                }
                return match;
            });
            const cloudmapNamespace = servicediscovery.PrivateDnsNamespace.get(`${name}CloudmapNamespace`, namespaceId, { vpc: vpcId }, { parent: self });
            const privateKeyValue = bastionInstance.apply((v) => {
                if (!v)
                    return;
                const param = ssm.Parameter.get(`${name}PrivateKeyValue`, interpolate `/sst/vpc/${vpcId}/private-key-value`, undefined, { parent: self });
                return param.value;
            });
            return {
                vpc,
                internetGateway,
                securityGroup,
                publicSubnets,
                publicRouteTables,
                privateSubnets,
                privateRouteTables,
                natGateways,
                natInstances,
                elasticIps,
                bastionInstance,
                cloudmapNamespace,
                privateKeyValue,
            };
        }
        function registerVersion(overrideVersion) {
            self.registerVersion({
                new: _version,
                old: overrideVersion ?? $cli.state.version[name],
                message: [
                    `There is a new version of "Vpc" that has breaking changes.`,
                    ``,
                    `To continue using the previous version, rename "Vpc" to "Vpc.v${$cli.state.version[name]}". Or recreate this component to update - https://sst.dev/docs/components/#versioning`,
                ].join("\n"),
            });
        }
        function registerOutputs() {
            self.registerOutputs({
                _tunnel: all([
                    self.bastionInstance,
                    self.privateKeyValue,
                    self._privateSubnets,
                    self._publicSubnets,
                ]).apply(([bastion, privateKeyValue, privateSubnets, publicSubnets]) => {
                    if (!bastion)
                        return;
                    return {
                        ip: bastion.publicIp,
                        username: "ec2-user",
                        privateKey: privateKeyValue,
                        subnets: [...privateSubnets, ...publicSubnets].map((s) => s.cidrBlock),
                    };
                }),
            });
        }
        function normalizeAz() {
            return output(args.az).apply((az) => {
                if (Array.isArray(az))
                    return output(az);
                const zones = getAvailabilityZonesOutput({
                    state: "available",
                }, { parent: self });
                return all([zones, args.az ?? 2]).apply(([zones, az]) => Array(az)
                    .fill(0)
                    .map((_, i) => zones.names[i]));
            });
        }
        function normalizeNat() {
            return all([args.nat, zones]).apply(([nat, zones]) => {
                if (nat === "managed") {
                    return { type: "managed" };
                }
                if (nat === "ec2") {
                    return {
                        type: "ec2",
                        ec2: { instance: "t4g.nano", ami: undefined },
                    };
                }
                if (nat) {
                    if (nat.ec2 && nat.type === "managed")
                        throw new VisibleError(`"nat.type" cannot be "managed" when "nat.ec2" is specified`);
                    if (!nat.type)
                        throw new VisibleError(`Missing "nat.type" for the "${name}" VPC. It is required when "nat.ec2" is not specified`);
                    if (nat.ip && nat.ip.length !== zones.length)
                        throw new VisibleError(`The number of Elastic IP allocation IDs must match the number of AZs.`);
                    return nat.ec2 || nat.type === "ec2"
                        ? {
                            type: "ec2",
                            ip: nat.ip,
                            ec2: nat.ec2 ?? { instance: "t4g.nano" },
                        }
                        : {
                            type: "managed",
                            ip: nat.ip,
                        };
                }
                return undefined;
            });
        }
        function createVpc() {
            return new ec2.Vpc(...transform(args.transform?.vpc, `${name}Vpc`, {
                cidrBlock: "10.0.0.0/16",
                enableDnsSupport: true,
                enableDnsHostnames: true,
                tags: {
                    Name: `${$app.name}-${$app.stage}-${name} VPC`,
                    "sst:component-version": _version.toString(),
                    "sst:ref-version": _refVersion.toString(),
                },
            }, { parent: self }));
        }
        function createKeyPair() {
            const ret = output(args.bastion).apply((bastion) => {
                if (!bastion)
                    return {};
                const tlsPrivateKey = new PrivateKey(`${name}TlsPrivateKey`, {
                    algorithm: "RSA",
                    rsaBits: 4096,
                }, { parent: self });
                new ssm.Parameter(`${name}PrivateKeyValue`, {
                    name: interpolate `/sst/vpc/${vpc.id}/private-key-value`,
                    description: "Bastion host private key",
                    type: ssm.ParameterType.SecureString,
                    value: tlsPrivateKey.privateKeyOpenssh,
                }, { parent: self });
                const keyPair = new ec2.KeyPair(`${name}KeyPair`, {
                    publicKey: tlsPrivateKey.publicKeyOpenssh,
                }, { parent: self });
                return { keyPair, privateKeyValue: tlsPrivateKey.privateKeyOpenssh };
            });
            return {
                keyPair: output(ret.keyPair),
                privateKeyValue: output(ret.privateKeyValue),
            };
        }
        function createInternetGateway() {
            return new ec2.InternetGateway(...transform(args.transform?.internetGateway, `${name}InternetGateway`, {
                vpcId: vpc.id,
            }, { parent: self }));
        }
        function createSecurityGroup() {
            return new ec2.DefaultSecurityGroup(...transform(args.transform?.securityGroup, `${name}SecurityGroup`, {
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
                        // Restricts inbound traffic to only within the VPC
                        cidrBlocks: [vpc.cidrBlock],
                    },
                ],
            }, { parent: self }));
        }
        function createElasticIps() {
            return all([nat, publicSubnets]).apply(([nat, subnets]) => {
                if (!nat)
                    return [];
                if (nat?.ip)
                    return [];
                return subnets.map((_, i) => new ec2.Eip(...transform(args.transform?.elasticIp, `${name}ElasticIp${i + 1}`, {
                    vpc: true,
                }, { parent: self })));
            });
        }
        function createNatGateways() {
            return all([nat, publicSubnets, elasticIps]).apply(([nat, subnets, elasticIps]) => {
                if (nat?.type !== "managed")
                    return [];
                return subnets.map((subnet, i) => new ec2.NatGateway(...transform(args.transform?.natGateway, `${name}NatGateway${i + 1}`, {
                    subnetId: subnet.id,
                    allocationId: elasticIps[i]?.id ?? nat.ip[i],
                }, { parent: self })));
            });
        }
        function createNatInstances() {
            return nat.apply((nat) => {
                if (nat?.type !== "ec2")
                    return output([]);
                const sg = new ec2.SecurityGroup(...transform(args.transform?.natSecurityGroup, `${name}NatInstanceSecurityGroup`, {
                    vpcId: vpc.id,
                    ingress: [
                        {
                            protocol: "-1",
                            fromPort: 0,
                            toPort: 0,
                            cidrBlocks: ["0.0.0.0/0"],
                        },
                    ],
                    egress: [
                        {
                            protocol: "-1",
                            fromPort: 0,
                            toPort: 0,
                            cidrBlocks: ["0.0.0.0/0"],
                        },
                    ],
                }, { parent: self }));
                const role = new iam.Role(`${name}NatInstanceRole`, {
                    assumeRolePolicy: iam.getPolicyDocumentOutput({
                        statements: [
                            {
                                actions: ["sts:AssumeRole"],
                                principals: [
                                    {
                                        type: "Service",
                                        identifiers: ["ec2.amazonaws.com"],
                                    },
                                ],
                            },
                        ],
                    }).json,
                    managedPolicyArns: [
                        interpolate `arn:${partition}:iam::aws:policy/AmazonSSMManagedInstanceCore`,
                    ],
                }, { parent: self });
                const instanceProfile = new iam.InstanceProfile(`${name}NatInstanceProfile`, { role: role.name }, { parent: self });
                const ami = nat.ec2.ami ??
                    ec2.getAmiOutput({
                        owners: ["568608671756"], // AWS account ID for fck-nat AMI
                        filters: [
                            {
                                name: "name",
                                // The AMI has the SSM agent pre-installed
                                values: ["fck-nat-al2023-*"],
                            },
                            {
                                name: "architecture",
                                values: ["arm64"],
                            },
                        ],
                        mostRecent: true,
                    }, { parent: self }).id;
                return all([
                    zones,
                    publicSubnets,
                    elasticIps,
                    keyPair,
                    args.bastion,
                ]).apply(([zones, publicSubnets, elasticIps, keyPair, bastion]) => zones.map((_, i) => {
                    const instance = new ec2.Instance(...transform(args.transform?.natInstance, `${name}NatInstance${i + 1}`, {
                        instanceType: nat.ec2.instance,
                        ami,
                        subnetId: publicSubnets[i].id,
                        vpcSecurityGroupIds: [sg.id],
                        iamInstanceProfile: instanceProfile.name,
                        sourceDestCheck: false,
                        keyName: keyPair?.keyName,
                        tags: {
                            Name: `${name} NAT Instance`,
                            "sst:is-nat": "true",
                            ...(bastion && i === 0 ? { "sst:is-bastion": "true" } : {}),
                        },
                    }, { parent: self }));
                    new ec2.EipAssociation(`${name}NatInstanceEipAssociation${i + 1}`, {
                        instanceId: instance.id,
                        allocationId: elasticIps[i]?.id ?? nat.ip[i],
                    });
                    return instance;
                }));
            });
        }
        function createPublicSubnets() {
            const ret = zones.apply((zones) => zones.map((zone, i) => {
                const subnet = new ec2.Subnet(...transform(args.transform?.publicSubnet, `${name}PublicSubnet${i + 1}`, {
                    vpcId: vpc.id,
                    cidrBlock: `10.0.${8 * i}.0/22`,
                    availabilityZone: zone,
                    mapPublicIpOnLaunch: true,
                }, { parent: self }));
                const routeTable = new ec2.RouteTable(...transform(args.transform?.publicRouteTable, `${name}PublicRouteTable${i + 1}`, {
                    vpcId: vpc.id,
                    routes: [
                        {
                            cidrBlock: "0.0.0.0/0",
                            gatewayId: internetGateway.id,
                        },
                    ],
                }, { parent: self }));
                new ec2.RouteTableAssociation(`${name}PublicRouteTableAssociation${i + 1}`, {
                    subnetId: subnet.id,
                    routeTableId: routeTable.id,
                }, { parent: self });
                return { subnet, routeTable };
            }));
            return {
                publicSubnets: ret.apply((ret) => ret.map((r) => r.subnet)),
                publicRouteTables: ret.apply((ret) => ret.map((r) => r.routeTable)),
            };
        }
        function createPrivateSubnets() {
            const ret = zones.apply((zones) => zones.map((zone, i) => {
                const subnet = new ec2.Subnet(...transform(args.transform?.privateSubnet, `${name}PrivateSubnet${i + 1}`, {
                    vpcId: vpc.id,
                    cidrBlock: `10.0.${8 * i + 4}.0/22`,
                    availabilityZone: zone,
                }, { parent: self }));
                const routeTable = new ec2.RouteTable(...transform(args.transform?.privateRouteTable, `${name}PrivateRouteTable${i + 1}`, {
                    vpcId: vpc.id,
                    routes: all([natGateways, natInstances]).apply(([natGateways, natInstances]) => [
                        ...(natGateways[i]
                            ? [
                                {
                                    cidrBlock: "0.0.0.0/0",
                                    natGatewayId: natGateways[i].id,
                                },
                            ]
                            : []),
                        ...(natInstances[i]
                            ? [
                                {
                                    cidrBlock: "0.0.0.0/0",
                                    networkInterfaceId: natInstances[i].primaryNetworkInterfaceId,
                                },
                            ]
                            : []),
                    ]),
                }, { parent: self }));
                new ec2.RouteTableAssociation(`${name}PrivateRouteTableAssociation${i + 1}`, {
                    subnetId: subnet.id,
                    routeTableId: routeTable.id,
                }, { parent: self });
                return { subnet, routeTable };
            }));
            return {
                privateSubnets: ret.apply((ret) => ret.map((r) => r.subnet)),
                privateRouteTables: ret.apply((ret) => ret.map((r) => r.routeTable)),
            };
        }
        function createBastion() {
            return all([args.bastion, natInstances, keyPair]).apply(([bastion, natInstances, keyPair]) => {
                if (!bastion)
                    return undefined;
                if (natInstances.length)
                    return natInstances[0];
                const sg = new ec2.SecurityGroup(...transform(args.transform?.bastionSecurityGroup, `${name}BastionSecurityGroup`, {
                    vpcId: vpc.id,
                    ingress: [
                        {
                            protocol: "tcp",
                            fromPort: 22,
                            toPort: 22,
                            cidrBlocks: ["0.0.0.0/0"],
                        },
                    ],
                    egress: [
                        {
                            protocol: "-1",
                            fromPort: 0,
                            toPort: 0,
                            cidrBlocks: ["0.0.0.0/0"],
                        },
                    ],
                }, { parent: self }));
                const role = new iam.Role(`${name}BastionRole`, {
                    assumeRolePolicy: iam.getPolicyDocumentOutput({
                        statements: [
                            {
                                actions: ["sts:AssumeRole"],
                                principals: [
                                    {
                                        type: "Service",
                                        identifiers: ["ec2.amazonaws.com"],
                                    },
                                ],
                            },
                        ],
                    }).json,
                    managedPolicyArns: [
                        interpolate `arn:${partition}:iam::aws:policy/AmazonSSMManagedInstanceCore`,
                    ],
                }, { parent: self });
                const instanceProfile = new iam.InstanceProfile(`${name}BastionProfile`, { role: role.name }, { parent: self });
                const ami = ec2.getAmiOutput({
                    owners: ["amazon"],
                    filters: [
                        {
                            name: "name",
                            // The AMI has the SSM agent pre-installed
                            values: ["al2023-ami-20*"],
                        },
                        {
                            name: "architecture",
                            values: ["arm64"],
                        },
                    ],
                    mostRecent: true,
                }, { parent: self });
                return new ec2.Instance(...transform(args.transform?.bastionInstance, `${name}BastionInstance`, {
                    instanceType: "t4g.nano",
                    ami: ami.id,
                    subnetId: publicSubnets.apply((v) => v[0].id),
                    vpcSecurityGroupIds: [sg.id],
                    iamInstanceProfile: instanceProfile.name,
                    keyName: keyPair?.keyName,
                    tags: {
                        "sst:is-bastion": "true",
                    },
                }, { parent: self }));
            });
        }
        function createCloudmapNamespace() {
            return new servicediscovery.PrivateDnsNamespace(`${name}CloudmapNamespace`, {
                name: "sst",
                vpc: vpc.id,
            }, { parent: self });
        }
    }
    /**
     * The VPC ID.
     */
    get id() {
        return this.vpc.id;
    }
    /**
     * A list of public subnet IDs in the VPC.
     */
    get publicSubnets() {
        return this._publicSubnets.apply((subnets) => subnets.map((subnet) => subnet.id));
    }
    /**
     * A list of private subnet IDs in the VPC.
     */
    get privateSubnets() {
        return this._privateSubnets.apply((subnets) => subnets.map((subnet) => subnet.id));
    }
    /**
     * A list of VPC security group IDs.
     */
    get securityGroups() {
        return output(this.securityGroup).apply((v) => [v.id]);
    }
    /**
     * The bastion instance ID.
     */
    get bastion() {
        return this.bastionInstance.apply((v) => {
            if (!v) {
                throw new VisibleError(`VPC bastion is not enabled. Enable it with "bastion: true".`);
            }
            return v.id;
        });
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon EC2 VPC.
             */
            vpc: this.vpc,
            /**
             * The Amazon EC2 Internet Gateway.
             */
            internetGateway: this.internetGateway,
            /**
             * The Amazon EC2 Security Group.
             */
            securityGroup: this.securityGroup,
            /**
             * The Amazon EC2 NAT Gateway.
             */
            natGateways: this.natGateways,
            /**
             * The Amazon EC2 NAT instances.
             */
            natInstances: this.natInstances,
            /**
             * The Amazon EC2 Elastic IP.
             */
            elasticIps: this.elasticIps,
            /**
             * The Amazon EC2 public subnet.
             */
            publicSubnets: this._publicSubnets,
            /**
             * The Amazon EC2 private subnet.
             */
            privateSubnets: this._privateSubnets,
            /**
             * The Amazon EC2 route table for the public subnet.
             */
            publicRouteTables: this.publicRouteTables,
            /**
             * The Amazon EC2 route table for the private subnet.
             */
            privateRouteTables: this.privateRouteTables,
            /**
             * The Amazon EC2 bastion instance.
             */
            bastionInstance: this.bastionInstance,
            /**
             * The AWS Cloudmap namespace.
             */
            cloudmapNamespace: this.cloudmapNamespace,
        };
    }
    /**
     * Reference an existing VPC with the given ID. This is useful when you
     * create a VPC in one stage and want to share it in another stage. It avoids having to
     * create a new VPC in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share VPCs across stages.
     * :::
     *
     * @param name The name of the component.
     * @param vpcId The ID of the existing VPC.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a VPC in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new VPC, you want to share the VPC from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const vpc = $app.stage === "frank"
     *   ? sst.aws.Vpc.get("MyVPC", "vpc-0be8fa4de860618bb")
     *   : new sst.aws.Vpc("MyVPC");
     * ```
     *
     * Here `vpc-0be8fa4de860618bb` is the ID of the VPC created in the `dev` stage.
     * You can find this by outputting the VPC ID in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return {
     *   vpc: vpc.id
     * };
     * ```
     */
    static get(name, vpcId, opts) {
        return new Vpc(name, {
            ref: true,
            vpcId,
        }, opts);
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                bastion: this.bastionInstance.apply((v) => v?.id),
            },
        };
    }
}
Vpc.v1 = VpcV1;
const __pulumiType = "sst:aws:Vpc";
// @ts-expect-error
Vpc.__pulumiType = __pulumiType;
