import type { AstroIntegration } from 'astro';
import { type GetPlatformProxyOptions } from 'wrangler';
import { type ImageService } from './utils/image-config.js';
export type { Runtime } from './utils/handler.js';
export type Options = {
    /** Options for handling images. */
    imageService?: ImageService;
    /** Configuration for `_routes.json` generation. A _routes.json file controls when your Function is invoked. This file will include three different properties:
     *
     * - version: Defines the version of the schema. Currently there is only one version of the schema (version 1), however, we may add more in the future and aim to be backwards compatible.
     * - include: Defines routes that will be invoked by Functions. Accepts wildcard behavior.
     * - exclude: Defines routes that will not be invoked by Functions. Accepts wildcard behavior. `exclude` always take priority over `include`.
     *
     * Wildcards match any number of path segments (slashes). For example, `/users/*` will match everything after the `/users/` path.
     *
     */
    routes?: {
        /** Extend `_routes.json` */
        extend: {
            /** Paths which should be routed to the SSR function */
            include?: {
                /** Generally this is in pathname format, but does support wildcards, e.g. `/users`, `/products/*` */
                pattern: string;
            }[];
            /** Paths which should be routed as static assets */
            exclude?: {
                /** Generally this is in pathname format, but does support wildcards, e.g. `/static`, `/assets/*`, `/images/avatar.jpg` */
                pattern: string;
            }[];
        };
    };
    /**
     * Proxy configuration for the platform.
     */
    platformProxy?: GetPlatformProxyOptions & {
        /** Toggle the proxy. Default `undefined`, which equals to `true`. */
        enabled?: boolean;
    };
    /**
     * Allow bundling cloudflare worker specific file types as importable modules. Defaults to true.
     * When enabled, allows imports of '.wasm', '.bin', and '.txt' file types
     *
     * See https://developers.cloudflare.com/pages/functions/module-support/
     * for reference on how these file types are exported
     */
    cloudflareModules?: boolean;
    /**
     * By default, Astro will be configured to use Cloudflare KV to store session data. If you want to use sessions,
     * you must create a KV namespace and declare it in your wrangler config file. You can do this with the wrangler command:
     *
     * ```sh
     * npx wrangler kv namespace create SESSION
     * ```
     *
     * This will log the id of the created namespace. You can then add it to your `wrangler.json` file like this:
     *
     * ```json
     * {
     *   "kv_namespaces": [
     *     {
     *       "binding": "SESSION",
     *       "id": "<your kv namespace id here>"
     *     }
     *   ]
     * }
     * ```
     * By default, the driver looks for the binding named `SESSION`, but you can override this by providing a different name here.
     *
     * See https://developers.cloudflare.com/kv/concepts/kv-namespaces/ for more details on using KV namespaces.
     *
     */
    sessionKVBindingName?: string;
    /**
     * This configuration option allows you to specify a custom entryPoint for your Cloudflare Worker.
     * The entry point is the file that will be executed when your Worker is invoked.
     * By default, this is set to `@astrojs/cloudflare/entrypoints/server.js` and `['default']`.
     * @docs https://docs.astro.build/en/guides/integrations-guide/cloudflare/#workerEntryPoint
     */
    workerEntryPoint?: {
        /**
         * The path to the entry file. This should be a relative path from the root of your Astro project.
         * @example`'src/worker.ts'`
         * @docs https://docs.astro.build/en/guides/integrations-guide/cloudflare/#workerentrypointpath
         */
        path: string | URL;
        /**
         * Additional named exports to use for the entry file. Astro always includes the default export (`['default']`). If you need to have other top level named exports use this option.
         * @example ['MyDurableObject', 'namedExport']
         * @docs https://docs.astro.build/en/guides/integrations-guide/cloudflare/#workerentrypointnamedexports
         */
        namedExports?: string[];
    };
};
export default function createIntegration(args?: Options): AstroIntegration;
