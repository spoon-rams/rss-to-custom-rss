const express = require("express");
const router = express.Router();
const { convertRSStoCustomRSS } = require("../controllers/feed");

router.get("/events/feed", convertRSStoCustomRSS);

module.exports = router;
