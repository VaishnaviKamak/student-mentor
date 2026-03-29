const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let chatHistory = [];
let isWaiting = false;

console.log("popup.js loaded");

function setStatus(state) {
  statusDot.className = "status-dot " + state;
  if (state === "idle") statusText.textContent = "Ready";
  if (state === "thinking") statusText.textContent = "Thinking...";
  if (state === "error") statusText.textContent = "Backend offline";
}

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  const id = "msg-" + Date.now();
  msg.id = id;

  if (sender === "mentor") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "🎓";
    msg.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msg.appendChild(bubble);

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;

  chatHistory.push({ sender, text });
  return id;
}

function updateMessage(id, text) {
  const msg = document.getElementById(id);
  if (!msg) return;
  const bubble = msg.querySelector(".bubble");
  if (bubble) bubble.textContent = text;
  chatHistory[chatHistory.length - 1].text = text;
}

function getProblemKey() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]?.url || "unknown");
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

function isSolutionRequest(q) {
  return (
    q.includes("give solution") ||
    q.includes("full solution") ||
    q.includes("solve this") ||
    q.includes("write code") ||
    q.includes("exact answer")
  );
}

/* Core Logic */
async function handleSend() {
  if (isWaiting) return;

  const question = input.value.trim();
  if (!question) return;

  addMessage(question, "user");
  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;
  isWaiting = true;
  setStatus("thinking");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "GET_CONTEXT" },
      async (context) => {
        if (!context || !context.problemText) {
          addMessage(
            "Please open a LeetCode problem page so I can help you 🙂",
            "mentor"
          );
          resetInput();
          return;
        }

        const q = question.toLowerCase();

        if (isSolutionRequest(q)) {
          addMessage(
            "I won't give direct solutions 🙂 Let's focus on understanding. What have you tried so far?",
            "mentor"
          );
          resetInput();
          return;
        }

        const loadingId = addMessage("...", "mentor");

        try {
          const res = await fetch("http://127.0.0.1:8000/mentor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              problem_text: context.problemText,
              user_code: context.userCode,
              question: question,
            }),
          });

          if (!res.ok) throw new Error("Backend error");

          const data = await res.json();
          updateMessage(loadingId, data.reply);

          const problemKey = await getProblemKey();
          saveChat(problemKey, chatHistory);
          setStatus("idle");
        } catch (e) {
          updateMessage(loadingId, "Sorry, I couldn't reach the mentor. Is the backend running?");
          setStatus("error");
          console.error(e);
        }

        resetInput();
      }
    );
  });
}

function resetInput() {
  input.disabled = false;
  sendBtn.disabled = false;
  isWaiting = false;
  input.focus();
}


window.addEventListener("DOMContentLoaded", async () => {
  setStatus("idle");

  const problemKey = await getProblemKey();
  chatHistory = await loadChat(problemKey);

  chat.innerHTML = "";

  if (chatHistory.length === 0) {
    addMessage(
      "Hi! I'm your mentor. Ask me anything about the problem you're solving 🙂",
      "mentor"
    );
    return;
  }

  chatHistory.forEach((m) => {
    const msg = document.createElement("div");
    msg.classList.add("message", m.sender);

    if (m.sender === "mentor") {
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = "🎓";
      msg.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.text;
    msg.appendChild(bubble);

    chat.appendChild(msg);
  });

  chat.scrollTop = chat.scrollHeight;
});

sendBtn.addEventListener("click", handleSend);

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSend();
});
