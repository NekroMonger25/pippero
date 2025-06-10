"use strict";
// Used by supervideo and dropload (previously intended for another embed)
// Used for the common eval packed method
Object.defineProperty(exports, "__esModule", { value: true });
exports.evalResolver = evalResolver;
exports.deobfuscate = deobfuscate;
const vm = require('vm');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
let browser = null;
async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
    }
    return browser;
}
async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getVideoPage(url) {
    try {
        // First try with normal fetch
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
        const response = await fetch(url.toString(), {
            headers: headers,
            redirect: 'follow'
        });
        // If we get a successful response, return it
        if (response.ok) {
            return response;
        }
        // If we get here, we need to use Puppeteer to bypass CloudFlare
        console.log('Using Puppeteer to bypass CloudFlare...');
        const browser = await getBrowser();
        const page = await browser.newPage();
        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(headers['User-Agent']);
        // Navigate to the URL
        console.log('Navigating to URL with Puppeteer:', url.toString());
        await page.goto(url.toString(), {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        // Wait for CloudFlare to be bypassed
        await page.waitForFunction(() => {
            return !document.querySelector('#cf-wrapper') &&
                !document.querySelector('.cf-browser-verification');
        }, { timeout: 30000 });
        // Get the final HTML content
        const content = await page.content();
        // Create a new Response object from the content
        const puppeteerResponse = new Response(content, {
            status: 200,
            headers: {
                'content-type': 'text/html'
            }
        });
        // Close the page but keep the browser instance for future use
        await page.close();
        return puppeteerResponse;
    }
    catch (error) {
        console.error('Error in getVideoPage:', error);
        // Make sure to close browser on error
        await closeBrowser();
        throw error;
    }
}
async function evalResolver(link) {
    try {
        console.log('evalResolver called with URL:', link.toString());
        const response = await getVideoPage(link);
        console.log('Video page response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const bodyText = await response.text();
        console.log('Video page content length:', bodyText.length);
        const $ = cheerio.load(bodyText);
        let script = null;
        $('script').each((_, element) => {
            const scriptContent = $(element).html();
            if (scriptContent && scriptContent.includes('eval(')) {
                script = scriptContent.replace('eval', 'console.log');
                return false;
            }
        });
        if (!script) {
            console.log('No eval script found in the page');
            return null;
        }
        const deobfuscated = await deobfuscate(script);
        const streamRegex = /{file:\"([^"]*)/;
        const stream = streamRegex.exec(deobfuscated);
        if (stream && stream[1]) {
            console.log('Found stream URL:', stream[1]);
            return stream[1];
        }
        return null;
    }
    catch (error) {
        console.error('Error in evalResolver:', error);
        return null;
    }
    finally {
        // Don't await this to avoid blocking if there's an error
        closeBrowser().catch(console.error);
    }
}
async function deobfuscate(script) {
    let capturedContent = "";
    try {
        const context = vm.createContext({
            console: {
                log: (msg) => {
                    const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
                    capturedContent += msgStr + "\n";
                }
            },
            eval: (code) => {
                context.console.log(code);
                return code;
            }
        });
        vm.runInContext(script, context, { timeout: 2000 });
        return capturedContent;
    }
    catch (error) {
        throw new Error(`Deobfuscation failed: ${error}`);
    }
}
