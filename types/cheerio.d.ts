declare module 'cheerio' {
    interface Cheerio {
        html(): string | null;
    }

    interface CheerioStatic {
        (selector: string): Cheerio;
        load(html: string): CheerioStatic;
    }

    interface Element {
        type: string;
        name: string;
        attribs: { [key: string]: string };
        children: Element[];
    }

    export function load(html: string): CheerioStatic;
}
