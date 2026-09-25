const { cacheSourceRSS, fetchSourceRSS } = require("../utils/index.js");
const { transformItem } = require("../helpers/index.js");
<<<<<<< HEAD

const RSS_URL = process.env.RSS_URL;
=======
const { RSS_URL } = require("../config/env.js");
>>>>>>> optimization-cache

const getFeedItems = async () => {
  return cacheSourceRSS(async () => {
    const sourceItems = await fetchSourceRSS(RSS_URL);

    return sourceItems.map(transformItem);
  });
};

module.exports = {
  getFeedItems,
};
<<<<<<< HEAD
n
=======
>>>>>>> optimization-cache
