import { all } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, transform } from "../component";
import { DEFAULT_ACCOUNT_ID } from "./account-id.js";
import { workerBuilder } from "./helpers/worker-builder";
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
export class Cron extends Component {
    constructor(name, args, opts) {
        super(__pulumiType, name, args, opts);
        const parent = this;
        const worker = createWorker();
        const trigger = createTrigger();
        this.worker = worker;
        this.trigger = trigger;
        function createWorker() {
            return workerBuilder(`${name}Handler`, args.job);
        }
        function createTrigger() {
            return all([args.schedules]).apply(([schedules]) => {
                return new cloudflare.WorkersCronTrigger(...transform(args.transform?.trigger, `${name}Trigger`, {
                    accountId: DEFAULT_ACCOUNT_ID,
                    scriptName: worker.script.scriptName,
                    schedules: schedules.map((s) => ({ cron: s })),
                }, { parent }));
            });
        }
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Cloudflare Worker.
             */
            worker: this.worker.script,
            /**
             * The Cloudflare Worker Cron Trigger.
             */
            trigger: this.trigger,
        };
    }
}
const __pulumiType = "sst:cloudflare:Cron";
// @ts-expect-error
Cron.__pulumiType = __pulumiType;
