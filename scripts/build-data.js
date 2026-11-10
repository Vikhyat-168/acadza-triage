const fs = require("fs");
const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
fs.mkdirSync("public", { recursive: true });
const DATA = {
  questions: rd("data/questions.json"),
  reports: rd("data/reports.json"),
  results: rd("results.json"),
};
fs.writeFileSync("public/data.js", "window.DATA=" + JSON.stringify(DATA) + ";");
console.log("public/data.js written:", DATA.results.length, "results");
