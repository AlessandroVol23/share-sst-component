import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
export interface PostgresTableInputs {
    clusterArn: Input<string>;
    secretArn: Input<string>;
    databaseName: Input<string>;
    tableName: Input<string>;
    dimension: Input<number>;
}
export declare class VectorTable extends dynamic.Resource {
    constructor(name: string, args: PostgresTableInputs, opts?: CustomResourceOptions);
}
