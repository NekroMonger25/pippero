"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const { addonBuilder } = require('stremio-addon-sdk');
const eurostreaming_1 = require("./eurostreaming");
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
// Define catalog handler (required even if empty)
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log('Catalog request:', { type, id, extra });
    return { metas: [] };
});
builder.defineStreamHandler(async ({ type, id }) => {
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
        const streams = await (0, eurostreaming_1.scrapeEurostreaming)(searchId, season, episode);
        console.log('Found streams:', streams?.length || 0);
        return {
            streams: streams || []
        };
    }
    catch (error) {
        console.error('Error in stream handler:', error);
        return { streams: [] };
    }
});
const serveHTTP = async () => {
    const { serveHTTP: serve } = await Promise.resolve().then(() => __importStar(require('stremio-addon-sdk')));
    serve(builder.getInterface(), { port: 7000 });
    console.log('Addon active on: http://127.0.0.1:7000');
    console.log('To install in Stremio, use: http://127.0.0.1:7000/manifest.json');
};
serveHTTP();
