import { ComponentResourceOptions } from "@pulumi/pulumi";
import { Component, Transform } from "../component";
import { cloudwatch, sfn } from "@pulumi/aws";
import { Link } from "../link";
import { State } from "./step-functions/state";
import { Choice, ChoiceArgs } from "./step-functions/choice";
import { Fail, FailArgs } from "./step-functions/fail";
import { Map, MapArgs } from "./step-functions/map";
import { Parallel, ParallelArgs } from "./step-functions/parallel";
import { Pass, PassArgs } from "./step-functions/pass";
import { Succeed, SucceedArgs } from "./step-functions/succeed";
import { Task, TaskArgs, LambdaInvokeArgs, SnsPublishArgs, SqsSendMessageArgs, EcsRunTaskArgs, EventBridgePutEventsArgs } from "./step-functions/task";
import { Wait, WaitArgs } from "./step-functions/wait";
import { Input } from "../input";
import { RETENTION } from "./logging";
export interface StepFunctionsArgs {
    /**
     * The type of state machine workflow to create.
     *
     * :::caution
     * Changing the type of the state machine workflow will cause the state machine
     * to be destroyed and recreated.
     * :::
     *
     * The `standard` workflow is the default and is meant for long running workflows.
     * The `express` workflow is meant for workflows shorter than 5 minutes.
     *
     * This is because the `express` workflow is run in a single Lambda function. As a
     * result, it's faster and cheaper to run. So if your workflow are short, the
     * `express` workflow is recommended.
     *
     * @default `"standard"`
     * @example
     * ```js
     * {
     *   type: "express"
     * }
     * ```
     */
    type?: Input<"standard" | "express">;
    /**
     * The definition of the state machine. It takes a chain of `State` objects.
     *
     * @example
     *
     * ```ts title="sst.config.ts"
     * const foo = sst.aws.StepFunctions.pass({ name: "Foo" });
     * const bar = sst.aws.StepFunctions.succeed({ name: "Bar" });
     *
     * new sst.aws.StepFunctions("MyStateMachine", {
     *   definition: foo.next(bar)
     * });
     * ```
     */
    definition: State;
    /**
     * Configure the execution logs in CloudWatch. Or pass in `false` to disable writing logs.
     * @default `{retention: "1 month", level: "error", includeData: false}`
     * @example
     * ```js
     * {
     *   logging: false
     * }
     * ```
     */
    logging?: Input<false | {
        /**
         * The duration the logs are kept in CloudWatch.
         *
         * @default `1 month`
         * @example
         * ```js
         * {
         *   logging: {
         *     retention: "forever"
         *   }
         * }
         * ```
         */
        retention?: Input<keyof typeof RETENTION>;
        /**
         * Specify whether execution data is included in the logs.
         *
         * @default `false`
         * @example
         * ```js
         * {
         *   logging: {
         *     includeData: true
         *   }
         * }
         * ```
         */
        includeData?: Input<boolean>;
        /**
         * Specify the type of execution events that are logged. Read more about the
         * [Step Functions log level](https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html#cloudwatch-log-level).
         *
         * @default `"error"`
         * @example
         * ```js
         * {
         *   logging: {
         *     level: "all"
         *   }
         * }
         * ```
         */
        level?: Input<"all" | "error" | "fatal">;
    }>;
    /**
     * [Transform](/docs/components#transform) how this component creates its underlying resources.
     */
    transform?: {
        /**
         * Transform the Step Functions StateMachine resource.
         */
        stateMachine?: Transform<sfn.StateMachineArgs>;
        /**
         * Transform the Step Functions LogGroup resource.
         */
        logGroup?: Transform<cloudwatch.LogGroupArgs>;
    };
}
/**
 * The `StepFunctions` component lets you add state machines to your app
 * using [AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html).
 *
 * :::note
 * This component is currently in beta. Please [report any issues](https://github.com/sst/sst/issues) you find.
 * :::
 *
 * You define your state machine using a collection of states. Where each state
 * needs a unique name. It uses [JSONata](https://jsonata.org) for transforming
 * data between states.
 *
 * @example
 * #### Minimal example
 *
 * The state machine definition is compiled into JSON and passed to AWS.
 *
 * ```ts title="sst.config.ts"
 * const foo = sst.aws.StepFunctions.pass({ name: "Foo" });
 * const bar = sst.aws.StepFunctions.succeed({ name: "Bar" });
 *
 * const definition = foo.next(bar);
 *
 * new sst.aws.StepFunctions("MyStateMachine", {
 *   definition
 * });
 * ```
 *
 * #### Invoking a Lambda function
 *
 * Create a function and invoke it from a state machine.
 *
 * ```ts title="sst.config.ts" {5-8,12}
 * const myFunction = new sst.aws.Function("MyFunction", {
 *   handler: "src/index.handler"
 * });
 *
 * const invoke = sst.aws.StepFunctions.lambdaInvoke({
 *   name: "InvokeMyFunction",
 *   function: myFunction
 * });
 * const done = sst.aws.StepFunctions.succeed({ name: "Done" });
 *
 * new sst.aws.StepFunctions("MyStateMachine", {
 *   definition: invoke.next(done)
 * });
 * ```
 *
 * #### Use the express workflow
 *
 * ```ts title="sst.config.ts" {5}
 * const foo = sst.aws.StepFunctions.pass({ name: "Foo" });
 * const bar = sst.aws.StepFunctions.succeed({ name: "Bar" });
 *
 * new sst.aws.StepFunctions("MyStateMachine", {
 *   type: "express",
 *   definition: foo.next(bar)
 * });
 * ```
 */
export declare class StepFunctions extends Component implements Link.Linkable {
    private stateMachine;
    constructor(name: string, args: StepFunctionsArgs, opts?: ComponentResourceOptions);
    /**
     * The State Machine ARN.
     */
    get arn(): import("@pulumi/pulumi").Output<string>;
    /**
     * The underlying [resources](/docs/components/#nodes) this component creates.
     */
    get nodes(): {
        /**
         * The Step Function State Machine resource.
         */
        stateMachine: import("@pulumi/aws/sfn/stateMachine").StateMachine;
    };
    /**
     * A `Choice` state is used to conditionally continue to different states based
     * on the matched condition.
     *
     * @example
     * ```ts title="sst.config.ts"
     * const processPayment = sst.aws.StepFunctions.choice({ name: "ProcessPayment" });
     *
     * const makePayment = sst.aws.StepFunctions.lambdaInvoke({ name: "MakePayment" });
     * const sendReceipt = sst.aws.StepFunctions.lambdaInvoke({ name: "SendReceipt" });
     * const failure = sst.aws.StepFunctions.fail({ name: "Failure" });
     *
     * processPayment.when("{% $states.input.status === 'unpaid' %}", makePayment);
     * processPayment.when("{% $states.input.status === 'paid' %}", sendReceipt);
     * processPayment.otherwise(failure);
     * ```
     */
    static choice(args: ChoiceArgs): Choice;
    /**
     * A `Fail` state is used to fail the execution of a state machine.
     *
     * @example
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.fail({ name: "Failure" });
     * ```
     */
    static fail(args: FailArgs): Fail;
    /**
     * A `Map` state is used to iterate over a list of items and execute a task for
     * each item.
     *
     * @example
     * ```ts title="sst.config.ts"
     * const processor = sst.aws.StepFunctions.lambdaInvoke({
     *   name: "Processor",
     *   function: "src/processor.handler"
     * });
     *
     * sst.aws.StepFunctions.map({
     *   processor,
     *   name: "Map",
     *   items: "{% $states.input.items %}"
     * });
     * ```
     */
    static map(args: MapArgs): Map;
    /**
     * A `Parallel` state is used to execute multiple branches of a state in parallel.
     *
     * @example
     * ```ts title="sst.config.ts"
     * const processorA = sst.aws.StepFunctions.lambdaInvoke({
     *   name: "ProcessorA",
     *   function: "src/processorA.handler"
     * });
     *
     * const processorB = sst.aws.StepFunctions.lambdaInvoke({
     *   name: "ProcessorB",
     *   function: "src/processorB.handler"
     * });
     *
     * const parallel = sst.aws.StepFunctions.parallel({ name: "Parallel" });
     *
     * parallel.branch(processorA);
     * parallel.branch(processorB);
     * ```
     */
    static parallel(args: ParallelArgs): Parallel;
    /**
     * A `Pass` state is used to pass the input to the next state. It's useful for
     * transforming the input before passing it along.
     *
     * @example
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.pass({
     *   name: "Pass",
     *   output: "{% $states.input.message %}"
     * });
     * ```
     */
    static pass(args: PassArgs): Pass;
    /**
     * A `Succeed` state is used to indicate that the execution of a state machine
     * has succeeded.
     *
     * @example
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.succeed({ name: "Succeed" });
     * ```
     */
    static succeed(args: SucceedArgs): Succeed;
    /**
     * A `Wait` state is used to wait for a specific amount of time before continuing
     * to the next state.
     *
     * @example
     *
     * For example, wait for 10 seconds before continuing to the next state.
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.wait({
     *   name: "Wait",
     *   time: 10
     * });
     * ```
     *
     * Alternatively, you can wait until a specific timestamp.
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.wait({
     *   name: "Wait",
     *   timestamp: "2026-01-01T00:00:00Z"
     * });
     * ```
     */
    static wait(args: WaitArgs): Wait;
    /**
     * A `Task` state can be used to make calls to AWS resources. We created a few
     * convenience methods for common tasks like:
     *
     * - `sst.aws.StepFunctions.lambdaInvoke` to invoke a Lambda function.
     * - `sst.aws.StepFunctions.ecsRunTask` to run an ECS task.
     * - `sst.aws.StepFunctions.eventBridgePutEvents` to send custom events to
     *   EventBridge.
     *
     * For everything else, you can use the `Task` state.
     *
     * @example
     *
     * For example, to start an AWS CodeBuild build.
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.task({
     *   name: "Task",
     *   resource: "arn:aws:states:::codebuild:startBuild",
     *   arguments: {
     *     projectName: "my-codebuild-project"
     *   },
     *   permissions: [
     *     {
     *       actions: ["codebuild:StartBuild"],
     *       resources: ["*"]
     *     }
     *   ]
     * });
     * ```
     */
    static task(args: TaskArgs): Task;
    /**
     * Create a `Task` state that invokes a Lambda function. [Learn more](https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html).
     *
     * @example
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.lambdaInvoke({
     *   name: "LambdaInvoke",
     *   function: "src/index.handler"
     * });
     * ```
     *
     * Customize the function.
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.lambdaInvoke({
     *   name: "LambdaInvoke",
     *   function: {
     *     handler: "src/index.handler"
     *     timeout: "60 seconds",
     *   }
     * });
     * ```
     *
     * Pass in an existing `Function` component.
     *
     * ```ts title="sst.config.ts"
     * const myLambda = new sst.aws.Function("MyLambda", {
     *   handler: "src/index.handler"
     * });
     *
     * sst.aws.StepFunctions.lambdaInvoke({
     *   name: "LambdaInvoke",
     *   function: myLambda
     * });
     * ```
     *
     * Or pass in the ARN of an existing Lambda function.
     *
     * ```ts title="sst.config.ts"
     * sst.aws.StepFunctions.lambdaInvoke({
     *   name: "LambdaInvoke",
     *   function: "arn:aws:lambda:us-east-1:123456789012:function:my-function"
     * });
     * ```
     */
    static lambdaInvoke(args: LambdaInvokeArgs): Task;
    /**
     * Create a `Task` state that publishes a message to an SNS topic. [Learn more](https://docs.aws.amazon.com/sns/latest/api/API_Publish.html).
     *
     * @example
     * ```ts title="sst.config.ts"
     * const myTopic = new sst.aws.SnsTopic("MyTopic");
     *
     * sst.aws.StepFunctions.snsPublish({
     *   name: "SnsPublish",
     *   topic: myTopic,
     *   message: "Hello, world!"
     * });
     * ```
     */
    static snsPublish(args: SnsPublishArgs): Task;
    /**
     * Create a `Task` state that sends a message to an SQS queue. [Learn more](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html).
     *
     * @example
     * ```ts title="sst.config.ts"
     * const myQueue = new sst.aws.Queue("MyQueue");
     *
     * sst.aws.StepFunctions.sqsSendMessage({
     *   name: "SqsSendMessage",
     *   queue: myQueue,
     *   messageBody: "Hello, world!"
     * });
     * ```
     */
    static sqsSendMessage(args: SqsSendMessageArgs): Task;
    /**
     * Create a `Task` state that runs an ECS task using the [`Task`](/docs/component/aws/task) component. [Learn more](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RunTask.html).
     *
     * @example
     * ```ts title="sst.config.ts"
     * const myCluster = new sst.aws.Cluster("MyCluster");
     * const myTask = new sst.aws.Task("MyTask", { cluster: myCluster });
     *
     * sst.aws.StepFunctions.ecsRunTask({
     *   name: "RunTask",
     *   task: myTask
     * });
     * ```
     */
    static ecsRunTask(args: EcsRunTaskArgs): Task;
    /**
     * Create a `Task` state that sends custom events to one or more EventBridge buses
     * using the [`Bus`](/docs/component/aws/bus) component. [Learn more](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html).
     *
     * @example
     * ```ts title="sst.config.ts"
     * const myBus = new sst.aws.EventBus("MyBus");
     *
     * sst.aws.StepFunctions.eventBridgePutEvents({
     *   name: "EventBridgePutEvents",
     *   events: [
     *     {
     *       bus: myBus,
     *       source: "my-source"
     *     }
     *   ]
     * });
     * ```
     */
    static eventBridgePutEvents(args: EventBridgePutEventsArgs): Task;
    /** @internal */
    getSSTLink(): {
        properties: {
            arn: import("@pulumi/pulumi").Output<string>;
        };
        include: {
            effect?: "allow" | "deny" | undefined;
            actions: string[];
            resources: Input<Input<string>[]>;
            type: "aws.permission";
        }[];
    };
}
