def determine_severity(score):

    if score >= 100:
        return "critical"

    elif score >= 70:
        return "high"

    elif score >= 40:
        return "medium"

    return "low"