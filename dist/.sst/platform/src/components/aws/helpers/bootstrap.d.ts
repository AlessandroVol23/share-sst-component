interface BootstrapData {
    asset: string;
    assetEcrRegistryId: string;
    assetEcrUrl: string;
    state: string;
    appsyncHttp: string;
    appsyncRealtime: string;
}
export declare const bootstrap: {
    forRegion(region: string): Promise<BootstrapData>;
};
export {};
