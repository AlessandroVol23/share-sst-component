import { ComponentResource, ComponentResourceOptions, Inputs, asset as pulumiAsset, Input, Output } from "@pulumi/pulumi";
export declare const outputId = "Calling [toString] on an [Output<T>] is not supported.\n\nTo get the value of an Output<T> as an Output<string> consider either:\n1: o.apply(v => `prefix${v}suffix`)\n2: pulumi.interpolate `prefix${v}suffix`\n\nSee https://www.pulumi.com/docs/concepts/inputs-outputs for more details.\nThis function may throw in a future version of @pulumi/pulumi.";
/**
 * Helper type to inline nested types
 */
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type Transform<T> = Partial<T> | ((args: T, opts: $util.CustomResourceOptions, name: string) => undefined);
export declare function transform<T extends object>(transform: Transform<T> | undefined, name: string, args: T, opts: $util.CustomResourceOptions): readonly [string, T, $util.CustomResourceOptions];
export declare class Component extends ComponentResource {
    private componentType;
    private componentName;
    constructor(type: string, name: string, args?: Inputs, opts?: ComponentResourceOptions);
    /** @internal */
    protected registerVersion(input: {
        new: number;
        old?: number;
        message?: string;
        forceUpgrade?: `v${number}`;
    }): void;
}
export declare function $transform<T, Args, Options>(resource: {
    new (name: string, args: Args, opts?: Options): T;
}, cb: (args: Args, opts: Options, name: string) => void): void;
export declare function $asset(assetPath: string): pulumiAsset.FileArchive | pulumiAsset.FileAsset;
export declare function $lazy<T>(fn: () => T): Output<import("@pulumi/pulumi").Unwrap<T>>;
export declare function $print(...msg: Input<any>[]): import("@pulumi/pulumi").OutputInstance<void>;
export declare class Version extends ComponentResource {
    constructor(target: string, version: number, opts: ComponentResourceOptions);
}
export type ComponentVersion = {
    major: number;
    minor: number;
};
export declare function parseComponentVersion(version: string): ComponentVersion;
