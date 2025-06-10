const { addonBuilder } = require('stremio-addon-sdk');
import { scrapeEurostreaming } from './eurostreaming';

interface StreamHandlerArgs {
    type: string;
    id: string;
}

const manifest = {
    id: 'com.stremio.eurostreaming.addon',
    version: '1.0.0',
    name: 'Eurostreaming Addon',
    description: 'Stremio addon for Eurostreaming - Italian TV Series',
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'eurostreaming_series',
            name: 'Eurostreaming Series',
            extra: [{ name: 'search' }]
        }
    ],
    resources: ['stream', 'catalog'],
    idPrefixes: ['tt']
};

const builder = new addonBuilder(manifest);

interface CatalogHandlerArgs {
    type: string;
    id: string;
    extra: {
        search?: string;
        skip?: number;
    };
}

// Define catalog handler (required even if empty)
builder.defineCatalogHandler(async ({ type, id, extra }: CatalogHandlerArgs) => {
    console.log('Catalog request:', { type, id, extra });
    return { metas: [] };
});

builder.defineStreamHandler(async ({ type, id }: StreamHandlerArgs) => {
    console.log('Stream handler called with:', { type, id });

    if (type !== 'series') {
        console.log('Not a series request, ignoring');
        return { streams: [] };
    }

    // ID format should be: tt1234567:1:1 (imdbId:season:episode)
    const parts = id.split(':');
    console.log('ID parts:', parts);

    if (parts.length !== 3) {
        console.log('Invalid ID format, expected imdbId:season:episode');
        return { streams: [] };
    }

    const [imdbId, season, episode] = parts;
    
    if (!imdbId || !season || !episode) {
        console.log('Missing required ID parts');
        return { streams: [] };
    }

    // Remove 'tt' prefix if present for the search
    const searchId = imdbId.replace('tt', '');
    console.log('Searching for:', { searchId, season, episode });

    try {
        const streams = await scrapeEurostreaming(searchId, season, episode);
        console.log('Found streams:', streams?.length || 0);
        return {
            streams: streams || []
        };
    } catch (error) {
        console.error('Error in stream handler:', error);
        return { streams: [] };
    }
});

const serveHTTP = async () => {
    const { serveHTTP: serve } = await import('stremio-addon-sdk');
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    serve(builder.getInterface(), { port });
    console.log(`Addon active on: http://127.0.0.1:${port}`);
    console.log(`To install in Stremio, use: http://127.0.0.1:${port}/manifest.json`);
};

serveHTTP();
