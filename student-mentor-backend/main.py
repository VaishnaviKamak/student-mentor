from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import google.generativeai as genai

# -------------------------------------------------
# Load environment variables
# -------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables")

# -------------------------------------------------
# Configure Gemini
# -------------------------------------------------
genai.configure(api_key=GEMINI_API_KEY)

gemini_model = genai.GenerativeModel(
    model_name="models/gemini-2.5-flash",
    generation_config={
        "temperature": 0.3,
        "max_output_tokens": 300
    }
)

# -------------------------------------------------
# FastAPI app setup
# -------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Health check
# -------------------------------------------------
@app.get("/")
def health_check():
    return {"status": "Student Mentor backend running"}

# -------------------------------------------------
# Request / Response models
# -------------------------------------------------
class MentorRequest(BaseModel):
    problem_text: str
    user_code: str
    question: str

class MentorResponse(BaseModel):
    reply: str

# -------------------------------------------------
# Mentor system prompt
# -------------------------------------------------
MENTOR_SYSTEM_PROMPT = """
You are a strict programming mentor.

Rules you MUST follow:
- Do NOT give full solutions or code.
- Do NOT describe complete algorithms step by step.
- Do NOT reveal the optimal approach directly.
- Ask guiding questions instead of answering directly.
- Help the student think, not copy.

If the user asks for a solution or code:
- Refuse politely.
- Redirect them to understanding the problem.

If the question is out of context:
- Ask them to focus on the current problem.

Your goal is to mentor, not solve.
"""

# -------------------------------------------------
# Prompt builder
# -------------------------------------------------
def build_prompt(problem: str, code: str, question: str, intent: str) -> str:
    mode_instructions = {
        "solution": (
            "The student is asking for a direct solution. "
            "You must refuse politely and redirect them to thinking."
        ),
        "debug": (
            "Help the student reason about why their code may fail. "
            "Do not fix the code. Ask questions about logic and edge cases."
        ),
        "explain": (
            "Explain the problem in simple terms without revealing the solution."
        ),
        "hint": (
            "Give a small hint or guiding question to nudge the student forward."
        )
    }

    return f"""
{MENTOR_SYSTEM_PROMPT}

Current Mode:
{intent.upper()} MODE

Instructions:
{mode_instructions[intent]}

Problem:
{problem}

Student Code:
{code}

Student Question:
{question}

Respond strictly as a mentor.
"""


# -------------------------------------------------
# LLM call (Gemini)
# -------------------------------------------------
def call_llm(prompt: str) -> str:
    try:
        response = gemini_model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print("Gemini error:", e)
        return (
            "Let’s slow down and think this through. "
            "What do you think the key constraint of the problem is?"
        )

# -------------------------------------------------
# Mentor endpoint
# -------------------------------------------------
@app.post("/mentor", response_model=MentorResponse)
def mentor(req: MentorRequest):
    intent = detect_intent(req.question)

    prompt = build_prompt(
        req.problem_text,
        req.user_code,
        req.question,
        intent
    )

    reply = call_llm(prompt)
    return {"reply": reply}


def detect_intent(question: str) -> str:
    q = question.lower()

    solution_phrases = [
        "give solution", "full solution", "solve this",
        "write code", "exact answer", "complete code"
    ]

    explanation_phrases = [
        "explain the problem", "what is the problem",
        "help me understand", "clarify the problem"
    ]

    debug_phrases = [
        "why does my code", "what is wrong with my code",
        "bug", "error", "fails"
    ]

    if any(p in q for p in solution_phrases):
        return "solution"

    if any(p in q for p in debug_phrases):
        return "debug"

    if any(p in q for p in explanation_phrases):
        return "explain"

    return "hint"
