const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Helper: add message to chat
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function isAskingForSolution(question) {
  const forbidden = [
    "give solution",
    "write code",
    "full solution",
    "solve this",
    "exact code",
    "answer",
    "complete approach"
  ];

  return forbidden.some(word =>
    question.toLowerCase().includes(word)
  );
}

function isLikelyUnrelated(question, problemText) {
  if (!problemText) return true;

  const qWords = question.toLowerCase().split(/\W+/);
  const pWords = problemText.toLowerCase();

  // Count overlapping keywords
  const overlap = qWords.filter(
    w => w.length > 3 && pWords.includes(w)
  );

  return overlap.length === 0;
}

// Handle send
function handleSend() {
  const question = input.value.trim();
  if (!question) return;

  // Show user message
  addMessage(question, "user");
  input.value = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "GET_CONTEXT" },
      (context) => {

        // 1️⃣ No problem context
        if (!context || !context.problemText) {
          addMessage(
            "Please open a LeetCode problem so I can help you 🙂",
            "mentor"
          );
          return;
        }

        const q = question.toLowerCase();

        // 2️⃣ Block direct solution requests
        if (
          q.includes("give solution") ||
          q.includes("full solution") ||
          q.includes("solve this") ||
          q.includes("write code") ||
          q.includes("exact answer")
        ) {
          addMessage(
            "I won’t give direct solutions 🙂 Let’s focus on understanding the problem. What have you tried so far?",
            "mentor"
          );
          return;
        }

        // 3️⃣ Explanation requests
        if (
          q.includes("explain the problem") ||
          q.includes("understand the problem") ||
          q.includes("what is the problem")
        ) {
          addMessage(
            "Sure. Let’s break the problem down together. What are the inputs, and what output is expected?",
            "mentor"
          );
          return;
        }

        // 4️⃣ Debugging requests
        if (
          q.includes("why does my code") ||
          q.includes("what is wrong with my code") ||
          q.includes("bug") ||
          q.includes("error") ||
          q.includes("fails")
        ) {
          addMessage(
            "Good debugging question. Try running your code on the smallest input and walk through it line by line. Where does it behave differently than expected?",
            "mentor"
          );
          return;
        }

        // 5️⃣ Out-of-context detection (lightweight)
        const keywords = q.split(/\W+/).filter(w => w.length > 3);
        const problemTextLower = context.problemText.toLowerCase();

        const overlap = keywords.filter(w =>
          problemTextLower.includes(w)
        );

        if (overlap.length === 0) {
          addMessage(
            "Let’s stay focused on the problem you’re solving. Try asking about edge cases, constraints, or your current approach.",
            "mentor"
          );
          return;
        }

        // 6️⃣ Valid mentoring fallback
        addMessage(
          "Good question. Let’s think step by step. What happens in the simplest possible input case?",
          "mentor"
        );

        // Debug logs (keep for now)
        console.log("📘 Problem Text:", context.problemText.slice(0, 200));
        console.log("💻 User Code:", context.userCode);
      }
    );
  });
}


// Button click
sendBtn.addEventListener("click", handleSend);

// Enter key
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSend();
  }
});
