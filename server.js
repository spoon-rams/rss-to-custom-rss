const express = require("express");
const app = express();
const rssFeed = require("./routes/Feed");
const { PORT } = require("./config/env.js");

app.use("/localist", rssFeed);

app.listen(PORT, () => {
  console.log(`RSS converter running at http://localhost:${PORT}/localist/events/feed`);
});
