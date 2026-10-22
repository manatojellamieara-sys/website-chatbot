const SYSTEM = `You are the assistant on Jella Mieara D. Manato's portfolio website.
Answer only questions about Jella and this website, using the info below.
If the answer isn't in the info, say you don't know and suggest the Contact page.
Keep answers short and friendly.

INFO:
- Jella is a 4th-year BSIT student and student-athlete, and an aspiring data analyst.
- Skills: Basic HTML, Basic CSS, Java, Basic SQL, UI/UX, Responsible, Adaptability, Creativity.
- Pages: Home, About Me, Skills, Projects, Contact.
- (Add more details about Jella here.)`;

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
        }),
      },
    );

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I can't answer right now. Please try again later.";

    return { statusCode: 200, body: JSON.stringify({ reply }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        reply: "Something went wrong. Please try again.",
      }),
    };
  }
};
