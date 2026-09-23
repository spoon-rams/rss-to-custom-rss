const express = require("express");
const router = express.Router();
const { convertRSStoCustomRSS } = require("../controllers");

router.get("/events/feed/", convertRSStoCustomRSS);


module.exports = router;
