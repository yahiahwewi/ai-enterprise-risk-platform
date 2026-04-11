"""
Trend Analysis Service.

Compares two periods of financial data (e.g. last 30 days vs previous 30 days)
and computes percentage changes, direction, and momentum indicators.

This is useful for the business owner to understand whether the company's
financial health is improving or deteriorating.
"""

import numpy as np


def _pct_change(current: float, previous: float) -> float:
    """Compute percentage change, handling zero division."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / abs(previous)) * 100, 2)


def _direction(change: float) -> str:
    if change > 5:
        return "improving"
    elif change < -5:
        return "worsening"
    return "stable"


def analyze_trends(current_period: dict, previous_period: dict) -> dict:
    """
    Compare two periods of financial data.

    Each period dict should have:
      revenue, expenses, cash_flow, invoices_overdue, debt_ratio

    Returns per-metric trend analysis with change %, direction, and summary.
    """
    metrics = {}

    for key in ["revenue", "expenses", "cash_flow", "invoices_overdue", "debt_ratio"]:
        curr = current_period.get(key, 0)
        prev = previous_period.get(key, 0)
        change = _pct_change(curr, prev)

        # For expenses, debt_ratio, invoices_overdue: increasing is BAD
        is_negative_metric = key in ("expenses", "invoices_overdue", "debt_ratio")
        direction = _direction(-change if is_negative_metric else change)

        metrics[key] = {
            "current": round(curr, 2),
            "previous": round(prev, 2),
            "change_pct": change,
            "direction": direction,
            "is_positive": (change > 0) != is_negative_metric,
        }

    # Overall momentum: weighted score of how many metrics are improving
    positive_count = sum(1 for m in metrics.values() if m["is_positive"])
    total = len(metrics)
    momentum_score = round((positive_count / total) * 100, 1)

    if momentum_score >= 70:
        momentum = "strong_positive"
    elif momentum_score >= 50:
        momentum = "slightly_positive"
    elif momentum_score >= 30:
        momentum = "slightly_negative"
    else:
        momentum = "strong_negative"

    # Generate human-readable summary
    improving = [k for k, v in metrics.items() if v["direction"] == "improving"]
    worsening = [k for k, v in metrics.items() if v["direction"] == "worsening"]

    summary_parts = []
    if improving:
        summary_parts.append(f"Improving: {', '.join(improving)}")
    if worsening:
        summary_parts.append(f"Worsening: {', '.join(worsening)}")
    if not summary_parts:
        summary_parts.append("All metrics are stable compared to the previous period.")

    return {
        "metrics": metrics,
        "momentum": {
            "score": momentum_score,
            "label": momentum,
        },
        "summary": ". ".join(summary_parts),
    }
