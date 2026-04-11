"""
Final Decision Engine.

Converts the ML risk score into an actionable business decision with:
  - Decision tier (OK / Monitor / Action Required / Immediate Action)
  - Executive summary
  - Top 3 priority actions
  - Business impact statement

This layer translates raw numbers into language a CEO can act on.
"""

from app.utils.metrics import score_to_category


def generate_decision(risk_result: dict, anomaly_result: dict = None, forecast_result: dict = None) -> dict:
    """
    Generate a final business decision from AI analysis results.

    Args:
        risk_result: output from risk_model.predict_risk()
        anomaly_result: output from anomaly_detector.full_anomaly_report() (optional)
        forecast_result: output from forecasting_model.forecast_cash_flow() (optional)
    """
    score = risk_result["risk_score"]
    category = risk_result["risk_category"]
    confidence = risk_result["confidence"]

    # ── Decision tier ───────────────────────────────────
    if score < 25:
        decision = "OK"
        color = "green"
    elif score < 50:
        decision = "Monitor"
        color = "yellow"
    elif score < 75:
        decision = "Action Required"
        color = "orange"
    else:
        decision = "Immediate Action"
        color = "red"

    # ── Executive summary ───────────────────────────────
    features = risk_result.get("input_features", {})
    rev = features.get("revenue", 0)
    exp = features.get("expenses", 0)

    if decision == "OK":
        summary = (
            f"Financial health is strong (score: {score}/100, confidence: {confidence}%). "
            f"Revenue of ${rev:,.0f} comfortably exceeds expenses of ${exp:,.0f}. "
            f"Continue current strategy and monitor quarterly."
        )
    elif decision == "Monitor":
        summary = (
            f"Financial position shows moderate risk (score: {score}/100). "
            f"Some indicators need attention but no immediate crisis. "
            f"Revenue is ${rev:,.0f} with expenses at ${exp:,.0f}. Review within 30 days."
        )
    elif decision == "Action Required":
        summary = (
            f"Elevated financial risk detected (score: {score}/100). "
            f"Multiple indicators are in warning territory. "
            f"Corrective measures should be implemented within 2-4 weeks to prevent escalation."
        )
    else:
        summary = (
            f"CRITICAL: Risk score of {score}/100 indicates severe financial stress. "
            f"Immediate executive intervention required. "
            f"{'Cash flow is negative. ' if features.get('cash_flow', 0) < 0 else ''}"
            f"Delay risks liquidity crisis."
        )

    # ── Priority actions ────────────────────────────────
    actions = _generate_priority_actions(risk_result, anomaly_result, forecast_result)

    # ── Business impact ─────────────────────────────────
    impact = _generate_business_impact(score, forecast_result)

    return {
        "decision": decision,
        "decision_color": color,
        "risk_score": score,
        "risk_category": category,
        "confidence": confidence,
        "summary": summary,
        "priority_actions": actions[:3],
        "business_impact": impact,
    }


def _generate_priority_actions(risk_result, anomaly_result, forecast_result) -> list[dict]:
    actions = []
    features = risk_result.get("input_features", {})
    importances = risk_result.get("feature_contributions", {})

    # Sort features by importance — address the highest-impact ones first
    top_features = sorted(importances.items(), key=lambda x: -x[1])

    for feat, imp in top_features:
        if len(actions) >= 4:
            break

        val = features.get(feat, 0)

        if feat == "expense_ratio" and val > 0.85:
            actions.append({
                "priority": len(actions) + 1,
                "action": "Cut non-essential expenses immediately",
                "impact": f"Expense ratio is {val:.0%} of revenue — target below 80%",
                "urgency": "critical" if val > 1.0 else "high",
            })
        elif feat == "debt_ratio" and val > 0.6:
            actions.append({
                "priority": len(actions) + 1,
                "action": "Restructure or consolidate debt obligations",
                "impact": f"Debt ratio of {val:.2f} exceeds safe threshold of 0.5",
                "urgency": "high" if val > 1.0 else "medium",
            })
        elif feat == "invoices_overdue_ratio" and val > 0.2:
            actions.append({
                "priority": len(actions) + 1,
                "action": "Escalate invoice collection efforts",
                "impact": f"{val:.0%} of invoiced revenue is overdue, tying up working capital",
                "urgency": "high" if val > 0.35 else "medium",
            })
        elif feat == "net_margin" and val < 0.05:
            actions.append({
                "priority": len(actions) + 1,
                "action": "Improve profit margins through pricing or cost optimization",
                "impact": f"Net margin of {val:.1%} is dangerously thin",
                "urgency": "high" if val < 0 else "medium",
            })
        elif feat == "loan_burden" and val > 0.3:
            actions.append({
                "priority": len(actions) + 1,
                "action": "Renegotiate loan terms to reduce monthly burden",
                "impact": f"Loan payments consume {val:.0%} of monthly income",
                "urgency": "high",
            })

    # Anomaly action
    if anomaly_result and anomaly_result.get("overall_anomaly"):
        actions.append({
            "priority": len(actions) + 1,
            "action": "Investigate flagged anomalous financial patterns",
            "impact": "Unusual values detected that may indicate errors or fraud",
            "urgency": "medium",
        })

    # Forecast action
    if forecast_result:
        net_30 = forecast_result.get("forecast_30d", {}).get("net_cash_flow", 0)
        if net_30 < 0:
            actions.append({
                "priority": len(actions) + 1,
                "action": "Address projected cash shortfall within 30 days",
                "impact": f"Forecast shows negative cash flow of ${abs(net_30):,.0f}",
                "urgency": "critical",
            })

    # Ensure at least 3 actions
    defaults = [
        {"priority": 0, "action": "Review and update financial forecasts", "impact": "Proactive monitoring prevents surprises", "urgency": "low"},
        {"priority": 0, "action": "Schedule quarterly financial health review", "impact": "Regular reviews catch issues early", "urgency": "low"},
    ]
    while len(actions) < 3:
        actions.append(defaults.pop(0))

    # Re-number priorities
    for i, a in enumerate(actions):
        a["priority"] = i + 1

    return actions


def _generate_business_impact(score, forecast_result) -> str:
    if score < 25:
        return "No immediate financial risks. The company is positioned for growth or investment."

    if score < 50:
        if forecast_result:
            net_30 = forecast_result.get("forecast_30d", {}).get("net_cash_flow", 0)
            return (
                f"Without attention, risks may escalate within 2-3 months. "
                f"30-day cash flow forecast is ${net_30:,.0f}. "
                f"Monitor key metrics weekly."
            )
        return "Moderate risk — if trends continue, financial health may deteriorate within a quarter."

    if score < 75:
        return (
            "Corrective action within 30 days is strongly recommended. "
            "Delayed response could lead to vendor payment issues, reduced credit, and constrained operations."
        )

    return (
        "CRITICAL: Without immediate intervention, the company faces high probability of "
        "cash shortfall, loan default, or inability to meet payroll. "
        "Executive stakeholders should convene an emergency financial review."
    )
