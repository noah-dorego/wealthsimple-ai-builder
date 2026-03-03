import { parse, HTMLElement } from "node-html-parser";
import Parser from "rss-parser";

const rssParser = new Parser();

export const SCRAPER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-CA,en-US;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

// Per-source CSS selectors targeting article link <a> elements directly.
const SOURCE_SELECTORS: Record<string, string> = {
  "https://www.canada.ca/en/news/advanced-news-search/news-results.html?typ=newsreleases&dprtmnt=revenueregulator":
    "article.item a[href]",
  "https://www.ciro.ca/newsroom/news-releases": "div.views-field-title a[href]",
  "https://www.ciro.ca/newsroom/publications": "div.views-field-title a[href]",
  "https://www.osc.ca/en/securities-law/orders-rulings-decisions":
    "div.table-listings__content a[href]",
  "https://www.securities-administrators.ca/news/": "article a[href]",
  "https://fintrac-canafe.canada.ca/pen/4-eng": "main a[href]",
  "https://www.osfi-bsif.gc.ca/en/news": "a.title--link[href]",
  "https://www.canada.ca/en/news/advanced-news-search/news-results.html":
    "article.item a[href]",
  "https://www.canada.ca/en/department-finance/news.html": "main a[href]",
  "https://www.payments.ca/insights/newsroom": "article.teaser a[href]",
};

// Walk up the DOM from an anchor looking for a <time datetime="..."> element.
// Stops after 6 levels to avoid traversing the entire document.
function extractPublishedDate(a: HTMLElement): string | undefined {
  let node: HTMLElement | null = a.parentNode as HTMLElement | null;
  for (let i = 0; i < 6; i++) {
    if (!node) break;
    const time = node.querySelector("time[datetime]");
    if (time) {
      const dt = time.getAttribute("datetime");
      if (dt) return dt;
    }
    node = node.parentNode as HTMLElement | null;
  }
  return undefined;
}

export async function extractRssItems(
  xml: string,
): Promise<Array<{ url: string; title?: string; published_at?: string }>> {
  let feed: Awaited<ReturnType<typeof rssParser.parseString>>;

  try {
    feed = await rssParser.parseString(xml);
  } catch (err) {
    throw new Error(
      `RSS parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return feed.items
    .slice(0, 5)
    .map((item) => ({
      url: item.link ?? item.guid ?? "",
      title: item.title?.trim(),
      published_at: item.isoDate ?? item.pubDate,
    }))
    .filter((item) => item.url !== "");
}

export function extractArticleLinks(
  html: string,
  sourceUrl: string,
): Array<{ url: string; title?: string; published_at?: string }> {
  const root = parse(html);

  const specificSelector = SOURCE_SELECTORS[sourceUrl];
  let anchors = specificSelector
    ? root.querySelectorAll(specificSelector)
    : root.querySelectorAll(
        'main a[href], article a[href], [role="main"] a[href]',
      );

  // Generic fallback if content-area heuristic returns too few results
  if (!specificSelector && anchors.length < 3) {
    anchors = root.querySelectorAll("a[href]");
  }

  const seen = new Set<string>();
  const results: Array<{ url: string; title?: string; published_at?: string }> =
    [];

  for (const a of anchors) {
    if (results.length >= 5) break;

    const href = a.getAttribute("href");
    if (!href) continue;

    if (href.startsWith("#")) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, sourceUrl);
    } catch {
      continue;
    }

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
      continue;
    if (resolved.pathname === "/") continue;
    if (resolved.href === sourceUrl) continue;
    if (seen.has(resolved.href)) continue;

    const title = a.text?.trim() || undefined;
    if (title && title.length < 8) continue;

    seen.add(resolved.href);
    results.push({
      url: resolved.href,
      title,
      published_at: extractPublishedDate(a),
    });
  }

  return results;
}
