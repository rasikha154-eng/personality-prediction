import random

# Mock implementation since ML models aren't available
BIG5_LABELS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]


def predict_text_traits(text):
    """
    Predict personality traits from text.
    Returns dict with trait names as keys and percentages as values.
    """
    if not text or not text.strip():
        return {"error": "no_text_provided"}

    # Generate mock personality scores (0-100)
    # In a real implementation, this would use ML models
    base_scores = {
        "openness": random.randint(40, 80),
        "conscientiousness": random.randint(50, 85),
        "extraversion": random.randint(30, 75),
        "agreeableness": random.randint(45, 90),
        "neuroticism": random.randint(20, 60)
    }

    # Adjust based on text content (simple keyword analysis)
    text_lower = text.lower()

    # Openness indicators
    if any(word in text_lower for word in ["creative", "imaginative", "curious", "artistic", "adventurous"]):
        base_scores["openness"] = min(100, base_scores["openness"] + 15)
    if any(word in text_lower for word in ["traditional", "conventional", "routine"]):
        base_scores["openness"] = max(0, base_scores["openness"] - 15)

    # Conscientiousness indicators
    if any(word in text_lower for word in ["responsible", "organized", "reliable", "disciplined", "hardworking"]):
        base_scores["conscientiousness"] = min(100, base_scores["conscientiousness"] + 15)
    if any(word in text_lower for word in ["careless", "disorganized", "lazy"]):
        base_scores["conscientiousness"] = max(0, base_scores["conscientiousness"] - 15)

    # Extraversion indicators
    if any(word in text_lower for word in ["outgoing", "social", "energetic", "talkative", "enthusiastic"]):
        base_scores["extraversion"] = min(100, base_scores["extraversion"] + 15)
    if any(word in text_lower for word in ["shy", "quiet", "reserved", "introverted"]):
        base_scores["extraversion"] = max(0, base_scores["extraversion"] - 15)

    # Agreeableness indicators
    if any(word in text_lower for word in ["kind", "helpful", "cooperative", "compassionate", "friendly"]):
        base_scores["agreeableness"] = min(100, base_scores["agreeableness"] + 15)
    if any(word in text_lower for word in ["rude", "selfish", "uncooperative", "hostile"]):
        base_scores["agreeableness"] = max(0, base_scores["agreeableness"] - 15)

    # Neuroticism indicators
    if any(word in text_lower for word in ["anxious", "worried", "nervous", "stressed", "emotional"]):
        base_scores["neuroticism"] = min(100, base_scores["neuroticism"] + 15)
    if any(word in text_lower for word in ["calm", "relaxed", "stable", "confident"]):
        base_scores["neuroticism"] = max(0, base_scores["neuroticism"] - 15)

    return base_scores
