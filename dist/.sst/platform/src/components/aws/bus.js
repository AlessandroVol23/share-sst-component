import { output } from "@pulumi/pulumi";
import { Component, transform } from "../component";
import { parseEventBusArn } from "./helpers/arn";
import { BusLambdaSubscriber } from "./bus-lambda-subscriber";
import { cloudwatch } from "@pulumi/aws";
import { permission } from "./permission";
import { BusQueueSubscriber } from "./bus-queue-subscriber";
/**
 * The `Bus` component lets you add an [Amazon EventBridge Event Bus](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html) to your app.
 *
 * @example
 *
 * #### Create a bus
 *
 * ```ts
 * const bus = new sst.aws.Bus("MyBus");
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts
 * bus.subscribe("MySubscriber", "src/subscriber.handler");
 * ```
 *
 * #### Customize the subscriber
 *
 * ```ts
 * bus.subscribe("MySubscriber", {
 *   handler: "src/subscriber.handler",
 *   timeout: "60 seconds"
 * });
 * ```
 *
 * #### Link the bus to a resource
 *
 * You can link the bus to other resources, like a function or your Next.js app.
 *
 * ```ts
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [bus]
 * });
 * ```
 *
 * Once linked, you can publish messages to the bus from your app.
 *
 * ```ts title="app/page.tsx" {1,9}
 * import { Resource } from "sst";
 * import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
 *
 * const eb = new EventBridgeClient({});
 *
 * await eb.send(new PutEventsCommand({
 *   Entries: [
 *     {
 *       EventBusName: Resource.MyBus.name,
 *       Source: "my.source",
 *       Detail: JSON.stringify({ foo: "bar" })
 *     }
 *   ]
 * }));
 * ```
 */
export class Bus extends Component {
    constructor(name, args = {}, opts = {}) {
        super(__pulumiType, name, args, opts);
        const self = this;
        this.constructorName = name;
        this.constructorOpts = opts;
        if (args && "ref" in args) {
            const ref = reference();
            this.bus = ref.bus;
            return;
        }
        const bus = createBus();
        this.bus = bus;
        function reference() {
            const ref = args;
            const bus = cloudwatch.EventBus.get(`${name}Bus`, ref.busName, undefined, {
                parent: self,
            });
            return { bus };
        }
        function createBus() {
            return new cloudwatch.EventBus(...transform(args.transform?.bus, `${name}Bus`, {}, { parent: self }));
        }
    }
    /**
     * The ARN of the EventBus.
     */
    get arn() {
        return this.bus.arn;
    }
    /**
     * The name of the EventBus.
     */
    get name() {
        return this.bus.name;
    }
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes() {
        return {
            /**
             * The Amazon EventBus resource.
             */
            bus: this.bus,
        };
    }
    /**
     * Subscribe to this EventBus with a function.
     *
     * @param name The name of the subscription.
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * ```js title="sst.config.ts"
     * bus.subscribe("MySubscription", "src/subscriber.handler");
     * ```
     *
     * You can add a pattern to the subscription.
     *
     * ```js
     * bus.subscribe("MySubscription", "src/subscriber.handler", {
     *   pattern: {
     *     source: ["my.source", "my.source2"],
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     *
     * To customize the subscriber function:
     *
     * ```js
     * bus.subscribe("MySubscription", {
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds"
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```js title="sst.config.ts"
     * bus.subscribe("MySubscription", "arn:aws:lambda:us-east-1:123456789012:function:my-function");
     * ```
     */
    subscribe(name, subscriber, args = {}) {
        return Bus._subscribeFunction(this.constructorName, name, this.nodes.bus.name, this.nodes.bus.arn, subscriber, args, { provider: this.constructorOpts.provider });
    }
    /**
     * Subscribe to an EventBus that was not created in your app with a function.
     *
     * @param name The name of the subscription.
     * @param busArn The ARN of the EventBus to subscribe to.
     * @param subscriber The function that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing EventBus with the following ARN.
     *
     * ```js title="sst.config.ts"
     * const busArn = "arn:aws:events:us-east-1:123456789012:event-bus/my-bus";
     * ```
     *
     * You can subscribe to it by passing in the ARN.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bus.subscribe("MySubscription", busArn, "src/subscriber.handler");
     * ```
     *
     * To add a pattern to the subscription.
     *
     * ```js
     * sst.aws.Bus.subscribe("MySubscription", busArn, "src/subscriber.handler", {
     *   pattern: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     *
     * Or customize the subscriber function.
     *
     * ```js
     * sst.aws.Bus.subscribe("MySubscription", busArn, {
     *   handler: "src/subscriber.handler",
     *   timeout: "60 seconds"
     * });
     * ```
     */
    static subscribe(name, busArn, subscriber, args) {
        return output(busArn).apply((busArn) => {
            const busName = parseEventBusArn(busArn).busName;
            return this._subscribeFunction(busName, name, busName, busArn, subscriber, args);
        });
    }
    static _subscribeFunction(name, subscriberName, busName, busArn, subscriber, args = {}, opts = {}) {
        return output(args).apply((args) => {
            return new BusLambdaSubscriber(`${name}Subscriber${subscriberName}`, {
                bus: { name: busName, arn: busArn },
                subscriber,
                ...args,
            }, opts);
        });
    }
    /**
     * Subscribe to this EventBus with an SQS Queue.
     *
     * @param name The name of the subscription.
     * @param queue The queue that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have a queue.
     *
     * ```js title="sst.config.ts"
     * const queue = new sst.aws.Queue("MyQueue");
     * ```
     *
     * You can subscribe to this bus with it.
     *
     * ```js title="sst.config.ts"
     * bus.subscribeQueue("MySubscription", queue);
     * ```
     *
     * You can also add a filter to the subscription.
     *
     * ```js
     * bus.subscribeQueue("MySubscription", queue, {
     *   filter: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     *
     * Or pass in the ARN of an existing SQS queue.
     *
     * ```js
     * bus.subscribeQueue("MySubscription", "arn:aws:sqs:us-east-1:123456789012:my-queue");
     * ```
     */
    subscribeQueue(name, queue, args = {}) {
        return Bus._subscribeQueue(this.constructorName, name, this.nodes.bus.arn, this.nodes.bus.name, queue, args);
    }
    /**
     * Subscribe to an existing EventBus with an SQS Queue.
     *
     * @param name The name of the subscription.
     * @param busArn The ARN of the EventBus to subscribe to.
     * @param queue The queue that'll be notified.
     * @param args Configure the subscription.
     *
     * @example
     *
     * For example, let's say you have an existing EventBus and an SQS Queue.
     *
     * ```js title="sst.config.ts"
     * const busArn = "arn:aws:events:us-east-1:123456789012:event-bus/MyBus";
     * const queue = new sst.aws.Queue("MyQueue");
     * ```
     *
     * You can subscribe to the bus with the queue.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bus.subscribeQueue("MySubscription", busArn, queue);
     * ```
     *
     * Add a filter to the subscription.
     *
     * ```js title="sst.config.ts"
     * sst.aws.Bus.subscribeQueue(MySubscription, busArn, queue, {
     *   filter: {
     *     price_usd: [{numeric: [">=", 100]}]
     *   }
     * });
     * ```
     *
     * Or pass in the ARN of an existing SQS queue.
     *
     * ```js
     * sst.aws.Bus.subscribeQueue("MySubscription", busArn, "arn:aws:sqs:us-east-1:123456789012:my-queue");
     * ```
     */
    static subscribeQueue(name, busArn, queue, args) {
        return output(busArn).apply((busArn) => {
            const busName = parseEventBusArn(busArn).busName;
            return this._subscribeQueue(busName, name, busArn, busName, queue, args);
        });
    }
    static _subscribeQueue(name, subscriberName, busArn, busName, queue, args = {}) {
        return output(args).apply((args) => {
            return new BusQueueSubscriber(`${name}Subscriber${subscriberName}`, {
                bus: { name: busName, arn: busArn },
                queue,
                ...args,
            });
        });
    }
    /** @internal */
    getSSTLink() {
        return {
            properties: {
                name: this.name,
                arn: this.arn,
            },
            include: [
                permission({
                    actions: ["events:*"],
                    resources: [this.nodes.bus.arn],
                }),
            ],
        };
    }
    /**
     * Reference an existing EventBus with its ARN. This is useful when you create a
     * bus in one stage and want to share it in another stage. It avoids having to create
     * a new bus in the other stage.
     *
     * :::tip
     * You can use the `static get` method to share EventBus across stages.
     * :::
     *
     * @param name The name of the component.
     * @param busName The name of the existing EventBus.
     * @param opts? Resource options.
     *
     * @example
     * Imagine you create a bus in the `dev` stage. And in your personal stage `frank`,
     * instead of creating a new bus, you want to share the bus from `dev`.
     *
     * ```ts title="sst.config.ts"
     * const bus = $app.stage === "frank"
     *   ? sst.aws.Bus.get("MyBus", "app-dev-MyBus")
     *   : new sst.aws.Bus("MyBus");
     * ```
     *
     * Here `app-dev-MyBus` is the name of the bus created in the `dev` stage. You can find
     * this by outputting the bus name in the `dev` stage.
     *
     * ```ts title="sst.config.ts"
     * return bus.name;
     * ```
     */
    static get(name, busName, opts) {
        return new Bus(name, {
            ref: true,
            busName,
        }, opts);
    }
}
const __pulumiType = "sst:aws:Bus";
// @ts-expect-error
Bus.__pulumiType = __pulumiType;
