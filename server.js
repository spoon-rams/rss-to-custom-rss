import express from "express";
const app = express();

app.use("/localist", async (req, res) => {
 
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`RSS transformer running at http://localhost:${PORT}/events/feed`);
});
