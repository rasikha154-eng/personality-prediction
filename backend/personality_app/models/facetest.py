import os
import sys

PY311_SITE_PACKAGES = r"C:\Users\rasik\AppData\Local\Programs\Python\Python311\Lib\site-packages"
if PY311_SITE_PACKAGES not in sys.path:
    sys.path.insert(0, PY311_SITE_PACKAGES)

import cv2
import numpy as np
from PIL import Image

EMOTION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "_mini_XCEPTION.102-0.66.hdf5")
_emotion_model = None

emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

EMOTION_TO_PERSONALITY = {
    "angry":   {"openness": 35, "conscientiousness": 45, "extraversion": 55, "agreeableness": 20, "neuroticism": 80},
    "disgust": {"openness": 30, "conscientiousness": 50, "extraversion": 30, "agreeableness": 25, "neuroticism": 70},
    "fear":    {"openness": 40, "conscientiousness": 40, "extraversion": 25, "agreeableness": 50, "neuroticism": 85},
    "happy":   {"openness": 75, "conscientiousness": 65, "extraversion": 85, "agreeableness": 80, "neuroticism": 15},
    "sad":     {"openness": 50, "conscientiousness": 45, "extraversion": 25, "agreeableness": 60, "neuroticism": 75},
    "surprise":{"openness": 85, "conscientiousness": 50, "extraversion": 70, "agreeableness": 60, "neuroticism": 40},
    "neutral": {"openness": 50, "conscientiousness": 60, "extraversion": 50, "agreeableness": 55, "neuroticism": 35},
}


def _get_emotion_model():
    global _emotion_model
    if _emotion_model is not None:
        return _emotion_model

    if not os.path.exists(EMOTION_MODEL_PATH):
        print(f"Model file not found: {EMOTION_MODEL_PATH}")
        return None

    try:
        print("Loading emotion model...")
        from keras.models import load_model
        _emotion_model = load_model(EMOTION_MODEL_PATH, compile=False)
        print("Emotion model loaded OK")
        return _emotion_model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None


def predict_face_traits(image_file):
    if not image_file:
        return {"error": "no_image_provided"}

    model = _get_emotion_model()
    if model is None:
        return {"error": "face_model_not_available"}

    try:
        image = Image.open(image_file).convert("RGB")
        image = np.array(image)
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        if len(faces) == 0:
            print("No face detected")
            return {"error": "no_face_detected"}

        (x, y, w, h) = faces[0]
        roi = gray[y:y+h, x:x+w]
        roi = cv2.resize(roi, (64, 64))
        roi = roi.astype("float32") / 255.0
        roi = np.expand_dims(roi, axis=-1)
        roi = np.expand_dims(roi, axis=0)

        preds = model.predict(roi, verbose=0)[0]
        emotion_idx = int(np.argmax(preds))
        emotion = emotion_labels[emotion_idx]
        confidence = round(float(preds[emotion_idx]), 2)

        print(f"Detected emotion: {emotion} ({confidence*100:.1f}%)")

        personality = EMOTION_TO_PERSONALITY.get(
            emotion, EMOTION_TO_PERSONALITY["neutral"]
        )

        return {
            **personality,
            "dominant_emotion": emotion,
            "emotion_confidence": confidence,
        }

    except Exception as e:
        print(f"Face inference error: {e}")
        return {"error": "face_inference_failed", "detail": str(e)}