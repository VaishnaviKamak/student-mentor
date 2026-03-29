MENTOR_SYSTEM_PROMPT = """
You are a Socratic programming mentor helping a student solve a coding problem on LeetCode.

CRITICAL RULES — follow these strictly:
1. NEVER give the final solution, complete code, or the exact algorithm name (e.g. do not say "use a hash map and do X").
2. NEVER write code for the student, even partial code.
3. Guide through questions, analogies, and incremental hints only.
4. ALWAYS finish your response with a question that pushes the student to think next.
5. If the student asks directly for the answer or solution, decline warmly and redirect.
6. If the student's reasoning is on the right track, affirm it clearly and push them one step further.
7. If the student's reasoning is wrong, gently correct the misconception without revealing the right path outright.

Response style:
- 3–5 complete sentences. Never cut off mid-sentence.
- Conversational and encouraging — like a patient tutor sitting next to them.
- No code blocks. No bullet lists. Plain flowing text.
- End every response with a question.
"""

def build_prompt(problem, code, question, intent):

    mode_instruction = {
        "solution_request": (
            "The student is asking for the solution or full code. "
            "Warmly decline and redirect them to think about the problem structure. "
            "Ask them what they understand about the problem so far."
        ),
        "problem_explanation": (
            "The student is confused about what the problem is asking. "
            "Break down the problem statement into simple everyday language. "
            "Use a small concrete example (make one up using simple numbers). "
            "Do NOT reveal which algorithm or data structure to use."
        ),
        "debug_code": (
            "The student has written code and wants help debugging it. "
            "Read their code line by line very carefully against the problem statement. "
            "Identify the SPECIFIC bug: name the exact line, variable, condition, or logic that is wrong. "
            "Explain clearly WHY it is wrong (e.g. off-by-one, wrong condition, missing edge case, wrong return). "
            "Do NOT rewrite the code or show the fixed code. "
            "After explaining the bug, ask the student what they think the correct fix should be."
        ),
        "approach_check": (
            "The student is proposing a specific approach or data structure. "
            "Think carefully about whether it is correct, partially correct, or wrong for this problem. "
            "If correct: affirm it and ask how they would implement the key step. "
            "If wrong: gently point out why it may not work with an analogy or counter-example, then ask what else they could try."
        ),
        "hint": (
            "The student needs a nudge in the right direction. "
            "Give the smallest hint that unblocks them — one idea, not the full plan. "
            "Then ask a follow-up question to keep them thinking."
        ),
    }

    code_section = (
        f"Student's Current Code:\n{code}"
        if code and code.strip()
        else "Student has not written any code yet."
    )

    return f"""{MENTOR_SYSTEM_PROMPT}

--- CONTEXT ---
Mentor Mode: {mode_instruction[intent]}

Problem Statement:
{problem}

{code_section}

Student's Question:
{question}

--- YOUR RESPONSE ---
Respond as a mentor. Remember: complete sentences only, end with a question, no code, no solution.
"""

def detect_intent(question: str) -> str:
    q = question.lower()

    solution_phrases = [
        "solution", "give code", "write code", "give me the code",
        "full code", "just tell me", "what is the answer", "solve this",
        "how to solve", "how do i solve", "correct code"
    ]
    if any(p in q for p in solution_phrases):
        return "solution_request"

    approach_phrases = [
        "should i use", "can i use", "is it right", "is it wrong",
        "would a", "is a", "what about using", "what if i use",
        "is this correct", "am i right", "is my approach",
        "stack", "queue", "hash", "set", "map", "two pointer",
        "sliding window", "binary search", "recursion", "dp",
        "dynamic programming", "greedy", "bfs", "dfs", "tree", "graph"
    ]
    if any(p in q for p in approach_phrases):
        return "approach_check"

    explain_phrases = [
        "explain", "understand", "what does", "what is this", "confused",
        "what is the problem", "problem about", "don't get", "dont get",
        "what does it mean", "what is asked"
    ]
    if any(p in q for p in explain_phrases):
        return "problem_explanation"

    debug_phrases = [
        "wrong", "error", "bug", "not working", "failing", "test case",
        "output", "expected", "why is my", "issue with my",
        "what is wrong", "whats wrong", "what's wrong", "debug",
        "incorrect", "doesn't work", "doesnt work", "fix my",
        "check my code", "look at my code", "review my code",
        "my code", "my solution", "my logic", "my approach is wrong"
    ]
    if any(p in q for p in debug_phrases):
        return "debug_code"

    return "hint"
