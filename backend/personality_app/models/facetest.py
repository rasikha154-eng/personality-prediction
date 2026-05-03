import os
import random
import cv2
import numpy as np
from PIL import Image
from typing import Optional
import torch
import torch.nn as nn

# ── Paths ──────────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "emotion_model.pth")

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

# ── Model architecture (training se same hona chahiye) ────────────────────────
class EmotionCNN(nn.Module):
    def __init__(self, num_classes=7):
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


# ── Model loader ──────────────────────────────────────────────────────────────
_model = None

def _get_model():
    global _model
    if _model is not None:
        return _model

    if not os.path.exists(MODEL_PATH):
        print(f"⚠️ Model not found: {MODEL_PATH} — mock mode")
        return None

    try:
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


# ── Mock prediction ────────────────────────────────────────────────────────────
def _mock_prediction():
    emotion = random.choice(emotion_labels)
    traits  = emotion_to_traits.get(emotion, emotion_to_traits["neutral"])
    return {
        **traits,
        "dominant_emotion":   emotion,
        "emotion_confidence": round(random.uniform(0.65, 0.95), 2),
    }


# ── Main prediction function ───────────────────────────────────────────────────
def predict_face_traits(image_file):
    if not image_file:
        return {"error": "no_image_provided"}

    model = _get_model()
    if model is None:
        return _mock_prediction()

    try:
        # Image load karo
        image = Image.open(image_file).convert("RGB")
        image = np.array(image)
        gray  = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

        # Face detect karo
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        if len(faces) == 0:
            print("⚠️ No face detected — mock prediction")
            return _mock_prediction()

        # Face crop karo
        (x, y, w, h) = faces[0]
        roi = gray[y:y+h, x:x+w]
        roi = cv2.resize(roi, (48, 48))  # Training size 48x48 tha

        # Tensor banao
        roi_tensor = torch.tensor(roi, dtype=torch.float32) / 255.0
        roi_tensor = (roi_tensor - 0.5) / 0.5  # Normalize — training se same
        roi_tensor = roi_tensor.unsqueeze(0).unsqueeze(0)  # (1, 1, 48, 48)

        # Predict karo
        with torch.no_grad():
            outputs = model(roi_tensor)
            probs   = torch.softmax(outputs, dim=1)[0]
            idx     = torch.argmax(probs).item()

        emotion    = emotion_labels[idx]
        confidence = round(probs[idx].item(), 2)

        print(f"✅ Detected: {emotion} ({confidence*100:.1f}%)")

        traits = emotion_to_traits.get(emotion, emotion_to_traits["neutral"])
        return {
            **traits,
            "dominant_emotion":   emotion,
            "emotion_confidence": confidence,
        }

    except Exception as e:
        print(f"⚠️ Inference error: {e} — mock prediction")
        return _mock_prediction()