import fs from "fs";
import path from "path";
import { all, output } from "@pulumi/pulumi";
import { Function } from "./function.js";
import { VisibleError } from "../error.js";
import { Queue } from "./queue.js";
import { dynamodb, getRegionOutput, lambda } from "@pulumi/aws";
import { isALteB } from "../../util/compare-semver.js";
import { SsrSite } from "./ssr-site.js";
const DEFAULT_OPEN_NEXT_VERSION = "3.6.5";
/**
 * The `Nextjs` component lets you deploy [Next.js](https://nextjs.org) apps on AWS. It uses
 * [OpenNext](https://open-next.js.org) to build your Next.js app, and transforms the build
 * output to a format that can be deployed to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy the Next.js app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys a Next.js app in the `my-next-app/` directory.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   path: "my-next-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Next.js app.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Next.js app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Next.js app.
 *
 * ```ts title="app/page.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class Nextjs extends SsrSite {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
    }
    normalizeBuildCommand(args) {
        return all([args?.buildCommand, args?.openNextVersion]).apply(([buildCommand, openNextVersion]) => {
            if (buildCommand)
                return buildCommand;
            const version = openNextVersion ?? DEFAULT_OPEN_NEXT_VERSION;
            const packageName = isALteB(version, "3.1.3")
                ? "open-next"
                : "@opennextjs/aws";
            return `npx --yes ${packageName}@${version} build`;
        });
    }
    buildPlan(outputPath, name, args, { bucket }) {
        const parent = this;
        const ret = all([outputPath, args?.imageOptimization]).apply(([outputPath, imageOptimization]) => {
            const { openNextOutput, buildId, prerenderManifest, base } = loadBuildOutput();
            if (Object.entries(openNextOutput.edgeFunctions).length) {
                throw new VisibleError(`Lambda@Edge runtime is deprecated. Update your OpenNext configuration to use the standard Lambda runtime and deploy to multiple regions using the "regions" option in your Nextjs component.`);
            }
            const { revalidationQueue, revalidationFunction } = createRevalidationQueue();
            const revalidationTable = createRevalidationTable();
            createRevalidationTableSeeder();
            const serverOrigin = openNextOutput.origins["default"];
            const imageOptimizerOrigin = openNextOutput.origins["imageOptimizer"];
            const s3Origin = openNextOutput.origins["s3"];
            const plan = all([
                revalidationTable?.arn,
                revalidationTable?.name,
                bucket.arn,
                bucket.name,
                getRegionOutput(undefined, { parent: bucket }).name,
                revalidationQueue?.arn,
                revalidationQueue?.url,
                getRegionOutput(undefined, { parent: revalidationQueue }).name,
            ]).apply(([tableArn, tableName, bucketArn, bucketName, bucketRegion, queueArn, queueUrl, queueRegion,]) => ({
                base,
                server: {
                    description: `${name} server`,
                    bundle: path.join(outputPath, serverOrigin.bundle),
                    handler: serverOrigin.handler,
                    streaming: serverOrigin.streaming,
                    runtime: "nodejs20.x",
                    environment: {
                        CACHE_BUCKET_NAME: bucketName,
                        CACHE_BUCKET_KEY_PREFIX: "_cache",
                        CACHE_BUCKET_REGION: bucketRegion,
                        ...(queueUrl && {
                            REVALIDATION_QUEUE_URL: queueUrl,
                            REVALIDATION_QUEUE_REGION: queueRegion,
                        }),
                        ...(tableName && {
                            CACHE_DYNAMO_TABLE: tableName,
                        }),
                    },
                    permissions: [
                        // access to the cache data
                        {
                            actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                            resources: [`${bucketArn}/*`],
                        },
                        {
                            actions: ["s3:ListBucket"],
                            resources: [bucketArn],
                        },
                        ...(queueArn
                            ? [
                                {
                                    actions: [
                                        "sqs:SendMessage",
                                        "sqs:GetQueueAttributes",
                                        "sqs:GetQueueUrl",
                                    ],
                                    resources: [queueArn],
                                },
                            ]
                            : []),
                        ...(tableArn
                            ? [
                                {
                                    actions: [
                                        "dynamodb:BatchGetItem",
                                        "dynamodb:GetRecords",
                                        "dynamodb:GetShardIterator",
                                        "dynamodb:Query",
                                        "dynamodb:GetItem",
                                        "dynamodb:Scan",
                                        "dynamodb:ConditionCheckItem",
                                        "dynamodb:BatchWriteItem",
                                        "dynamodb:PutItem",
                                        "dynamodb:UpdateItem",
                                        "dynamodb:DeleteItem",
                                        "dynamodb:DescribeTable",
                                    ],
                                    resources: [tableArn, `${tableArn}/*`],
                                },
                            ]
                            : []),
                    ],
                    injections: [
                        [
                            `outer:if (process.env.SST_KEY_FILE) {`,
                            `  const { readFileSync } = await import("fs")`,
                            `  const { createDecipheriv } = await import("crypto")`,
                            `  const key = Buffer.from(process.env.SST_KEY, "base64");`,
                            `  const encryptedData = readFileSync(process.env.SST_KEY_FILE);`,
                            `  const nonce = Buffer.alloc(12, 0);`,
                            `  const decipher = createDecipheriv("aes-256-gcm", key, nonce);`,
                            `  const authTag = encryptedData.slice(-16);`,
                            `  const actualCiphertext = encryptedData.slice(0, -16);`,
                            `  decipher.setAuthTag(authTag);`,
                            `  let decrypted = decipher.update(actualCiphertext);`,
                            `  decrypted = Buffer.concat([decrypted, decipher.final()]);`,
                            `  const decryptedData = JSON.parse(decrypted.toString());`,
                            `  globalThis.SST_KEY_FILE_DATA = decryptedData;`,
                            `}`,
                        ].join("\n"),
                    ],
                },
                imageOptimizer: {
                    prefix: "/_next/image",
                    function: {
                        description: `${name} image optimizer`,
                        handler: imageOptimizerOrigin.handler,
                        bundle: path.join(outputPath, imageOptimizerOrigin.bundle),
                        runtime: "nodejs20.x",
                        architecture: "arm64",
                        environment: {
                            BUCKET_NAME: bucketName,
                            BUCKET_KEY_PREFIX: "_assets",
                            ...(imageOptimization?.staticEtag
                                ? { OPENNEXT_STATIC_ETAG: "true" }
                                : {}),
                        },
                        memory: imageOptimization?.memory ?? "1536 MB",
                    },
                },
                assets: [
                    {
                        from: ".open-next/assets",
                        to: "_assets",
                        cached: true,
                        versionedSubDir: "_next",
                        deepRoute: "_next",
                    },
                ],
                isrCache: {
                    from: ".open-next/cache",
                    to: "_cache",
                },
                buildId,
            }));
            return {
                plan,
                revalidationQueue,
                revalidationTable,
                revalidationFunction,
            };
            function loadBuildOutput() {
                const openNextOutputPath = path.join(outputPath, ".open-next", "open-next.output.json");
                if (!fs.existsSync(openNextOutputPath)) {
                    throw new VisibleError(`Could not load OpenNext output file at "${openNextOutputPath}". Make sure your Next.js app was built correctly with OpenNext.`);
                }
                const content = fs.readFileSync(openNextOutputPath).toString();
                const json = JSON.parse(content);
                // Currently open-next.output.json's initializationFunction value
                // is wrong, it is set to ".open-next/initialization-function"
                if (json.additionalProps?.initializationFunction) {
                    json.additionalProps.initializationFunction = {
                        handler: "index.handler",
                        bundle: ".open-next/dynamodb-provider",
                    };
                }
                return {
                    openNextOutput: json,
                    base: loadBasePath(),
                    buildId: loadBuildId(),
                    prerenderManifest: loadPrerenderManifest(),
                };
            }
            function loadBuildId() {
                try {
                    return fs
                        .readFileSync(path.join(outputPath, ".next/BUILD_ID"))
                        .toString();
                }
                catch (e) {
                    console.error(e);
                    throw new VisibleError(`Build ID not found in ".next/BUILD_ID" for site "${name}". Ensure your Next.js app was built successfully.`);
                }
            }
            function loadBasePath() {
                try {
                    const content = fs.readFileSync(path.join(outputPath, ".next", "routes-manifest.json"), "utf-8");
                    const json = JSON.parse(content);
                    return json.basePath === "" ? undefined : json.basePath;
                }
                catch (e) {
                    console.error(e);
                    throw new VisibleError(`Base path configuration not found in ".next/routes-manifest.json" for site "${name}". Check your Next.js configuration.`);
                }
            }
            function loadPrerenderManifest() {
                try {
                    const content = fs
                        .readFileSync(path.join(outputPath, ".next/prerender-manifest.json"))
                        .toString();
                    return JSON.parse(content);
                }
                catch (e) {
                    console.debug("Failed to load prerender-manifest.json", e);
                }
            }
            function createRevalidationQueue() {
                if (openNextOutput.additionalProps?.disableIncrementalCache)
                    return {};
                const revalidationFunction = openNextOutput.additionalProps?.revalidationFunction;
                if (!revalidationFunction)
                    return {};
                const queue = new Queue(`${name}RevalidationEvents`, {
                    fifo: true,
                    transform: {
                        queue: (args) => {
                            args.receiveWaitTimeSeconds = 20;
                        },
                    },
                }, { parent });
                const subscriber = queue.subscribe({
                    description: `${name} ISR revalidator`,
                    handler: revalidationFunction.handler,
                    bundle: path.join(outputPath, revalidationFunction.bundle),
                    runtime: "nodejs20.x",
                    timeout: "30 seconds",
                    permissions: [
                        {
                            actions: [
                                "sqs:ChangeMessageVisibility",
                                "sqs:DeleteMessage",
                                "sqs:GetQueueAttributes",
                                "sqs:GetQueueUrl",
                                "sqs:ReceiveMessage",
                            ],
                            resources: [queue.arn],
                        },
                    ],
                    dev: false,
                    _skipMetadata: true,
                }, {
                    transform: {
                        eventSourceMapping: (args) => {
                            args.batchSize = 5;
                        },
                    },
                }, { parent });
                return {
                    revalidationQueue: queue,
                    revalidationFunction: subscriber.nodes.function,
                };
            }
            function createRevalidationTable() {
                if (openNextOutput.additionalProps?.disableTagCache)
                    return;
                return new dynamodb.Table(`${name}RevalidationTable`, {
                    attributes: [
                        { name: "tag", type: "S" },
                        { name: "path", type: "S" },
                        { name: "revalidatedAt", type: "N" },
                    ],
                    hashKey: "tag",
                    rangeKey: "path",
                    pointInTimeRecovery: {
                        enabled: true,
                    },
                    billingMode: "PAY_PER_REQUEST",
                    globalSecondaryIndexes: [
                        {
                            name: "revalidate",
                            hashKey: "path",
                            rangeKey: "revalidatedAt",
                            projectionType: "ALL",
                        },
                    ],
                }, { parent, retainOnDelete: false });
            }
            function createRevalidationTableSeeder() {
                if (openNextOutput.additionalProps?.disableTagCache)
                    return;
                if (!openNextOutput.additionalProps?.initializationFunction)
                    return;
                // Provision 128MB of memory for every 4,000 prerendered routes,
                // 1GB per 40,000, up to 10GB. This tends to use ~70% of the memory
                // provisioned when testing.
                const prerenderedRouteCount = Object.keys(prerenderManifest?.routes ?? {}).length;
                const seedFn = new Function(`${name}RevalidationSeeder`, {
                    description: `${name} ISR revalidation data seeder`,
                    handler: openNextOutput.additionalProps.initializationFunction.handler,
                    bundle: path.join(outputPath, openNextOutput.additionalProps.initializationFunction.bundle),
                    runtime: "nodejs20.x",
                    timeout: "900 seconds",
                    memory: `${Math.min(10240, Math.max(128, Math.ceil(prerenderedRouteCount / 4000) * 128))} MB`,
                    permissions: [
                        {
                            actions: [
                                "dynamodb:BatchWriteItem",
                                "dynamodb:PutItem",
                                "dynamodb:DescribeTable",
                            ],
                            resources: [revalidationTable.arn],
                        },
                    ],
                    environment: {
                        CACHE_DYNAMO_TABLE: revalidationTable.name,
                    },
                    dev: false,
                    _skipMetadata: true,
                    _skipHint: true,
                }, { parent });
                new lambda.Invocation(`${name}RevalidationSeed`, {
                    functionName: seedFn.nodes.function.name,
                    triggers: {
                        version: Date.now().toString(),
                    },
                    input: JSON.stringify({
                        RequestType: "Create",
                    }),
                }, { parent });
            }
        });
        this.revalidationQueue = ret.revalidationQueue;
        this.revalidationTable = ret.revalidationTable;
        this.revalidationFunction = output(ret.revalidationFunction);
        return ret.plan;
    }
    /**
     * The URL of the Next.js app.
     *
     * If the `domain` is set, this is the URL with the custom domain.
     * Otherwise, it's the auto-generated CloudFront URL.
     */
    get url() {
        return super.url;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            ...super.nodes,
            /**
             * The Amazon SQS queue that triggers the ISR revalidator.
             */
            revalidationQueue: this.revalidationQueue,
            /**
             * The Amazon DynamoDB table that stores the ISR revalidation data.
             */
            revalidationTable: this.revalidationTable,
            /**
             * The Lambda function that processes the ISR revalidation.
             */
            revalidationFunction: this.revalidationFunction,
        };
    }
}
const __pulumiType = "sst:aws:Nextjs";
// @ts-expect-error
Nextjs.__pulumiType = __pulumiType;
