const fetchSourceRSS = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Fordham-RSS-Transformer/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) {
      throw new Error(`RSS request failed with status ${res.status}`);
    }
    const sourceXML = await res.text();
    return sourceXML;
  } catch (error) {
    console.error("Error fetching source RSS:", error);
    throw error;
  }
};

module.exports = {
  fetchSourceRSS,
};
