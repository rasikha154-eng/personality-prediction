import os
import json

WEIGHTS_FILE = os.path.join(os.path.dirname(__file__), "weights.json")
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "feedback_log.json")

DEFAULT_WEIGHTS = {"text": 0.333, "voice": 0.333, "face": 0.333}


def _load_weights():
    if os.path.exists(WEIGHTS_FILE):
        with open(WEIGHTS_FILE, "r") as f:
            return json.load(f)
    return DEFAULT_WEIGHTS.copy()


def _save_weights(weights):
    with open(WEIGHTS_FILE, "w") as f:
        json.dump(weights, f, indent=2)


def adjust_weights(is_accurate: bool, results: dict) -> dict:
    weights = _load_weights()

    if is_accurate:
        # Dominant modality ka weight badha do
        dominant = max(weights, key=weights.get)
        for k in weights:
            if k == dominant:
                weights[k] = round(min(0.7, weights[k] * 1.1), 3)
            else:
                weights[k] = round(weights[k] * 0.95, 3)
    else:
        # Not accurate — teeno ko equal ke qareeb le aao
        for k in weights:
            weights[k] = round(weights[k] * 0.9 + 0.333 * 0.1, 3)

    # Normalize karo taake sum 1 rahe
    total = sum(weights.values())
    weights = {k: round(v / total, 3) for k, v in weights.items()}

    _save_weights(weights)
    print(f"✅ Weights updated: {weights}")
    return weights


def record_feedback(is_accurate: bool):
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, "r") as f:
            log = json.load(f)
    else:
        log = []

    log.append({"accurate": is_accurate})

    with open(FEEDBACK_FILE, "w") as f:
        json.dump(log, f, indent=2)


def get_feedback_stats() -> dict:
    if not os.path.exists(FEEDBACK_FILE):
        return {"total_feedback": 0, "accuracy_rate": 0}

    with open(FEEDBACK_FILE, "r") as f:
        log = json.load(f)

    total = len(log)
    accurate = sum(1 for x in log if x.get("accurate"))
    accuracy = round((accurate / total) * 100, 1) if total > 0 else 0

    return {"total_feedback": total, "accuracy_rate": accuracy}