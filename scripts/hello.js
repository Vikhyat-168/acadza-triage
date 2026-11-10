const { ask, MODEL } = require("../src/llm");

(async () => {
  const { text, usage } = await ask({
    system: "You are a terse assistant.",
    user: "Reply with exactly: LLM connected",
    maxTokens: 1000,
  });
  console.log("model:", MODEL);
  console.log("reply:", text);
  console.log("tokens:", usage);
})();
