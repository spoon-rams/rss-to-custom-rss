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
};

/*
|--------------------------------------------------------------------------
| Transform One RSS Item
|--------------------------------------------------------------------------
*/

const transformItem = (item) => {
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
};

/*
|--------------------------------------------------------------------------
| XML Feed Route
|--------------------------------------------------------------------------
*/

module.exports = { transformItem };