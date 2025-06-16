import { output, } from "@pulumi/pulumi";
import { transform } from "../../component";
import { Worker } from "../worker";
export function workerBuilder(name, definition, argsTransform, opts) {
    return output(definition).apply((definition) => {
        if (typeof definition === "string") {
            // Case 1: The definition is a handler
            const worker = new Worker(...transform(argsTransform, name, { handler: definition }, opts || {}));
            return {
                getWorker: () => worker,
                script: worker.nodes.worker,
            };
        }
        // Case 2: The definition is a WorkerArgs
        else if (definition.handler) {
            const worker = new Worker(...transform(argsTransform, name, {
                ...definition,
            }, opts || {}));
            return {
                getWorker: () => worker,
                script: worker.nodes.worker,
            };
        }
        throw new Error(`Invalid worker definition for the "${name}" Worker`);
    });
}
