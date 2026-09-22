import express from "express";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const app = express();
const RSS_URL = process.env.RSS_URL;

/*
|--------------------------------------------------------------------------
| Parse Title
|--------------------------------------------------------------------------
|
| Example:
|
| September 25: Presidential Inauguration Lecture at Lincoln Center
|
| becomes:
|
| title: Presidential Inauguration Lecture
| location: Lincoln Center
|
*/

function parseTitle(sourceTitle) {
  if (!sourceTitle) {
    return {
      title: "",
      location: "",
    };
  }

  // Find the first colon
  const colonIndex = sourceTitle.indexOf(":");

  // Remove everything before and including the first colon
  const titleWithoutDate =
    colonIndex !== -1 ? sourceTitle.slice(colonIndex + 1).trim() : sourceTitle.trim();

  // Find the FINAL " at "
  const lastAtIndex = titleWithoutDate.lastIndexOf(" at ");

  // If no " at " exists, keep the entire thing as the title
  if (lastAtIndex === -1) {
    return {
      title: titleWithoutDate,
      location: "",
    };
  }

  const title = titleWithoutDate.slice(0, lastAtIndex).trim();
  const location = titleWithoutDate.slice(lastAtIndex + 4).trim();

  return {
    title,
    location,
  };
}

/*
|--------------------------------------------------------------------------
| Parse Date
|--------------------------------------------------------------------------
|
| Example:
|
| Fri, 25 Sep 2026 18:00:00 -0400
|
| becomes:
|
| start-date: 2026-09-25
| start-month: 09
| start-day: Friday
|
*/

function parseDate(pubDate) {
  if (!pubDate) {
    return {
      startDate: "",
      startMonth: "",
      startDay: "",
    };
  }

  const date = new Date(pubDate);

  if (Number.isNaN(date.getTime())) {
    return {
      startDate: "",
      startMonth: "",
      startDay: "",
    };
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(date);

  return {
    startDate: day,
    startMonth: month,
    startDay: dayOfWeek,
  };
}

/*
|--------------------------------------------------------------------------
| Transform One RSS Item
|--------------------------------------------------------------------------
*/

function transformItem(item) {
  const { title, location } = parseTitle(item.title);
  const { startDate, startMonth, startDay } = parseDate(item.pubDate);
  const { description, link } = item;

  console.log(item);
  return {
    title,
    location,
    description,
    link,
    "start-date": startDate,
    "start-month": startMonth,
    "start-day": startDay,
  };
}

/*
|--------------------------------------------------------------------------
| XML Feed Route
|--------------------------------------------------------------------------
*/

app.get("/events/feed", async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Fetch original RSS
    |--------------------------------------------------------------------------
    */

    const response = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Fordham-RSS-Transformer/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`RSS request failed with status ${response.status}`);
    }

    const sourceXML = await response.text();

    /*
    |--------------------------------------------------------------------------
    | Parse XML into JavaScript
    |--------------------------------------------------------------------------
    */

    const parser = new XMLParser({
      ignoreAttributes: false,
    });

    const parsedRSS = parser.parse(sourceXML);

    /*
    |--------------------------------------------------------------------------
    | Get RSS items
    |--------------------------------------------------------------------------
    */

    const rawItems = parsedRSS?.rss?.channel?.item;

    if (!rawItems) {
      throw new Error("No RSS items were found in the source feed.");
    }

    // Always make items an array
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    /*
    |--------------------------------------------------------------------------
    | Transform Every Item
    |--------------------------------------------------------------------------
    */

    const transformedItems = items.map(transformItem);

    /*
    |--------------------------------------------------------------------------
    | Create Target XML Object
    |--------------------------------------------------------------------------
    */

    const targetData = {
      rss: {
        "@_version": "2.0",

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

    /*
    |--------------------------------------------------------------------------
    | Convert JavaScript Object → XML
    |--------------------------------------------------------------------------
    */

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });

    const targetXML = builder.build(targetData);

    /*
    |--------------------------------------------------------------------------
    | Return XML
    |--------------------------------------------------------------------------
    */

    const xmlOutput = `<?xml version="1.0" encoding="UTF-8"?>\n${targetXML}`;

    res.set("Content-Type", "application/xml; charset=utf-8").send(xmlOutput);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to generate event feed",
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`RSS transformer running at http://localhost:${PORT}/events/feed`);
});
