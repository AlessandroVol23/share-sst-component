import { Input } from "@pulumi/pulumi";
import { Component } from "../component";
import { BusSubscriberArgs } from "./bus";
export interface BusBaseSubscriberArgs extends BusSubscriberArgs {
    /**
     * The bus to use.
     */
    bus: Input<{
        /**
         * The ARN of the bus.
         */
        arn: Input<string>;
        /**
         * The name of the bus.
         */
        name: Input<string>;
    }>;
}
export declare function createRule(name: string, eventBusName: Input<string>, args: BusBaseSubscriberArgs, parent: Component): import("@pulumi/aws/cloudwatch/eventRule").EventRule;
