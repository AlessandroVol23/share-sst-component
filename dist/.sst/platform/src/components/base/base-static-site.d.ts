import { Resource } from "@pulumi/pulumi";
import { Input } from "../input.js";
import { Prettify } from "../component.js";
import { BaseSiteFileOptions } from "./base-site.js";
export type BaseStaticSiteAssets = {
    /**
     * Character encoding for text based assets uploaded, like HTML, CSS, JS. This is
     * used to set the `Content-Type` header when these files are served out.
     *
     * If set to `"none"`, then no charset will be returned in header.
     * @default `"utf-8"`
     * @example
     * ```js
     * {
     *   assets: {
     *     textEncoding: "iso-8859-1"
     *   }
     * }
     * ```
     */
    textEncoding?: Input<"utf-8" | "iso-8859-1" | "windows-1252" | "ascii" | "none">;
    /**
     * Specify the `Content-Type` and `Cache-Control` headers for specific files. This allows
     * you to override the default behavior for specific files using glob patterns.
     *
     * By default, this is set to cache CSS/JS files for 1 year and not cache HTML files.
     *
     * ```js
     * {
     *   assets: {
     *     fileOptions: [
     *       {
     *         files: ["**\/*.css", "**\/*.js"],
     *         cacheControl: "max-age=31536000,public,immutable"
     *       },
     *       {
     *         files: "**\/*.html",
     *         cacheControl: "max-age=0,no-cache,no-store,must-revalidate"
     *       }
     *     ]
     *   }
     * }
     * ```
     *
     * @default `Object[]`
     * @example
     * You can change the default options. For example, apply `Cache-Control` and `Content-Type` to all zip files.
     * ```js
     * {
     *   assets: {
     *     fileOptions: [
     *       {
     *         files: "**\/*.zip",
     *         contentType: "application/zip",
     *         cacheControl: "private,no-cache,no-store,must-revalidate"
     *       },
     *     ],
     *   }
     * }
     * ```
     * Apply `Cache-Control` to all CSS and JS files except for CSS files with `index-`
     * prefix in the `main/` directory.
     * ```js
     * {
     *   assets: {
     *     fileOptions: [
     *       {
     *         files: ["**\/*.css", "**\/*.js"],
     *         ignore: "main\/index-*.css",
     *         cacheControl: "private,no-cache,no-store,must-revalidate"
     *       },
     *     ],
     *   }
     * }
     * ```
     */
    fileOptions?: Input<Prettify<BaseSiteFileOptions>[]>;
};
export interface BaseStaticSiteArgs {
    path?: Input<string>;
    /**
     * The name of the index page of the site. This is a path relative to the root of your site, or the `path`.
     *
     * :::note
     * The index page only applies to the root of your site.
     * :::
     *
     * By default this is set to `index.html`. So if a visitor goes to your site, let's say `example.com`, `example.com/index.html` will be served.
     *
     * @default `"index.html"`
     * @example
     * ```js
     * {
     *   indexPage: "home.html"
     * }
     * ```
     */
    indexPage?: string;
    /**
     * The error page to display on a 403 or 404 error. This is a path relative to the root of your site, or the `path`.
     * @default The `indexPage` of your site.
     * @example
     * ```js
     * {
     *   errorPage: "404.html"
     * }
     * ```
     */
    errorPage?: Input<string>;
    /**
     * Set environment variables for your static site. These are made available:
     *
     * 1. Locally while running your site through `sst dev`.
     * 2. In the build process when running `build.command`.
     *
     * @example
     * ```js
     * environment: {
     *   API_URL: api.url
     *   STRIPE_PUBLISHABLE_KEY: "pk_test_123"
     * }
     * ```
     *
     * Some static site generators like Vite have their [concept of environment variables](https://vitejs.dev/guide/env-and-mode), and you can use this option to set them.
     *
     * :::note
     * The types for the Vite environment variables are generated automatically. You can change their location through `vite.types`.
     * :::
     *
     * These can be accessed as `import.meta.env` in your site. And only the ones prefixed with `VITE_` can be accessed in the browser.
     *
     * ```js
     * environment: {
     *   API_URL: api.url
     *   // Accessible in the browser
     *   VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
     * }
     * ```
     */
    environment?: Input<Record<string, Input<string>>>;
    build?: Input<{
        /**
         * The command that builds the static site. It's run before your site is deployed. This is run at the root of your site, `path`.
         * @example
         * ```js
         * {
         *   build: {
         *     command: "yarn build"
         *   }
         * }
         * ```
         */
        command: Input<string>;
        /**
         * The directory where the build output of your static site is generated. This will be uploaded.
         *
         * The path is relative to the root of your site, `path`.
         * @example
         * ```js
         * {
         *   build: {
         *     output: "build"
         *   }
         * }
         * ```
         */
        output: Input<string>;
    }>;
    /**
     * Configure [Vite](https://vitejs.dev) related options.
     *
     * :::tip
     * If a `vite.config.ts` or `vite.config.js` file is detected in the `path`, then these options will be used during the build and deploy process.
     * :::
     */
    vite?: Input<{
        /**
         * The path where the type definition for the `environment` variables are generated. This is relative to the `path`. [Read more](https://vitejs.dev/guide/env-and-mode#intellisense-for-typescript).
         *
         * @default `"src/sst-env.d.ts"`
         * @example
         * ```js
         * {
         *   vite: {
         *     types: "other/path/sst-env.d.ts"
         *   }
         * }
         * ```
         */
        types?: string;
    }>;
}
export declare function prepare(args: BaseStaticSiteArgs): {
    sitePath: import("@pulumi/pulumi").Output<string>;
    environment: import("@pulumi/pulumi").Output<import("@pulumi/pulumi").UnwrappedObject<Record<string, Input<string>>>>;
    indexPage: import("@pulumi/pulumi").Output<string>;
};
export declare function buildApp(parent: Resource, name: string, build: BaseStaticSiteArgs["build"], sitePath: ReturnType<typeof prepare>["sitePath"], environment: ReturnType<typeof prepare>["environment"]): import("@pulumi/pulumi").Output<string>;
