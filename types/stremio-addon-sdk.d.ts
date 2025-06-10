declare module 'stremio-addon-sdk' {
    interface Stream {
        url: string;
        name: string;
        title: string;
        behaviorHints?: {
            bingeGroup?: string;
        };
    }

    interface StreamResponse {
        streams: Stream[];
    }

    interface ManifestCatalog {
        type: string;
        id: string;
        name: string;
    }

    interface Manifest {
        id: string;
        version: string;
        name: string;
        description: string;
        types: string[];
        catalogs: ManifestCatalog[];
        resources: string[];
        idPrefixes?: string[];
    }

    interface AddonInterface {
        manifest: Manifest;
        get(args: { resource: string; type: string; id: string; }): Promise<any>;
    }

    export class addonBuilder {
        constructor(manifest: Manifest);
        defineStreamHandler(handler: (args: { type: string; id: string; }) => Promise<StreamResponse>): void;
        getInterface(): AddonInterface;
    }

    export function serveHTTP(addonInterface: AddonInterface, options: { port: number }): void;
}
