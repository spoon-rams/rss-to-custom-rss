const { XMLParser, XMLBuilder } = require("fast-xml-parser");
const { transformItem } = require("../helpers/index.js");
const RSS_URL = process.env.RSS_URL;


// RSS FEED CONTROLLER - LOCALIST
const convertRSStoCustomRSS = async (req, res) => {
  try {

    /* Fetch original RSS*/
    const fetchOriginalRSS = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Fordham-RSS-Transformer/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!fetchOriginalRSS.ok) {
      throw new Error(`RSS request failed with status ${fetchOriginalRSS.status}`);
    }

    const sourceXML = await fetchOriginalRSS.text();

    /* Parse XML into JavaScript */
    const parser = new XMLParser({
      ignoreAttributes: false,
    });

    const parsedRSS = parser.parse(sourceXML);

    /* Get RSS items */
    const rawItems = parsedRSS?.rss?.channel?.item;

    if (!rawItems) {
      throw new Error("No RSS items were found in the source feed.");
    }

    // Always make items an array
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    /* Transform Every Item */
    const transformedItems = items.map(transformItem);

    /* Create Target XML Object */
    const targetData = {
      rss: {
        "@_version": "2.0",
        "@_xmlns:dc": "http://purl.org/dc/elements/1.1/",
        "@_xmlns:geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
        "@_xmlns:media": "http://search.yahoo.com/mrss/",
        "@_xmlns:xCal": "urn:ietf:params:xml:ns:xcal",
        channel: {
          title: "Fordham Localist Events Remap RSS feeds",
          link: "https://now.fordham.edu/events/",
          description: "Fordham University Events Localist RSS feed remapped to a custom format",
          language: "en-us",
          lastBuildDate: new Date().toUTCString(),
          item: transformedItems,
        },
      },
    };

    /* Convert JavaScript Object → XML */
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });

    const targetXML = builder.build(targetData);

    /* Return XML */
    const xmlOutput = `<?xml version="1.0" encoding="UTF-8"?>\n${targetXML}`;

    res.set("Content-Type", "application/xml; charset=utf-8").send(xmlOutput);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to generate event feed",
      message: error.message,
    });
  }
};

module.exports = { convertRSStoCustomRSS };
