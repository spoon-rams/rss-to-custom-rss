const requiredUrl = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return value;
};

const FEED_URL = requiredUrl("FEED_URL");
const RSS_URL = requiredUrl("RSS_URL");
const PORT = Number(process.env.PORT ?? 8000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

module.exports = {
  FEED_URL,
  RSS_URL,
  PORT,
};
