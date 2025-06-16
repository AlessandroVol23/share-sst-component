import { output } from "@pulumi/pulumi";
import { Queue } from "../queue";
export function isFunctionSubscriber(subscriber) {
    if (!subscriber)
        return output(false);
    return output(subscriber).apply((subscriber) => typeof subscriber === "string" || typeof subscriber.handler === "string");
}
export function isQueueSubscriber(subscriber) {
    if (!subscriber)
        return output(false);
    return output(subscriber).apply((subscriber) => typeof subscriber === "string" || subscriber instanceof Queue);
}
