const PRIMARY = process.env.GEMINI_MODEL || "gemini-flash-latest";
const MODELS = [
  ...new Set([PRIMARY, "gemini-flash-lite-latest"]),
].slice(0, 2);
const PAGES = ["index", "about", "skills", "projects", "contact"];

let cache = { text: "", time: 0 };

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function getSiteText(baseUrl) {
  if (cache.text && Date.now() - cache.time < 10 * 60 * 1000) return cache.text;
  const parts = await Promise.all(
    PAGES.map(async (p) => {
      try {
        const r = await fetchWithTimeout(`${baseUrl}/${p}.html`, {}, 2000);
        if (!r.ok) return "";
        return `[${p.toUpperCase()} PAGE]\n${toText(await r.text())}`;
      } catch {
        return "";
      }
    })
  );
  const text = parts.filter(Boolean).join("\n\n");
  if (text) cache = { text, time: Date.now() };
  return text;
}

async function askGemini(model, system, message) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
      }),
    },
    7000
  );
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  return { text, error: data?.error?.message || "" };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  try {
    const { message } = JSON.parse(event.body || "{}");
    if (!message || message.length > 500) {
      return {
        statusCode: 400,
        body: JSON.stringify({ reply: "Please ask a short question." }),
      };
    }

    if (!process.env.GEMINI_API_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          reply: "Error: GEMINI_API_KEY is missing in Netlify environment variables.",
        }),
      };
    }

    const baseUrl = `https://${event.headers.host}`;
    const siteText = await getSiteText(baseUrl);

    const system = `You are the assistant on Jella Mieara D. Manato's portfolio website.
Answer questions using ONLY the website content below.
If the answer is not in the content, say you don't know and suggest the Contact page.
Never make up details such as age, address, or grades.
Keep answers short and friendly.

WEBSITE CONTENT:
${siteText}`;

    for (const model of MODELS) {
      try {
        const { text, error } = await askGemini(model, system, message);
        if (text) {
          return { statusCode: 200, body: JSON.stringify({ reply: text }) };
        }
        console.log(`Model ${model} returned no text: ${error}`);
      } catch (e) {
        console.log(`Model ${model} error: ${e.message}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: "The AI is very busy right now. Please try again in a minute.",
      }),
    };
  } catch (err) {
    console.log("Handler error:", err.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: "Something went wrong. Please try again." }),
    };
  }
};
