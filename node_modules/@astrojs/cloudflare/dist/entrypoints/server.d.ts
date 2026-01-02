import type { ExecutionContext, ExportedHandlerFetchHandler } from '@cloudflare/workers-types';
import type { SSRManifest } from 'astro';
type Env = {
    [key: string]: unknown;
    ASSETS: {
        fetch: (req: Request | string) => Promise<Response>;
    };
};
export declare function createExports(manifest: SSRManifest): {
    default: {
        fetch: (request: Parameters<ExportedHandlerFetchHandler>[0], env: Env, context: ExecutionContext) => Promise<Response>;
    };
};
export {};
