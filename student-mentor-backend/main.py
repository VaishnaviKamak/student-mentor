from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class MentorRequest(BaseModel):
    problem_text: str
    user_code: str
    question: str

class MentorResponse(BaseModel):
    reply: str

@app.get("/")
def health_check():
    return {"status": "Student Mentor backend running"}
