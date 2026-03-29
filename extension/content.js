console.log("Student Mentor content script loaded");


if (!window.location.pathname.includes("/problems/")) {
  console.log("Not a LeetCode problem URL");
} else {
  console.log("LeetCode problem URL confirmed");
}

const studentMentorContext = {
  problemText: "",
  userCode: "",
};

function waitForProblemDescription() {
  const root = document.querySelector("#qd-content");
  if (!root) {
    setTimeout(waitForProblemDescription, 500);
    return;
  }

  const elements = root.querySelectorAll("p, li, pre");
  let text = "";

  elements.forEach(el => {
    const t = el.innerText.trim();
    if (t.length > 0) text += t + "\n";
  });

  if (text.length < 200) {
    setTimeout(waitForProblemDescription, 500);
    return;
  }

  studentMentorContext.problemText = text.trim();
  console.log("📘 Clean Problem Text detected");
  console.log(studentMentorContext.problemText.slice(0, 300), "...");
}

waitForProblemDescription();

function waitForEditor() {
  const editor = document.querySelector(".monaco-editor");
  if (!editor) {
    setTimeout(waitForEditor, 500);
    return;
  }

  const textarea = editor.querySelector("textarea");
  if (!textarea) {
    setTimeout(waitForEditor, 500);
    return;
  }

  studentMentorContext.userCode = textarea.value;
  console.log("💻 Code editor detected");
  console.log(studentMentorContext.userCode);

}

waitForEditor();

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_CONTEXT") {
    sendResponse(studentMentorContext);
  }
});