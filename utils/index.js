const { xmlText } = require("../helpers/xml-text");
const { XMLParser, XMLValidator } = require("fast-xml-parser");

const XMLparser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
});

const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5 MiB, measured on the decoded response stream

const CACHE_TTL = 1 * 60 * 1000; // 1 minute in milliseconds

let cachedItems = null;
let cacheExpiresAt = 0;
let refreshPromise = null;
let cacheBuildDate = null;

const fetchSourceRSS = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Fordham-RSS-Transformer/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`RSS request failed with status ${res.status}`);
    }
    if (!res.body) throw new Error("Source feed response has no body");

    const chunks = [];
    let bytes = 0;
    for await (const chunk of res.body) {
      bytes += chunk.byteLength;
      if (bytes > MAX_SOURCE_BYTES) {
        throw new Error("Source feed exceeds the 5 MiB size limit");
      }
      chunks.push(Buffer.from(chunk));
    }
    const sourceXML = Buffer.concat(chunks, bytes).toString("utf8");
    if (XMLValidator.validate(sourceXML) !== true) {
      throw new Error("Source response contains invalid XML");
    }

    /* Parse XML into JavaScript */
    const parsedRSS = XMLparser.parse(sourceXML);

    const channel = parsedRSS?.rss?.channel;
    if (channel == null || Array.isArray(channel) ||
        (typeof channel !== "object" && channel !== "")) {
      throw new Error("Source response is not a valid RSS channel");
    }

    const rawItems = channel.item;
    return rawItems == null ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
  } catch (error) {
    console.error("Error fetching source RSS:", error);
    throw error;
  }
};

const querySearchFilter = (req, items) => {
  // Filter items by category if the 'category' query parameter is provided
  const requestedCategories = Array.isArray(req.query.category)
    ? req.query.category
    : [req.query.category];

  const requestedCategorySet = new Set(
    requestedCategories.map((category) => xmlText(category).toLowerCase()),
  );

  return items.filter((item) => {
    const categories = item.category
      ? Array.isArray(item.category)
        ? item.category
        : [item.category]
      : [];

    return categories.some((category) => requestedCategorySet.has(xmlText(category).toLowerCase()));
  });
};

const cacheSourceRSS = async (getData) => {
  const now = Date.now();

  if (cachedItems && now < cacheExpiresAt) {
    return {
      items: cachedItems,
      buildDate: cacheBuildDate,
    };
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = getData()
    .then((items) => {
      cachedItems = items;
      cacheBuildDate = new Date().toUTCString();
      cacheExpiresAt = Date.now() + CACHE_TTL;

      return {
        items: cachedItems,
        buildDate: cacheBuildDate,
      };
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

module.exports = {
  fetchSourceRSS,
  querySearchFilter,
  cacheSourceRSS,
};
