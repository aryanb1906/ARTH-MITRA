# backend/inflation_engine.py
import math

# 2026 Sectoral Benchmarks for India
CURRENT_INFLATION_DATA = {
    "education": {"rate": 10.5, "insight": "Sticky tuition fees."},
    "medical": {"rate": 14.0, "insight": "High tertiary care costs."},
    "real_estate": {"rate": 8.2, "insight": "Urban demand surge."},
    "lifestyle": {"rate": 6.0, "insight": "Auto/Travel trends."},
    "general": {"rate": 4.5, "insight": "Baseline retail inflation."}
}

def analyze_investment_plan(goal_type: str, current_amount: float, years: int):
    sector = goal_type.lower()
    # Default to general if sector not found
    data = CURRENT_INFLATION_DATA.get(sector, CURRENT_INFLATION_DATA["general"])
    
    # 1. Calculate Future Value (Inflation Adjusted)
    inflation_rate = data["rate"] / 100
    future_value = current_amount * ((1 + inflation_rate) ** years)
    
    # 2. Calculate Monthly SIP required
    # Assuming 12% annual return (Standard for Indian Mutual Funds)
    annual_return = 0.12
    monthly_return = annual_return / 12
    months = years * 12
    
    if months > 0:
        # SIP Formula: FV = P × [((1 + r)^n - 1) / r] × (1 + r)
        # Rearranged for P: P = FV / [((1 + r)^n - 1) / r]
        sip_amount = future_value / (((math.pow(1 + monthly_return, months) - 1) / monthly_return))
    else:
        sip_amount = future_value

    # 3. AI Asset Recommendation
    if data["rate"] > 10:
        advice = "High inflation sector. Recommend 80% Equity allocation."
    else:
        advice = "Moderate inflation. A 60/40 Equity-Debt split is sufficient."
    
    return {
        "sector": sector,
        "ai_inflation_rate": data["rate"],
        "future_value": round(future_value, 2),
        "sip_amount": round(sip_amount, 2),
        "insight": data["insight"],
        "advice": advice,
        "allocation": {"Equity": "80%", "Debt": "20%"} if data["rate"] > 10 else {"Equity": "60%", "Debt": "40%"}
    }