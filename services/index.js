const { cacheSourceRSS, fetchSourceRSS } = require("../utils/index.js");
const { transformItem } = require("../helpers/index.js");
const { RSS_URL } = require("../helpers/config/env.js");


const getFeedItems = async () => {
  return cacheSourceRSS(async () => {
    const sourceItems = await fetchSourceRSS(RSS_URL);

    return sourceItems.map(transformItem);
  });
};

module.exports = {
  getFeedItems,
};
