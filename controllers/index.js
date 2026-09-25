const { XMLBuilder } = require("fast-xml-parser");
const { querySearchFilter } = require("../utils/index.js");
const { getFeedItems } = require("../services/index.js");

const XMLbuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
});

// RSS FEED CONTROLLER - LOCALIST
const convertRSStoCustomRSS = async (req, res) => {

  try {
    const items = await getFeedItems();

    /* Convert every item */
    const filteredRSSItems =
      req.query.category && req.query.category.length > 0 ? querySearchFilter(req, items) : items;

    /* Create Target XML Object */
    const convertedData = {
      rss: {
        "@_version": "2.0",
        "@_xmlns:dc": "http://purl.org/dc/elements/1.1/",
        "@_xmlns:geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
        "@_xmlns:media": "http://search.yahoo.com/mrss/",
        "@_xmlns:xCal": "urn:ietf:params:xml:ns:xcal",
        channel: {
          title: "Fordham Localist Events Remap RSS feeds",
          link: "https://localhost:3000/localist/events/feed",
          description: "Fordham University Events Localist RSS feed remapped to a custom format",
          language: "en-us",
          lastBuildDate: new Date().toUTCString(),
          query: req.query.category ? req.query.category : undefined,
          item: filteredRSSItems,
        },
      },
    };

    /* Convert JavaScript Object → XML */
    const convertedXML = XMLbuilder.build(convertedData);

    /* Return XML */
    const newXMLOutput = `<?xml version="1.0" encoding="UTF-8"?>\n${convertedXML}`;

    res.set("Content-Type", "application/xml; charset=utf-8").send(newXMLOutput);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to generate event feed",
      message: error.message,
    });
  }
};

module.exports = { convertRSStoCustomRSS };
