const { XMLParser } = require("fast-xml-parser");

const XMLparser = new XMLParser({
  ignoreAttributes: false,
});

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
    const sourceXML = await res.text();

    /* Parse XML into JavaScript */
    const parsedRSS = XMLparser.parse(sourceXML);

    /* Get RSS items */
    const rawItems = parsedRSS?.rss?.channel?.item;

    if (!rawItems) {
      throw new Error("No RSS items were found in the source feed.");
    }

    // Always make items an array
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    return items;
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
    requestedCategories.map((category) => category.toLowerCase()),
  );

  // console.log("QUERY CATEGORY:", req.query.category);
  // console.log("SAMPLE ITEM CATEGORY:", items[0]?.category);
  // console.log("REQUESTED:", [...requestedCategorySet]);

  return items.filter((item) => {
    const categories = item.category
      ? Array.isArray(item.category)
        ? item.category
        : [item.category]
      : [];

    //console.log("ITEM CATEGORIES:", categories);

    return categories.some((category) => requestedCategorySet.has(category.toLowerCase()));
  });
};

const cacheSourceRSS = async (getData) => {
  const now = Date.now();

  if (cachedItems && now < cacheExpiresAt) {
    return cachedItems;
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
