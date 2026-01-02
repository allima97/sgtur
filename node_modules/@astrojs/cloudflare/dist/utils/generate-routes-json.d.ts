import type { AstroConfig, AstroIntegrationLogger, IntegrationResolvedRoute, RoutePart } from 'astro';
export declare function getParts(part: string): RoutePart[];
export declare function createRoutesFile(_config: AstroConfig, logger: AstroIntegrationLogger, routes: IntegrationResolvedRoute[], pages: {
    pathname: string;
}[], redirects: IntegrationResolvedRoute['segments'][], includeExtends: {
    pattern: string;
}[] | undefined, excludeExtends: {
    pattern: string;
}[] | undefined): Promise<void>;
