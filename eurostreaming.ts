const { evalResolver } = require("./evalResolver");
import axios from 'axios';
require('dotenv').config();

interface StremioStream {
    name: string;
    title: string;
    url: string;
    behaviorHints?: {
        bingeGroup?: string;
    };
}

interface TMDBTVResult {
    name: string;
    original_name: string;
    id: number;
}

interface TMDBFindResponse {
    tv_results: TMDBTVResult[];
}

interface TMDBTVDetails {
    name: string;
    original_name: string;
}

const baseurl = "https://eurostreaming.my/";

function getTmdbApiKey(): string {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        throw new Error('TMDB_API_KEY is not set in environment variables');
    }
    return apiKey;
}

async function getSeriesTitle(imdbId: string): Promise<string | null> {
    try {
        console.log('Fetching series info from TMDB for IMDb ID:', imdbId);
        const fullImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
        
        const apiKey = getTmdbApiKey();
        const tmdbAxios = axios.create({
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        const findResponse = await tmdbAxios.get<TMDBFindResponse>(
            `https://api.themoviedb.org/3/find/${fullImdbId}?api_key=${apiKey}&external_source=imdb_id`
        );

        console.log('TMDB Find Response:', JSON.stringify(findResponse.data, null, 2));

        if (findResponse.data.tv_results && findResponse.data.tv_results.length > 0) {
            const tmdbId = findResponse.data.tv_results[0].id;
            
            const detailsResponse = await tmdbAxios.get<TMDBTVDetails>(
                `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=it-IT`
            );

            console.log('TMDB Details Response:', JSON.stringify(detailsResponse.data, null, 2));
            const title = detailsResponse.data.name || detailsResponse.data.original_name;
            console.log('Found series title:', title);
            return title;
        }
        
        console.log('No TV series found in TMDB response');
        return null;
    } catch (error) {
        console.error('Error fetching series title from TMDB:', error);
        return null;
    }
}

export async function scrapeEurostreaming(imdbId: string, season: string, episode: string): Promise<StremioStream[] | null> {
    console.log(`Scraping for IMDB: ${imdbId}, Season: ${season}, Episode: ${episode}`);
    const streams: StremioStream[] = [];

    try {
        const seriesTitle = await getSeriesTitle(imdbId);
        
        if (!seriesTitle) {
            console.log('Could not find series title in TMDB');
            return null;
        }

        console.log(`Searching Eurostreaming for title: "${seriesTitle}"`);

        const searchParams = new URLSearchParams({
            do: 'search',
            subaction: 'search',
            search_start: '0',
            full_search: '0',
            result_from: '1',
            story: seriesTitle
        });

        const response = await fetch(`${baseurl}index.php`, {
            method: 'POST',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
                "Connection": "keep-alive",
                "Referer": baseurl
            },
            body: searchParams.toString()
        });

        console.log('Search response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const searchResponse = await response.text();
        console.log('Search response length:', searchResponse.length);
        console.log('Search response preview:', searchResponse.substring(0, 500));

        const searchRegex = /<h2><a href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        const matches = Array.from(searchResponse.matchAll(searchRegex));
        
        console.log('Found matches:', matches.length);
        
        const seriesUrls = matches
            .filter(match => {
                const title = match[2].toLowerCase();
                const searchTitle = seriesTitle.toLowerCase();
                console.log(`Comparing "${title}" with "${searchTitle}"`);
                return title.includes(searchTitle);
            })
            .map(match => match[1]);

        console.log('Filtered series URLs:', seriesUrls);

        for (const url of seriesUrls) {
            console.log('Checking series page:', url);
            const episodeFetch = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Referer": baseurl
                }
            });

            const episodeData = await episodeFetch.text();
            console.log('Episode page content length:', episodeData.length);

            // Save episode content for debugging
            console.log('Episode page preview:', episodeData.substring(0, 1000));
            
            // Look for the episode section first
            const episodePatterns = [
                `${season}x${episode}[^<]*?<a`,
                `${season}×${episode}[^<]*?<a`,
                `Episodio\\s*${episode}\\s*Stagione\\s*${season}`,
                `S${season}E${episode}`,
                `Stagione\\s*${season}\\s*Episodio\\s*${episode}`
            ];

            let episodeContent = '';
            for (const pattern of episodePatterns) {
                console.log('Trying episode pattern:', pattern);
                const episodeRegex = new RegExp(pattern, 'i');
                const episodeMatch = episodeData.match(episodeRegex);
                if (episodeMatch) {
                    console.log('Found episode section:', episodeMatch[0]);
                    // Get content around the match
                    const startIndex = Math.max(0, episodeMatch.index! - 200);
                    const endIndex = Math.min(episodeData.length, episodeMatch.index! + 1000);
                    episodeContent = episodeData.substring(startIndex, endIndex);
                    break;
                }
            }

            if (episodeContent) {
                console.log('Found episode content section:', episodeContent);
                
                // Now look for Supervideo link in the episode section
                const supervideo = /href="([^"]+)"[^>]*>Supervideo/i.exec(episodeContent);
                if (supervideo) {
                    console.log('Found Supervideo link:', supervideo[1]);                    const modifiedUrl = supervideo[1]
                        .replace(/supervideo\.tv\/([^.]+)\.html?$/, 'supervideo.tv/e/$1')
                        .replace(/supervideo\.tv\/([^/]+)$/, 'supervideo.tv/e/$1');
                    
                    console.log('Modified Supervideo URL:', modifiedUrl);
                    
                    const streamUrl = await evalResolver(new URL(modifiedUrl));
                    if (streamUrl) {
                        console.log('Found stream URL:', streamUrl);
                        streams.push({
                            name: "Eurostreaming",
                            url: streamUrl,
                            title: `Eurostreaming - Supervideo IT`,
                            behaviorHints: {
                                bingeGroup: `it_supervideo`
                            }
                        });
                    }
                } else {
                    console.log('No Supervideo link found in episode section');
                }
            } else {
                console.log('Could not find episode section in page');
            }
        }

        console.log(`Found ${streams.length} streams`);
        return streams.length > 0 ? streams : null;

    } catch (error) {
        console.error('Error in scrapeEurostreaming:', error);
        return null;
    }
}
