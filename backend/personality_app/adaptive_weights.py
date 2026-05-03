import json
import os

WEIGHTS_FILE = os.path.join(os.path.dirname(__file__), "adaptive_weights.json")

# Default weights
DEFAULT_WEIGHTS = {
    "text":  0.3,
    "voice": 0.2,
    "face":  0.5,
}

def load_weights() -> dict:
    if not os.path.exists(WEIGHTS_FILE):
        return DEFAULT_WEIGHTS.copy()
    try:
        with open(WEIGHTS_FILE, "r") as f:
            data = json.load(f)
            return data.get("weights", DEFAULT_WEIGHTS.copy())
    except Exception:
        return DEFAULT_WEIGHTS.copy()


def save_weights(weights: dict):
    try:
        existing = {}
        if os.path.exists(WEIGHTS_FILE):
            with open(WEIGHTS_FILE, "r") as f:
                existing = json.load(f)
        existing["weights"] = weights
        with open(WEIGHTS_FILE, "w") as f:
            json.dump(existing, f, indent=2)
    except Exception as e:
        print(f"Error saving weights: {e}")


def adjust_weights(is_accurate: bool, results: dict) -> dict:
    """
    Feedback ke basis pe weights adjust karo.
    Accurate → current best modality ko thoda boost do.
    Inaccurate → sabse weak modality ko thoda reduce karo.
    """
    weights = load_weights()

    STEP = 0.02  # Har baar 2% adjust hoga
    MIN_W = 0.05
    MAX_W = 0.70

    modality_scores = results.get("modality_scores", {})

    if is_accurate:
        # Jo modality best perform kar rahi hai uska weight badha do
        best_modality = max(weights, key=lambda k: weights[k])
        weights[best_modality] = min(MAX_W, weights[best_modality] + STEP)
    else:
        # Jo modality lowest weight pe hai uska weight ghata do
        worst_modality = min(weights, key=lambda k: weights[k])
        weights[worst_modality] = max(MIN_W, weights[worst_modality] - STEP)

    # Normalize — total 1.0 rehna chahiye
    total = sum(weights.values())
    weights = {k: round(v / total, 3) for k, v in weights.items()}

    save_weights(weights)
    print(f"✅ Weights updated: {weights}")
    return weights


def get_feedback_stats() -> dict:
    if not os.path.exists(WEIGHTS_FILE):
        return {"total_feedback": 0, "accurate_count": 0, "accuracy_rate": 0, "weights": DEFAULT_WEIGHTS}
    try:
        with open(WEIGHTS_FILE, "r") as f:
            data = json.load(f)
        total    = data.get("total_feedback", 0)
        accurate = data.get("accurate_count", 0)
        rate     = round((accurate / total * 100), 1) if total > 0 else 0
        return {
            "total_feedback": total,
            "accurate_count": accurate,
            "accuracy_rate":  rate,
            "weights":        data.get("weights", DEFAULT_WEIGHTS),
        }
    except Exception:
        return {"total_feedback": 0, "accurate_count": 0, "accuracy_rate": 0, "weights": DEFAULT_WEIGHTS}


def record_feedback(is_accurate: bool):
    try:
        data = {}
        if os.path.exists(WEIGHTS_FILE):
            with open(WEIGHTS_FILE, "r") as f:
                data = json.load(f)
        data["total_feedback"]  = data.get("total_feedback", 0) + 1
        data["accurate_count"]  = data.get("accurate_count", 0) + (1 if is_accurate else 0)
        with open(WEIGHTS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error recording feedback: {e}")