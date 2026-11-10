require("dotenv").config();
const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.MODEL || "llama-3.3-70b-versatile";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One place for every LLM call, so model and cost can be changed in one place.
async function ask({ system, user, maxTokens = 4000 }) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      return { text: res.choices[0].message.content, usage: res.usage };
    } catch (err) {
      const retryable = err.status === 503 || err.status === 429;
      if (!retryable || attempt === 5) throw err;
      const wait = attempt * 4000;
      console.log(
        `retry ${attempt} after ${err.status}, waiting ${wait / 1000}s`,
      );
      await sleep(wait);
    }
  }
}

module.exports = { ask, MODEL };
