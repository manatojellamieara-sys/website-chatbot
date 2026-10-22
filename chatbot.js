(function () {
  const css = `
  #cb-btn{position:fixed;bottom:80px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:#7c3aed;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:9999}
 #cb-box{position:fixed;bottom:150px;right:20px;width:320px;max-width:calc(100vw - 40px);height:420px;background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:9999;font-family:Quicksand,sans-serif}
  #cb-head{background:#7c3aed;color:#fff;padding:12px 14px;font-weight:700}
  #cb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8f7fc}
  .cb-m{padding:8px 12px;border-radius:12px;max-width:85%;font-size:14px;line-height:1.4;color:#222}
  .cb-bot{background:#e9e4f7;align-self:flex-start}
  .cb-user{background:#7c3aed;color:#fff;align-self:flex-end}
  #cb-form{display:flex;border-top:1px solid #ddd}
  #cb-input{flex:1;border:none;padding:12px;font-size:14px;outline:none}
  #cb-send{border:none;background:#7c3aed;color:#fff;padding:0 16px;cursor:pointer}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button id="cb-btn" aria-label="Open chat">💬</button>
    <div id="cb-box">
      <div id="cb-head">Ask about Jella</div>
      <div id="cb-msgs"></div>
      <form id="cb-form">
        <input id="cb-input" placeholder="Type your question..." autocomplete="off" maxlength="500" />
        <button id="cb-send" type="submit">Send</button>
      </form>
    </div>`,
  );

  const btn = document.getElementById("cb-btn");
  const box = document.getElementById("cb-box");
  const msgs = document.getElementById("cb-msgs");
  const form = document.getElementById("cb-form");
  const input = document.getElementById("cb-input");

  function add(text, who) {
    const d = document.createElement("div");
    d.className = "cb-m " + (who === "user" ? "cb-user" : "cb-bot");
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  add(
    "Hi! Ask me anything about Jella's skills, projects, or this website.",
    "bot",
  );

  btn.addEventListener("click", () => {
    box.style.display = box.style.display === "flex" ? "none" : "flex";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    add(text, "user");
    input.value = "";
    const typing = add("Typing...", "bot");
    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      typing.textContent = data.reply;
    } catch {
      typing.textContent = "Sorry, I couldn't connect. Please try again.";
    }
  });
})();
