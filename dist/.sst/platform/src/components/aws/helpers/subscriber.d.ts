import { Input } from "@pulumi/pulumi";
import { FunctionArgs, FunctionArn } from "../function";
import { Queue } from "../queue";
export declare function isFunctionSubscriber(subscriber?: Input<string | FunctionArgs | FunctionArn>): import("@pulumi/pulumi").OutputInstance<boolean>;
export declare function isQueueSubscriber(subscriber?: Input<string | Queue>): import("@pulumi/pulumi").OutputInstance<boolean>;
