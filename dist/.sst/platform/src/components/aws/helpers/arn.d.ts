export declare function parseFunctionArn(arn: string): {
    functionName: string;
};
export declare function parseBucketArn(arn: string): {
    bucketName: string;
};
export declare function parseTopicArn(arn: string): {
    topicName: string;
};
export declare function parseQueueArn(arn: string): {
    queueName: string;
    queueUrl: string;
};
export declare function parseDynamoArn(arn: string): {
    tableName: string;
};
export declare function parseDynamoStreamArn(streamArn: string): {
    tableName: string;
};
export declare function parseKinesisStreamArn(streamArn: string): {
    streamName: string;
};
export declare function parseEventBusArn(arn: string): {
    busName: string;
};
export declare function parseRoleArn(arn: string): {
    roleName: string;
};
export declare function parseElasticSearch(arn: string): {
    tableName: string;
};
export declare function parseOpenSearch(arn: string): {
    tableName: string;
};
