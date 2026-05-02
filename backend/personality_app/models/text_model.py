import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), "bigfive-regression-model")

_text_tokenizer = None  # type: Optional[any]
_text_model = None      # type: Optional[any]

BIG5_LABELS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]


def _get_text_model():
    global _text_tokenizer, _text_model
    if _text_tokenizer is not None and _text_model is not None:
        return _text_tokenizer, _text_model

    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model folder not found: {MODEL_PATH}")
        return None, None

    try:
        print(f"🔄 Loading text model from: {MODEL_PATH}")
        _text_tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _text_model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
        _text_model.eval()
        print("✅ Text model loaded successfully")
        return _text_tokenizer, _text_model

    except Exception as e:
        print(f"❌ Error loading text model: {e}")
        return None, None


def predict_text_traits(text):
    if not text or not text.strip():
        return {"error": "no_text_provided"}

    tokenizer, model = _get_text_model()

    if tokenizer is None or model is None:
        return {"error": "text_model_not_available"}

    try:
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        )

        with torch.no_grad():
            outputs = model(**inputs)

        scores = outputs.logits[0].tolist()
        print(f"📝 Raw scores: {scores}")

        # Minej/bert-base-personality 0 to 1 scale output karta hai
        scores_percent = [round(score * 100, 2) for score in scores]
        scores_percent = [max(5, min(95, s)) for s in scores_percent]

        result = {}
        for trait, percent in zip(BIG5_LABELS, scores_percent):
            result[trait] = percent

        print(f"✅ Final traits: {result}")
        return result

    except Exception as e:
        print(f"❌ Inference error: {e}")
        return {"error": "text_inference_failed", "detail": str(e)}