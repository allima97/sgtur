import type { AstroConfig, AstroIntegrationLogger, HookParameters } from 'astro';
export type ImageService = 'passthrough' | 'cloudflare' | 'compile' | 'custom';
export declare function setImageConfig(service: ImageService, config: AstroConfig['image'], command: HookParameters<'astro:config:setup'>['command'], logger: AstroIntegrationLogger): {
    service: import("astro").ImageServiceConfig<Record<string, any>>;
    responsiveStyles: boolean;
    endpoint: {
        route: string;
        entrypoint?: string | undefined;
    };
    domains: string[];
    remotePatterns: {
        port?: string | undefined;
        protocol?: string | undefined;
        hostname?: string | undefined;
        pathname?: string | undefined;
    }[];
    layout?: "fixed" | "constrained" | "full-width" | "none" | undefined;
    objectFit?: string | undefined;
    objectPosition?: string | undefined;
    breakpoints?: number[] | undefined;
} | {
    service: import("astro").ImageServiceConfig<Record<string, any>>;
    endpoint: {
        entrypoint: string | undefined;
    };
    responsiveStyles: boolean;
    domains: string[];
    remotePatterns: {
        port?: string | undefined;
        protocol?: string | undefined;
        hostname?: string | undefined;
        pathname?: string | undefined;
    }[];
    layout?: "fixed" | "constrained" | "full-width" | "none" | undefined;
    objectFit?: string | undefined;
    objectPosition?: string | undefined;
    breakpoints?: number[] | undefined;
};
