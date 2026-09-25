const { eventDateFormatter } = require("./config/formatters");

/***
 * @function: Parse Title
 * INPUT:
 * @parm {string} sourceTitle - The title string from the RSS feed
 * Example:
 * "September 25: Presidential Inauguration Lecture at Lincoln Center"
 * OUTPUT:
 * @returns {object} - An object containing the parsed title and location
 * Example:
 * {
 *   title: "Presidential Inauguration Lecture",
 *   location: "Lincoln Center"
 * }
 * @description: This function takes a title string from the Localist RSS feed and parses it to extract the main title and location. It removes any date information and splits the title based on the last occurrence of " at " so the title stands along and so does the location.
 */

const parseTitle = (sourceTitle) => {
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
};

/***
 * @function: Parse Date
 * INPUT:
 * @param {string} pubDate - The publication date string from the RSS feed
 * OUTPUT:
 * @returns {object} - An object containing the parsed date information
 * Example:
 * {
 *   startDate: "25",
 *   startMonth: "September",
 *   startDay: "Friday"
 * }
 * @description: This function takes a publication date string from the Localist RSS feed and parses it to extract the start date, month, and day, then converts it to the above desired format.
 */

const parseDate = (pubDate) => {
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

  let startDate = "";
  let startMonth = "";
  let startDay = "";

  const parts = eventDateFormatter.formatToParts(date);

  for (const part of parts) {
    if (part.type === "day") {
      startDate = part.value;
    } else if (part.type === "month") {
      startMonth = part.value;
    } else if (part.type === "weekday") {
      startDay = part.value;
    }
  }

  return {
    startDate,
    startMonth,
    startDay,
  };
};

/***
 * @function: Convert RSS Item
 * INPUT:
 * @param {object} item - An individual RSS item object from the parsed RSS feed
 * OUTPUT:
 * @returns {object} - A transformed RSS item object
 * @description: This function takes an individual RSS item object from the parsed RSS feed and transforms it into a custom format that also includes the parsed updated title and date. It then is the only function that is used in the controller to transform the entire feed and returned to the client.
 */

const transformItem = (item) => {
  const { title, location } = parseTitle(item.title);
  const { startDate, startMonth, startDay } = parseDate(item.pubDate);
  const {
    description,
    link,
    pubDate,
    category,
    guid,
    "geo:lat": latitude,
    "geo:long": longitude,
    "dc:date": dateCreated,
    "media:content": mediaContent,
  } = item;

  return {
    "start-date": startDate,
    "start-month": startMonth,
    "start-day": startDay,
    title,
    location,
    description,
    link,
    "media:content": mediaContent,
    "geo:lat": latitude,
    "geo:long": longitude,
    pubDate,
    "dc:date": dateCreated,
    category,
    guid,
  };
};

module.exports = { transformItem };
