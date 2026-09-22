const express = require("express");
const app = express();
const rssFeed = require("./routes/Feed");

app.use("/localist", rssFeed);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`RSS transformer running at http://localhost:${PORT}/events/feed`);
});
