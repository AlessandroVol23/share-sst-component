import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { FunctionArgs, FunctionArn } from "./function";
import { Input } from "../input.js";
import { cloudwatch } from "@pulumi/aws";
import { Task } from "./task";
export interface CronArgs {
    /**
     * The function that'll be executed when the cron job runs.
     * @deprecated Use `function` instead.
     *
     * @example
     *
     * ```ts
     * {
     *   job: "src/cron.handler"
     * }
     * ```
     *
     * You can pass in the full function props.
     *
     * ```ts
     * {
     *   job: {
     *     handler: "src/cron.handler",
     *     timeout: "60 seconds"
     *   }
     * }
     * ```
     *
     * You can also pass in a function ARN.
     *
     * ```ts
     * {
     *   job: "arn:aws:lambda:us-east-1:000000000000:function:my-sst-app-jayair-MyFunction",
     * }
     * ```
     */
    job?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * The function that'll be executed when the cron job runs.
     *
     * @example
     *
     * ```ts
     * {
     *   function: "src/cron.handler"
     * }
     * ```
     *
     * You can pass in the full function props.
     *
     * ```ts
     * {
     *   function: {
     *     handler: "src/cron.handler",
     *     timeout: "60 seconds"
     *   }
     * }
     * ```
     *
     * You can also pass in a function ARN.
     *
     * ```ts
     * {
     *   function: "arn:aws:lambda:us-east-1:000000000000:function:my-sst-app-jayair-MyFunction",
     * }
     * ```
     */
    function?: Input<string | FunctionArgs | FunctionArn>;
    /**
     * The task that'll be executed when the cron job runs.
     *
     * @example
     *
     * For example, let's say you have a task.
     *
     * ```js title="sst.config.ts"
     * const myCluster = new sst.aws.Cluster("MyCluster");
     * const myTask = new sst.aws.Task("MyTask", { cluster: myCluster });
     * ```
     *
     * You can then pass in the task to the cron job.
     *
     * ```js title="sst.config.ts"
     * new sst.aws.Cron("MyCronJob", {
     *   task: myTask,
     *   schedule: "rate(1 minute)"
     * });
     * ```
     *
     */
    task?: Task;
    /**
     * The event that'll be passed to the function or task.
     *
     * @example
     * ```ts
     * {
     *   event: {
     *     foo: "bar",
     *   }
     * }
     * ```
     *
     * For Lambda functions, the event will be passed to the function as an event.
     *
     * ```ts
     * function handler(event) {
     *   console.log(event.foo);
     * }
     * ```
     *
     * For ECS Fargate tasks, the event will be passed to the task as the `SST_EVENT`
     * environment variable.
     *
     * ```ts
     * const event = JSON.parse(process.env.SST_EVENT);
     * console.log(event.foo);
     * ```
     */
    event?: Input<Record<string, Input<string>>>;
    /**
     * The schedule for the cron job.
     *
     * :::note
     * The cron job continues to run even after you exit `sst dev`.
     * :::
     *
     * @example
     *
     * You can use a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).
     *
     * ```ts
     * {
     *   schedule: "rate(5 minutes)"
     *   // schedule: "rate(1 minute)"
     *   // schedule: "rate(5 minutes)"
     *   // schedule: "rate(1 hour)"
     *   // schedule: "rate(5 hours)"
     *   // schedule: "rate(1 day)"
     *   // schedule: "rate(5 days)"
     * }
     * ```
     * Or a [cron expression](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions).
     *
     * ```ts
     * {
     *   schedule: "cron(15 10 * * ? *)", // 10:15 AM (UTC) every day
     * }
     * ```
     */
    schedule: Input<`rate(${string})` | `cron(${string})`>;
    /**
     * Configures whether the cron job is enabled. When disabled, the cron job won't run.
     * @default true
     * @example
     * ```ts
     * {
     *   enabled: false
     * }
     * ```
     */
    enabled?: Input<boolean>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying resources.
     */
    transform?: {
        /**
         * Transform the EventBridge Rule resource.
         */
        rule?: Transform<cloudwatch.EventRuleArgs>;
        /**
         * Transform the EventBridge Target resource.
         */
        target?: Transform<cloudwatch.EventTargetArgs>;
    };
}
/**
 * The `Cron` component lets you add cron jobs to your app
 * using [Amazon Event Bus](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html). The cron job can invoke a `Function` or a container `Task`.
 *
 * @example
 * #### Cron job function
 *
 * Pass in a `schedule` and a `function` that'll be executed.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Cron("MyCronJob", {
 *   function: "src/cron.handler",
 *   schedule: "rate(1 minute)"
 * });
 * ```
 *
 * #### Cron job container task
 *
 * Create a container task and pass in a `schedule` and a `task` that'll be executed.
 *
 * ```ts title="sst.config.ts" {5}
 * const myCluster = new sst.aws.Cluster("MyCluster");
 * const myTask = new sst.aws.Task("MyTask", { cluster: myCluster });
 *
 * new sst.aws.Cron("MyCronJob", {
 *   task: myTask,
 *   schedule: "rate(1 day)"
 * });
 * ```
 *
 * #### Customize the function
 *
 * ```js title="sst.config.ts"
 * new sst.aws.Cron("MyCronJob", {
 *   schedule: "rate(1 minute)",
 *   function: {
 *     handler: "src/cron.handler",
 *     timeout: "60 seconds"
 *   }
 * });
 * ```
 */
export declare class Cron extends Component {
    private name;
    private fn?;
    private rule;
    private target;
    constructor(name: string, args: CronArgs, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The AWS Lambda Function that'll be invoked when the cron job runs.
         * @deprecated Use `nodes.function` instead.
         */
        readonly job: Output<import("./function").Function>;
        /**
         * The AWS Lambda Function that'll be invoked when the cron job runs.
         */
        readonly function: Output<import("./function").Function>;
        /**
         * The EventBridge Rule resource.
         */
        rule: import("@pulumi/aws/cloudwatch/eventRule").EventRule;
        /**
         * The EventBridge Target resource.
         */
        target: import("@pulumi/aws/cloudwatch/eventTarget").EventTarget;
    };
}
