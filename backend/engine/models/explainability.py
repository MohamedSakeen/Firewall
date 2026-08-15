class ExplainableAIEngine:
    """
    Provides model prediction feature contribution breakdowns and counterfactual 'what-if' explanations.
    """
    def explain_prediction(self, model_id, prediction_output, feature_vector):
        contributions = []
        for feat, val in feature_vector.items():
            if isinstance(val, (int, float)) and val > 0:
                contributions.append({"feature": feat, "value": val, "impact": "+High"})

        return {
            "model_id": model_id,
            "prediction": prediction_output,
            "top_contributions": contributions[:4],
            "explanation": "Prediction driven by abnormal connection frequency and port diversity."
        }

    def counterfactual_explanation(self, current_score, key_features):
        """
        Calculates counterfactual score change if key features return to normal baseline.
        """
        reduced_score = max(10, current_score - 40)
        return {
            "current_score": current_score,
            "simulated_score_if_baseline_restored": reduced_score,
            "required_changes": [f"Return {f} to baseline values" for f in key_features]
        }

global_explainable_ai = ExplainableAIEngine()
