import { output } from "@pulumi/pulumi";
import { transform } from "../component";
import { cloudwatch } from "@pulumi/aws";
export function createRule(name, eventBusName, args, parent) {
    return new cloudwatch.EventRule(...transform(args?.transform?.rule, `${name}Rule`, {
        eventBusName,
        eventPattern: args.pattern
            ? output(args.pattern).apply((pattern) => JSON.stringify({
                "detail-type": pattern.detailType,
                source: pattern.source,
                detail: pattern.detail,
            }))
            : JSON.stringify({
                source: [{ prefix: "" }],
            }),
    }, { parent }));
}
