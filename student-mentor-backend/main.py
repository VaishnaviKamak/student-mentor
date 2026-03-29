from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import google.generativeai as genai
from prompts import build_prompt, detect_intent

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

gemini_model = genai.GenerativeModel(
    model_name="models/gemini-2.5-flash",
    generation_config={
        "temperature": 0.3,
        "max_output_tokens": 1024,
    }
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "Student Mentor backend running"}

class MentorRequest(BaseModel):
    problem_text: str
    user_code: str
    question: str

class MentorResponse(BaseModel):
    reply: str

def call_llm(prompt: str) -> str:
    try:
        response = gemini_model.generate_content(prompt)

        # Check why the model stopped generating.
        # If it hit the token limit the reply will be cut off mid-sentence —
        # catch that and return a safe fallback instead of broken text.
        candidate = response.candidates[0] if response.candidates else None
        if candidate:
            finish_reason = str(candidate.finish_reason)
            if "MAX_TOKENS" in finish_reason or finish_reason == "2":
                print(f"WARNING: Gemini hit token limit. finish_reason={finish_reason}")
                return (
                    "I started to explain but ran out of space — let me be more concise. "
                    "Could you tell me which specific part of your code you're most unsure about? "
                    "That way I can focus exactly where it helps most."
                )

        return response.text.strip()

    except Exception as e:
        print("Gemini error:", e)
        return (
            "I hit a small snag on my end. "
            "What part of the problem are you stuck on right now?"
        )

@app.post("/mentor")
def mentor(req: MentorRequest):

    intent = detect_intent(req.question)

    # Student code is capped at 3000 chars (~100 lines of code).
    problem_text = req.problem_text[:2000]
    user_code    = req.user_code[:3000]

    prompt = build_prompt(
        problem_text,
        user_code,
        req.question,
        intent
    )

    reply = call_llm(prompt)

    return {"reply": reply}
