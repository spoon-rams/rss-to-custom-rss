const xmlText = (value) => {
  if (value == null) return "";
  if (typeof value === "object") return xmlText(value["#text"]);
  return String(value);
};

module.exports = { xmlText };
