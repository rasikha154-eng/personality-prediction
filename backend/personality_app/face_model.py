import os
import random
import numpy as np
from typing import Any

emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

emotion_to_traits = {
    "angry":   {"openness": 35, "conscientiousness": 45, "extraversion": 55, "agreeableness": 20, "neuroticism": 80},
    "disgust": {"openness": 30, "conscientiousness": 50, "extraversion": 30, "agreeableness": 25, "neuroticism": 70},
    "fear":    {"openness": 40, "conscientiousness": 40, "extraversion": 25, "agreeableness": 50, "neuroticism": 85},
    "happy":   {"openness": 75, "conscientiousness": 65, "extraversion": 85, "agreeableness": 80, "neuroticism": 15},
    "neutral": {"openness": 50, "conscientiousness": 60, "extraversion": 50, "agreeableness": 55, "neuroticism": 35},
    "sad":     {"openness": 50, "conscientiousness": 45, "extraversion": 25, "agreeableness": 60, "neuroticism": 75},
    "surprise":{"openness": 85, "conscientiousness": 50, "extraversion": 70, "agreeableness": 60, "neuroticism": 40},
}

# ── PyTorch model ──────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "emotion_model.pth")
_model     = None

_TORCH_AVAILABLE = False
_CV2_AVAILABLE   = False

try:
    import torch
    import torch.nn as nn
    _TORCH_AVAILABLE = True
    print("✅ PyTorch available")
except ImportError:
    print("⚠️ PyTorch not available — mock mode")

try:
    import cv2
    from PIL import Image
    _CV2_AVAILABLE = True
    print("✅ OpenCV available")
except ImportError:
    print("⚠️ OpenCV not available — mock mode")


class EmotionCNN(torch.nn.Module if _TORCH_AVAILABLE else object):
    def __init__(self, num_classes=7):
        if not _TORCH_AVAILABLE:
            return
        import torch.nn as nn
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(128 * 6 * 6, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)


def _get_model():
    global _model
    if _model is not None:
        return _model
    if not _TORCH_AVAILABLE:
        return None
    if not os.path.exists(MODEL_PATH):
        print(f"⚠️ Model not found: {MODEL_PATH} — mock mode")
        return None
    try:
        import torch
        checkpoint = torch.load(MODEL_PATH, map_location='cpu')
        num_classes = checkpoint.get('num_classes', 7)
        m = EmotionCNN(num_classes)
        m.load_state_dict(checkpoint['model_state_dict'])
        m.eval()
        _model = m
        print("✅ PyTorch emotion model loaded!")
        return _model
    except Exception as e:
        print(f"⚠️ Model load error: {e} — mock mode")
        return None


def _mock_prediction() -> dict:
    emotion    = random.choice(emotion_labels)
    traits     = emotion_to_traits.get(emotion, emotion_to_traits["neutral"])
    confidence = round(random.uniform(0.65, 0.95), 2)
    return {
        **traits,
        "dominant_emotion":   emotion,
        "emotion_confidence": confidence,
        "analysis_method":    "mock",
    }


def predict_face_traits(image_file: Any) -> dict:
    """
    Face image se personality traits predict karo.
    PyTorch model available ho toh real, warna mock.
    """
    if not image_file:
        return {"error": "no_image_provided"}

    model = _get_model()

    # ── Mock mode ─────────────────────────────────────────────────────────────
    if model is None or not _CV2_AVAILABLE:
        print("⚠️ Using mock face prediction")
        return _mock_prediction()

    # ── Real prediction ────────────────────────────────────────────────────────
    try:
        import torch
        from PIL import Image as PILImage

        image = PILImage.open(image_file).convert("RGB")
        image = np.array(image)
        gray  = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        if len(faces) == 0:
            print("⚠️ No face detected — mock prediction")
            return _mock_prediction()

        (x, y, w, h) = faces[0]
        roi = gray[y:y+h, x:x+w]
        roi = cv2.resize(roi, (48, 48))

        roi_tensor = torch.tensor(roi, dtype=torch.float32) / 255.0
        roi_tensor = (roi_tensor - 0.5) / 0.5
        roi_tensor = roi_tensor.unsqueeze(0).unsqueeze(0)  # (1, 1, 48, 48)

        with torch.no_grad():
            outputs = model(roi_tensor)
            probs   = torch.softmax(outputs, dim=1)[0]
            idx     = torch.argmax(probs).item()

        emotion    = emotion_labels[idx]
        confidence = round(probs[idx].item(), 2)

        print(f"✅ Face detected: {emotion} ({confidence*100:.1f}%)")

        traits = emotion_to_traits.get(emotion, emotion_to_traits["neutral"])
        return {
            **traits,
            "dominant_emotion":   emotion,
            "emotion_confidence": confidence,
            "analysis_method":    "pytorch_cnn",
        }

    except Exception as e:
        print(f"⚠️ Face inference error: {e} — mock prediction")
        return _mock_prediction()