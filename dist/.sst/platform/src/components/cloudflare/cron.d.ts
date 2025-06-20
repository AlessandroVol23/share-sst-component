import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform } from "../component";
import { WorkerArgs } from "./worker";
import { Input } from "../input.js";
export interface CronArgs {
    /**
     * The worker that'll be executed when the cron job runs.
     *
     * @example
     *
     * ```ts
     * {
     *   job: "src/cron.ts"
     * }
     * ```
     *
     * You can pass in the full worker props.
     *
     * ```ts
     * {
     *   job: {
     *     handler: "src/cron.ts",
     *     link: [bucket]
     *   }
     * }
     * ```
     */
    job: Input<string | WorkerArgs>;
    /**
     * The schedule for the cron job.
     *
     * :::note
     * The cron job continues to run even after you exit `sst dev`.
     * :::
     *
     * @example
     *
     * You can use a [cron expression](https://developers.cloudflare.com/workers/configuration/cron-triggers/#supported-cron-expressions).
     *
     * ```ts
     * {
     *   schedules: ["* * * * *"]
     *   // schedules: ["*\/30 * * * *"]
     *   // schedules: ["45 * * * *"]
     *   // schedules: ["0 17 * * sun"]
     *   // schedules: ["10 7 * * mon-fri"]
     *   // schedules: ["0 15 1 * *"]
     *   // schedules: ["59 23 LW * *"]
     * }
     * ```
     */
    schedules: Input<string[]>;
    /**
     * [Transform](/docs/components/#transform) how this component creates its underlying
     * resources.
     */
    transform?: {
        /**
         * Transform the Worker Cron Trigger resource.
         */
        trigger?: Transform<cloudflare.WorkerCronTriggerArgs>;
    };
}
/**
 * The `Cron` component lets you add cron jobs to your app using Cloudflare.
 * It uses [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
 *
 * @example
 * #### Minimal example
 *
 * Create a worker file that exposes a `scheduled` handler:
 *
 * ```ts title="cron.ts"
 * export default {
 *   async scheduled() {
 *     console.log("Running on a schedule");
 *   },
 * };
 * ```
 *
 * Pass in a `schedules` and a `job` worker that'll be executed.
 *
 * ```ts title="sst.config.ts"
 * new sst.cloudflare.Cron("MyCronJob", {
 *   job: "cron.ts",
 *   schedules: ["* * * * *"]
 * });
 * ```
 *
 * #### Customize the function
 *
 * ```js title="sst.config.ts"
 * new sst.cloudflare.Cron("MyCronJob", {
 *   schedules: ["* * * * *"],
 *   job: {
 *     handler: "cron.ts",
 *     link: [bucket]
 *   }
 * });
 * ```
 */
export declare class Cron extends Component {
    private worker;
    private trigger;
    constructor(name: string, args: CronArgs, opts?: ComponentResourceOptions);
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Cloudflare Worker.
         */
        worker: Output<import("@pulumi/cloudflare/workerScript").WorkerScript>;
        /**
         * The Cloudflare Worker Cron Trigger.
         */
        trigger: Output<import("@pulumi/cloudflare/workerCronTrigger").WorkerCronTrigger>;
    };
}
