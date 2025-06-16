import { Input } from "../input";
export interface BaseSiteDev {
    /**
     * The `url` when this is running in dev mode.
     *
     * Since this component is not deployed in `sst dev`, there is no real URL. But if you are
     * using this component's `url` or linking to this component's `url`, it can be useful to
     * have a placeholder URL. It avoids having to handle it being `undefined`.
     * @default `"http://url-unavailable-in-dev.mode"`
     */
    url?: Input<string>;
    /**
     * The command that `sst dev` runs to start this in dev mode.
     * @default `"npm run dev"`
     */
    command?: Input<string>;
    /**
     * Configure if you want to automatically start this when `sst dev` starts. You can still
     * start it manually later.
     * @default `true`
     */
    autostart?: Input<boolean>;
    /**
     * Change the directory from where the `command` is run.
     * @default Uses the `path`
     */
    directory?: Input<string>;
    /**
     * The title of the tab in the multiplexer.
     */
    title?: Input<string>;
}
export interface BaseSiteFileOptions {
    /**
     * A glob pattern or array of glob patterns of files to apply these options to.
     */
    files: string | string[];
    /**
     * A glob pattern or array of glob patterns of files to exclude from the ones matched
     * by the `files` glob pattern.
     */
    ignore?: string | string[];
    /**
     * The `Cache-Control` header to apply to the matched files.
     */
    cacheControl?: string;
    /**
     * The `Content-Type` header to apply to the matched files.
     */
    contentType?: string;
}
export declare function getContentType(filename: string, textEncoding: string): string;
