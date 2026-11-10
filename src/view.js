const cheerio = require("cheerio");

function mathToText(html) {
  const $ = cheerio.load(html, null, false);
  const walk = (n) => {
    if (!n) return "";
    if (n.type === "text") return n.data;
    if (n.type !== "tag") return "";
    const kids = (n.children || []).filter((c) => c.type === "tag");
    const all = () => (n.children || []).map(walk).join("");
    switch (n.name) {
      case "mfrac":
        return `(${walk(kids[0])})/(${walk(kids[1])})`;
      case "msup":
        return `${walk(kids[0])}^(${walk(kids[1])})`;
      case "msub":
        return `${walk(kids[0])}_(${walk(kids[1])})`;
      case "msubsup":
        return `${walk(kids[0])}_(${walk(kids[1])})^(${walk(kids[2])})`;
      case "msqrt":
        return `sqrt(${all()})`;
      case "mover":
        return `${walk(kids[0])} with ${walk(kids[1])} above`;
      case "mtr":
        return all() + " ; ";
      case "mtd":
        return all() + " ";
      default:
        return all();
    }
  };
  return $.root()
    .contents()
    .toArray()
    .map(walk)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

// raw HTML, but every <math> block becomes ⟦readable text⟧
function view(html) {
  return (html || "").replace(
    /<math[\s\S]*?<\/math>/g,
    (m) => `⟦${mathToText(m)}⟧`,
  );
}

// plain text, used for the independent solver
function plain(html) {
  return view(html)
    .replace(/<br\s*\/?>|<\/h3>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/g, "")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

module.exports = { view, plain };
