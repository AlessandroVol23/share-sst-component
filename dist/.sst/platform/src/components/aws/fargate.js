import fs from "fs";
import path from "path";
import { interpolate, secret } from "@pulumi/pulumi";
import { all, output } from "@pulumi/pulumi";
import { Efs } from "./efs";
import { RETENTION } from "./logging";
import { toGBs, toMBs } from "../size";
import { VisibleError } from "../error";
import { Platform } from "@pulumi/docker-build";
import { transform } from "../component";
import { cloudwatch, ecr, ecs, getCallerIdentityOutput, getPartitionOutput, getRegionOutput, iam, } from "@pulumi/aws";
import { Link } from "../link";
import { bootstrap } from "./helpers/bootstrap";
import { imageBuilder } from "./helpers/container-builder";
import { toNumber } from "../cpu";
import { toSeconds } from "../duration";
import { physicalName } from "../naming";
export const supportedCpus = {
    "0.25 vCPU": 256,
    "0.5 vCPU": 512,
    "1 vCPU": 1024,
    "2 vCPU": 2048,
    "4 vCPU": 4096,
    "8 vCPU": 8192,
    "16 vCPU": 16384,
};
export const supportedMemories = {
    "0.25 vCPU": {
        "0.5 GB": 512,
        "1 GB": 1024,
        "2 GB": 2048,
    },
    "0.5 vCPU": {
        "1 GB": 1024,
        "2 GB": 2048,
        "3 GB": 3072,
        "4 GB": 4096,
    },
    "1 vCPU": {
        "2 GB": 2048,
        "3 GB": 3072,
        "4 GB": 4096,
        "5 GB": 5120,
        "6 GB": 6144,
        "7 GB": 7168,
        "8 GB": 8192,
    },
    "2 vCPU": {
        "4 GB": 4096,
        "5 GB": 5120,
        "6 GB": 6144,
        "7 GB": 7168,
        "8 GB": 8192,
        "9 GB": 9216,
        "10 GB": 10240,
        "11 GB": 11264,
        "12 GB": 12288,
        "13 GB": 13312,
        "14 GB": 14336,
        "15 GB": 15360,
        "16 GB": 16384,
    },
    "4 vCPU": {
        "8 GB": 8192,
        "9 GB": 9216,
        "10 GB": 10240,
        "11 GB": 11264,
        "12 GB": 12288,
        "13 GB": 13312,
        "14 GB": 14336,
        "15 GB": 15360,
        "16 GB": 16384,
        "17 GB": 17408,
        "18 GB": 18432,
        "19 GB": 19456,
        "20 GB": 20480,
        "21 GB": 21504,
        "22 GB": 22528,
        "23 GB": 23552,
        "24 GB": 24576,
        "25 GB": 25600,
        "26 GB": 26624,
        "27 GB": 27648,
        "28 GB": 28672,
        "29 GB": 29696,
        "30 GB": 30720,
    },
    "8 vCPU": {
        "16 GB": 16384,
        "20 GB": 20480,
        "24 GB": 24576,
        "28 GB": 28672,
        "32 GB": 32768,
        "36 GB": 36864,
        "40 GB": 40960,
        "44 GB": 45056,
        "48 GB": 49152,
        "52 GB": 53248,
        "56 GB": 57344,
        "60 GB": 61440,
    },
    "16 vCPU": {
        "32 GB": 32768,
        "40 GB": 40960,
        "48 GB": 49152,
        "56 GB": 57344,
        "64 GB": 65536,
        "72 GB": 73728,
        "80 GB": 81920,
        "88 GB": 90112,
        "96 GB": 98304,
        "104 GB": 106496,
        "112 GB": 114688,
        "120 GB": 122880,
    },
};
export function normalizeArchitecture(args) {
    return output(args.architecture ?? "x86_64").apply((v) => v);
}
export function normalizeCpu(args) {
    return output(args.cpu ?? "0.25 vCPU").apply((v) => {
        if (!supportedCpus[v]) {
            throw new Error(`Unsupported CPU: ${v}. The supported values for CPU are ${Object.keys(supportedCpus).join(", ")}`);
        }
        return v;
    });
}
export function normalizeMemory(cpu, args) {
    return all([cpu, args.memory ?? "0.5 GB"]).apply(([cpu, v]) => {
        if (!(v in supportedMemories[cpu])) {
            throw new Error(`Unsupported memory: ${v}. The supported values for memory for a ${cpu} CPU are ${Object.keys(supportedMemories[cpu]).join(", ")}`);
        }
        return v;
    });
}
export function normalizeStorage(args) {
    return output(args.storage ?? "20 GB").apply((v) => {
        const storage = toGBs(v);
        if (storage < 20 || storage > 200)
            throw new Error(`Unsupported storage: ${v}. The supported value for storage is between "20 GB" and "200 GB"`);
        return v;
    });
}
export function normalizeContainers(type, args, name, architecture) {
    if (args.containers &&
        (args.image ||
            args.logging ||
            args.environment ||
            args.environmentFiles ||
            args.volumes ||
            args.health ||
            args.ssm)) {
        throw new VisibleError(type === "service"
            ? `You cannot provide both "containers" and "image", "logging", "environment", "environmentFiles", "volumes", "health" or "ssm".`
            : `You cannot provide both "containers" and "image", "logging", "environment", "environmentFiles", "volumes" or "ssm".`);
    }
    // Standardize containers
    const containers = args.containers ?? [
        {
            name: name,
            cpu: undefined,
            memory: undefined,
            image: args.image,
            logging: args.logging,
            environment: args.environment,
            environmentFiles: args.environmentFiles,
            ssm: args.ssm,
            volumes: args.volumes,
            command: args.command,
            entrypoint: args.entrypoint,
            health: type === "service" ? args.health : undefined,
            dev: type === "service" ? args.dev : undefined,
        },
    ];
    // Normalize container props
    return output(containers).apply((containers) => containers.map((v) => {
        return {
            ...v,
            volumes: normalizeVolumes(),
            image: normalizeImage(),
            logging: normalizeLogging(),
        };
        function normalizeVolumes() {
            return output(v.volumes).apply((volumes) => volumes?.map((volume) => ({
                path: volume.path,
                efs: volume.efs instanceof Efs
                    ? {
                        fileSystem: volume.efs.id,
                        accessPoint: volume.efs.accessPoint,
                    }
                    : volume.efs,
            })));
        }
        function normalizeImage() {
            return all([v.image, architecture]).apply(([image, architecture]) => {
                if (typeof image === "string")
                    return image;
                return {
                    ...image,
                    context: image?.context ?? ".",
                    platform: architecture === "arm64"
                        ? Platform.Linux_arm64
                        : Platform.Linux_amd64,
                };
            });
        }
        function normalizeLogging() {
            return all([v.logging, args.cluster.nodes.cluster.name]).apply(([logging, clusterName]) => ({
                ...logging,
                retention: logging?.retention ?? "1 month",
                name: logging?.name ??
                    // In the case of shared Cluster across stage, log group name can thrash
                    // if Task name is the same. Need to suffix the task name with random hash.
                    `/sst/cluster/${clusterName}/${physicalName(64, name)}/${v.name}`,
            }));
        }
    }));
}
export function createTaskRole(name, args, opts, parent, dev, additionalPermissions) {
    if (args.taskRole)
        return iam.Role.get(`${name}TaskRole`, args.taskRole, {}, { parent });
    const policy = all([
        args.permissions ?? [],
        Link.getInclude("aws.permission", args.link),
        additionalPermissions ?? [],
    ]).apply(([argsPermissions, linkPermissions, additionalPermissions]) => iam.getPolicyDocumentOutput({
        statements: [
            ...argsPermissions,
            ...linkPermissions,
            ...additionalPermissions,
            {
                actions: [
                    "ssmmessages:CreateControlChannel",
                    "ssmmessages:CreateDataChannel",
                    "ssmmessages:OpenControlChannel",
                    "ssmmessages:OpenDataChannel",
                ],
                resources: ["*"],
            },
        ].map((item) => ({
            effect: (() => {
                const effect = item.effect ?? "allow";
                return effect.charAt(0).toUpperCase() + effect.slice(1);
            })(),
            actions: item.actions,
            resources: item.resources,
        })),
    }));
    return new iam.Role(...transform(args.transform?.taskRole, `${name}TaskRole`, {
        assumeRolePolicy: iam.assumeRolePolicyForPrincipal({
            Service: "ecs-tasks.amazonaws.com",
            ...(dev ? { AWS: getCallerIdentityOutput({}, opts).accountId } : {}),
        }),
        inlinePolicies: policy.apply(({ statements }) => statements ? [{ name: "inline", policy: policy.json }] : []),
    }, { parent }));
}
export function createExecutionRole(name, args, opts, parent) {
    if (args.executionRole)
        return iam.Role.get(`${name}ExecutionRole`, args.executionRole, {}, { parent });
    return new iam.Role(...transform(args.transform?.executionRole, `${name}ExecutionRole`, {
        assumeRolePolicy: iam.assumeRolePolicyForPrincipal({
            Service: "ecs-tasks.amazonaws.com",
        }),
        managedPolicyArns: [
            interpolate `arn:${getPartitionOutput({}, opts).partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`,
        ],
        inlinePolicies: [
            {
                name: "inline",
                policy: iam.getPolicyDocumentOutput({
                    statements: [
                        {
                            sid: "ReadSsmAndSecrets",
                            actions: [
                                "ssm:GetParameters",
                                "ssm:GetParameter",
                                "ssm:GetParameterHistory",
                                "secretsmanager:GetSecretValue",
                            ],
                            resources: ["*"],
                        },
                        ...(args.environmentFiles
                            ? [
                                {
                                    sid: "ReadEnvironmentFiles",
                                    actions: ["s3:GetObject"],
                                    resources: args.environmentFiles,
                                },
                            ]
                            : []),
                    ],
                }).json,
            },
        ],
    }, { parent }));
}
export function createTaskDefinition(name, args, opts, parent, containers, architecture, cpu, memory, storage, taskRole, executionRole) {
    const clusterName = args.cluster.nodes.cluster.name;
    const region = getRegionOutput({}, opts).name;
    const bootstrapData = region.apply((region) => bootstrap.forRegion(region));
    const linkEnvs = Link.propertiesToEnv(Link.getProperties(args.link));
    const containerDefinitions = output(containers).apply((containers) => containers.map((container) => ({
        name: container.name,
        image: (() => {
            if (typeof container.image === "string")
                return output(container.image);
            const containerImage = container.image;
            const contextPath = path.join($cli.paths.root, container.image.context);
            const dockerfile = container.image.dockerfile ?? "Dockerfile";
            const dockerfilePath = path.join(contextPath, dockerfile);
            const dockerIgnorePath = fs.existsSync(path.join(contextPath, `${dockerfile}.dockerignore`))
                ? path.join(contextPath, `${dockerfile}.dockerignore`)
                : path.join(contextPath, ".dockerignore");
            // add .sst to .dockerignore if not exist
            const lines = fs.existsSync(dockerIgnorePath)
                ? fs.readFileSync(dockerIgnorePath).toString().split("\n")
                : [];
            if (!lines.find((line) => line === ".sst")) {
                fs.writeFileSync(dockerIgnorePath, [...lines, "", "# sst", ".sst"].join("\n"));
            }
            // Build image
            const image = imageBuilder(...transform(args.transform?.image, `${name}Image${container.name}`, {
                context: { location: contextPath },
                dockerfile: { location: dockerfilePath },
                buildArgs: containerImage.args,
                secrets: linkEnvs,
                target: container.image.target,
                platforms: [container.image.platform],
                tags: [container.name, ...(container.image.tags ?? [])].map((tag) => interpolate `${bootstrapData.assetEcrUrl}:${tag}`),
                registries: [
                    ecr
                        .getAuthorizationTokenOutput({
                        registryId: bootstrapData.assetEcrRegistryId,
                    }, { parent })
                        .apply((authToken) => ({
                        address: authToken.proxyEndpoint,
                        password: secret(authToken.password),
                        username: authToken.userName,
                    })),
                ],
                cacheFrom: [
                    {
                        registry: {
                            ref: interpolate `${bootstrapData.assetEcrUrl}:${container.name}-cache`,
                        },
                    },
                ],
                cacheTo: [
                    {
                        registry: {
                            ref: interpolate `${bootstrapData.assetEcrUrl}:${container.name}-cache`,
                            imageManifest: true,
                            ociMediaTypes: true,
                            mode: "max",
                        },
                    },
                ],
                push: true,
            }, { parent }));
            return interpolate `${bootstrapData.assetEcrUrl}@${image.digest}`;
        })(),
        cpu: container.cpu ? toNumber(container.cpu) : undefined,
        memory: container.memory ? toMBs(container.memory) : undefined,
        command: container.command,
        entrypoint: container.entrypoint,
        healthCheck: container.health && {
            command: container.health.command,
            startPeriod: toSeconds(container.health.startPeriod ?? "0 seconds"),
            timeout: toSeconds(container.health.timeout ?? "5 seconds"),
            interval: toSeconds(container.health.interval ?? "30 seconds"),
            retries: container.health.retries ?? 3,
        },
        pseudoTerminal: true,
        portMappings: [{ containerPortRange: "1-65535" }],
        logConfiguration: {
            logDriver: "awslogs",
            options: {
                "awslogs-group": (() => {
                    return new cloudwatch.LogGroup(...transform(args.transform?.logGroup, `${name}LogGroup${container.name}`, {
                        name: container.logging.name,
                        retentionInDays: RETENTION[container.logging.retention],
                    }, { parent, ignoreChanges: ["name"] }));
                })().name,
                "awslogs-region": region,
                "awslogs-stream-prefix": "/service",
            },
        },
        environment: linkEnvs.apply((linkEnvs) => Object.entries({
            ...container.environment,
            ...linkEnvs,
        }).map(([name, value]) => ({ name, value }))),
        environmentFiles: container.environmentFiles?.map((file) => ({
            type: "s3",
            value: file,
        })),
        linuxParameters: {
            initProcessEnabled: true,
        },
        mountPoints: container.volumes?.map((volume) => ({
            sourceVolume: volume.efs.accessPoint,
            containerPath: volume.path,
        })),
        secrets: Object.entries(container.ssm ?? {}).map(([name, valueFrom]) => ({
            name,
            valueFrom,
        })),
    })));
    return storage.apply((storage) => new ecs.TaskDefinition(...transform(args.transform?.taskDefinition, `${name}Task`, {
        family: interpolate `${clusterName}-${name}`,
        trackLatest: true,
        cpu: cpu.apply((v) => toNumber(v).toString()),
        memory: memory.apply((v) => toMBs(v).toString()),
        networkMode: "awsvpc",
        ephemeralStorage: (() => {
            const sizeInGib = toGBs(storage);
            return sizeInGib === 20 ? undefined : { sizeInGib };
        })(),
        requiresCompatibilities: ["FARGATE"],
        runtimePlatform: {
            cpuArchitecture: architecture.apply((v) => v.toUpperCase()),
            operatingSystemFamily: "LINUX",
        },
        executionRoleArn: executionRole.arn,
        taskRoleArn: taskRole.arn,
        volumes: output(containers).apply((containers) => {
            const uniqueAccessPoints = new Set();
            return containers.flatMap((container) => (container.volumes ?? []).flatMap((volume) => {
                if (uniqueAccessPoints.has(volume.efs.accessPoint))
                    return [];
                uniqueAccessPoints.add(volume.efs.accessPoint);
                return {
                    name: volume.efs.accessPoint,
                    efsVolumeConfiguration: {
                        fileSystemId: volume.efs.fileSystem,
                        transitEncryption: "ENABLED",
                        authorizationConfig: {
                            accessPointId: volume.efs.accessPoint,
                        },
                    },
                };
            }));
        }),
        containerDefinitions: $jsonStringify(containerDefinitions),
    }, { parent })));
}
