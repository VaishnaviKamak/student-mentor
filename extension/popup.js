const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let chatHistory = [];

console.log("popup.js loaded");


/* -----------------------------
   Helpers: Chat Rendering
-------------------------------- */
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  const id = "msg-" + Date.now();
  msg.id = id;

  msg.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;  //scrolls content to bottom

  chatHistory.push({ sender, text });
  return id;
}

/* -----------------------------
   Helpers: Storage
-------------------------------- */
function getProblemKey() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0].url);
    });
  });
}

function saveChat(problemKey, messages) {
  chrome.storage.local.set({ [problemKey]: messages });
}

function loadChat(problemKey) {
  return new Promise((resolve) => {
    chrome.storage.local.get([problemKey], (result) => {
      resolve(result[problemKey] || []);
    });
  });
}

/* -----------------------------
   Intent Guards
-------------------------------- */
function isSolutionRequest(q) {
  return (
    q.includes("give solution") ||
    q.includes("full solution") ||
    q.includes("solve this") ||
    q.includes("write code") ||
    q.includes("exact answer")
  );
}

/* -----------------------------
   Core Logic
-------------------------------- */
async function handleSend() {

  console.log("handleSend fired");

  const question = input.value.trim();
  if (!question) return;

  addMessage(question, "user");
  input.value = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "GET_CONTEXT" },
      async (context) => {

        console.log("Context received:", context);
        if (!context || !context.problemText) {
          addMessage(
            "Please open a LeetCode problem so I can help you 🙂",
            "mentor"
          );
          return;
        }

        const q = question.toLowerCase();

        // 🚫 Block solution requests
        if (isSolutionRequest(q)) {
          addMessage(
            "I won’t give direct solutions 🙂 Let’s focus on understanding. What have you tried so far?",
            "mentor"
          );
          return;
        }

        // ⏳ Loading message
        const loadingId = addMessage("Thinking...", "mentor");

        try {
          const res = await fetch("http://127.0.0.1:8000/mentor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              problem_text: context.problemText,
              user_code: context.userCode,
              question: question
            })
          });

          if (!res.ok) throw new Error("Backend error");

          const data = await res.json();
          document.getElementById(loadingId).textContent = data.reply;

          // 🔹 Update stored mentor message
          chatHistory[chatHistory.length - 1].text = data.reply;

          // 💾 Save chat
          const problemKey = await getProblemKey();
          saveChat(problemKey, chatHistory);

        } catch (e) {
          const errorMsg =
            "Sorry, I couldn’t reach the mentor. Please try again.";

          document.getElementById(loadingId).textContent = errorMsg;
          chatHistory[chatHistory.length - 1].text = errorMsg;

          const problemKey = await getProblemKey();
          saveChat(problemKey, chatHistory);

          console.error(e);
        }
      }
    );
  });
}

/* -----------------------------
   Load Chat on Popup Open
-------------------------------- */
window.addEventListener("DOMContentLoaded", async () => {
  const problemKey = await getProblemKey();
  chatHistory = await loadChat(problemKey);

  chat.innerHTML = "";

  if (chatHistory.length === 0) {
    addMessage(
      "Hi! I’m your mentor. Ask me about the problem you’re solving 🙂",
      "mentor"
    );
    return;
  }

  chatHistory.forEach(m => {
    const msg = document.createElement("div");
    msg.classList.add("message", m.sender);
    msg.textContent = m.text;
    chat.appendChild(msg);
  });

  chat.scrollTop = chat.scrollHeight;
});

/* -----------------------------
   Event Listeners
-------------------------------- */
sendBtn.addEventListener("click", handleSend);

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSend();
});
