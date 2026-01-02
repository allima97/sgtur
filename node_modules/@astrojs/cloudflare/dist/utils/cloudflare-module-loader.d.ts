import type { AstroConfig } from 'astro';
import type { PluginOption } from 'vite';
export interface CloudflareModulePluginExtra {
    afterBuildCompleted(config: AstroConfig): Promise<void>;
}
/**
 * Enables support for various non-standard extensions in module imports that cloudflare workers supports.
 *
 * See https://developers.cloudflare.com/pages/functions/module-support/ for reference
 *
 * This adds supports for imports in the following formats:
 * - .wasm
 * - .wasm?module
 * - .bin
 * - .txt
 *
 * @param enabled - if true, will load all cloudflare pages supported types
 * @returns Vite plugin with additional extension method to hook into astro build
 */
export declare function cloudflareModuleLoader(enabled: boolean): PluginOption & CloudflareModulePluginExtra;
