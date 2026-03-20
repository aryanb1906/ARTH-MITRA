from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import json

# Optional: Create a router if you are using multiple files
router = APIRouter()

# 1. Define the Input Data Model
class GoalRequest(BaseModel):
    goal_type: str
    amount: float
    years: int
    risk_profile: str = "Moderate" # Added from our new frontend!

# 2. Hardcoded logic for Indian Inflation & Expected Returns
INFLATION_RATES = {
    "Education": 0.105,   # 10.5%
    "Medical": 0.14,      # 14%
    "Lifestyle": 0.06,    # 6%
    "Home": 0.06,         # 6%
    "Retirement": 0.06,   # 6%
    "General": 0.045      # 4.5%
}

EXPECTED_RETURNS = {
    "Conservative": 0.07, # 7% (FDs, PPF, Bonds)
    "Moderate": 0.10,     # 10% (Balanced Advantage, Index Funds)
    "Aggressive": 0.12    # 12% (Small/Mid Cap, Flexi Cap)
}

def calculate_sip(fv: float, years: int, annual_return: float) -> float:
    """Standard SIP calculation formula"""
    if annual_return == 0 or years == 0:
        return fv / max((years * 12), 1)
    
    monthly_rate = annual_return / 12
    months = years * 12
    # Standard formula for SIP (investing at the beginning of the month)
    sip = (fv * monthly_rate) / (((1 + monthly_rate)**months) - 1)
    sip = sip / (1 + monthly_rate)
    return round(sip, 0)

# 3. The Main API Endpoint
@router.post("/api/finance/check-goal")
async def check_goal(request: GoalRequest):
    try:
        # Step 1: Do the exact math in Python
        inflation_rate = INFLATION_RATES.get(request.goal_type, 0.06)
        expected_return = EXPECTED_RETURNS.get(request.risk_profile, 0.10)
        
        # Calculate Future Value: FV = PV * (1 + r)^t
        future_value = round(request.amount * ((1 + inflation_rate) ** request.years), 0)
        
        # Calculate Required Monthly SIP
        sip_amount = calculate_sip(future_value, request.years, expected_return)

        # Step 2: Use AI to generate the Strategy & Allocation
        # (Assuming you are using Gemini or an OpenAI-compatible client)
        model = genai.GenerativeModel('gemini-1.5-pro') # Or your configured model
        
        prompt = f"""
        You are a top-tier Indian Financial Advisor AI.
        A user wants to save for {request.goal_type}.
        Current cost: ₹{request.amount}
        Time Horizon: {request.years} years
        Risk Appetite: {request.risk_profile}

        I have already calculated that they need a future corpus of ₹{future_value:,.0f} and their monthly SIP should be ₹{sip_amount:,.0f}.

        Your job is to allocate this ₹{sip_amount:,.0f} monthly SIP across different asset classes and specific Indian investment schemes. 
        You must return ONLY a valid JSON object matching the exact structure below, without markdown formatting or extra text.

        {{
          "advice": "A 2-3 sentence personalized explanation of your strategy.",
          "allocation_chart": [
             {{ "name": "Asset Class (e.g., Equity Mutual Funds)", "value": 70, "amount": <exact calculated amount> }},
             {{ "name": "Asset Class (e.g., PPF & FDs)", "value": 30, "amount": <exact calculated amount> }}
          ],
          "specific_schemes": [
             {{ "name": "Specific Indian Fund/Scheme 1", "category": "Equity/Debt/Safe", "amount": <exact calculated amount>, "reason": "Why this specific scheme?" }},
             {{ "name": "Specific Indian Fund/Scheme 2", "category": "Equity/Debt/Safe", "amount": <exact calculated amount>, "reason": "Why this specific scheme?" }}
          ]
        }}

        RULES:
        1. The 'value' percentages in allocation_chart MUST sum to exactly 100.
        2. The 'amount' values in allocation_chart MUST sum to exactly {sip_amount:.0f}.
        3. The 'amount' values in specific_schemes MUST sum to exactly {sip_amount:.0f}.
        4. Recommend authentic Indian schemes (e.g., PPF, SSY, Nifty 50 Index Funds, Liquid Funds, SCSS, etc.) based on the {request.years} year timeline and {request.risk_profile} risk.
        """

        # Call the LLM
        response = model.generate_content(prompt)
        
        # Clean the response (sometimes LLMs wrap JSON in ```json blocks)
        raw_json = response.text.strip().removeprefix('```json').removesuffix('```').strip()
        
        # Parse the JSON
        ai_data = json.loads(raw_json)
        
        # Merge our perfectly calculated math with the AI's smart strategy
        final_result = {
            "future_value": future_value,
            "sip_amount": sip_amount,
            "advice": ai_data.get("advice", "Start saving today."),
            "allocation_chart": ai_data.get("allocation_chart", []),
            "specific_schemes": ai_data.get("specific_schemes", [])
        }
        
        return final_result

    except Exception as e:
        print(f"Goal Planner Error: {str(e)}")
        # Fallback response so the frontend doesn't crash if the AI fails
        raise HTTPException(status_code=500, detail="Failed to generate AI plan")