"""
Standalone Facial Emotion Detection Module
Loads the emotion model independently without Django dependencies
"""

import os
import cv2
import numpy as np
from typing import Optional, Dict, Any

# Model path
EMOTION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "personality_app/models/_mini_XCEPTION.102-0.66.hdf5")
_emotion_model = None
_is_loading = False

# Emotion labels
EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Emotion to trait mapping
EMOTION_TO_TRAITS = {
    "angry": {"agreeableness": 0.2, "neuroticism": 0.8},
    "disgust": {"agreeableness": 0.3, "openness": 0.3, "neuroticism": 0.7},
    "fear": {"neuroticism": 0.8, "conscientiousness": 0.4},
    "happy": {"extraversion": 0.9, "agreeableness": 0.8, "neuroticism": 0.2},
    "sad": {"neuroticism": 0.7, "openness": 0.5, "extraversion": 0.3},
    "surprise": {"openness": 0.9, "extraversion": 0.7, "neuroticism": 0.3},
    "neutral": {"conscientiousness": 0.6, "agreeableness": 0.5, "neuroticism": 0.4},
}


def get_emotion_model():
    """Load and cache the emotion recognition model."""
    global _emotion_model, _is_loading
    
    if _emotion_model is not None:
        return _emotion_model
    
    if _is_loading:
        return None
    
    if not os.path.exists(EMOTION_MODEL_PATH):
        print(f"⚠️ Emotion model not found at: {EMOTION_MODEL_PATH}")
        print(f"   Please ensure _mini_XCEPTION.102-0.66.hdf5 exists in: {os.path.dirname(EMOTION_MODEL_PATH)}")
        return None
    
    try:
        _is_loading = True
        
        # Lazy import of Keras
        from keras.models import load_model
        
        print(f"🔄 Loading facial emotion model from: {EMOTION_MODEL_PATH}")
        _emotion_model = load_model(EMOTION_MODEL_PATH, compile=False)
        print(f"✅ Facial emotion model loaded successfully")
        print(f"   Model input shape: {_emotion_model.input_shape}")
        print(f"   Model output shape: {_emotion_model.output_shape}")
        
        return _emotion_model
        
    except ImportError as e:
        print(f"⚠️ Keras/TensorFlow import error: {e}")
        print(f"   Install with: pip install tensorflow keras")
        return None
        
    except Exception as e:
        print(f"⚠️ Error loading emotion model: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        _is_loading = False


def detect_emotion_in_frame(frame: np.ndarray) -> Optional[Dict[str, Any]]:
    """
    Detect emotion from a full frame image.
    
    Args:
        frame: Input image (BGR format from OpenCV)
    
    Returns:
        Dictionary with emotion results or None if no face found
    """
    model = get_emotion_model()
    if model is None:
        return None
    
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Load face detector
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        
        if len(faces) == 0:
            return None
        
        # Process first face
        x, y, w, h = faces[0]
        roi_gray = gray[y:y+h, x:x+w]
        
        # Resize and normalize for model
        roi_gray = cv2.resize(roi_gray, (64, 64))
        roi = roi_gray.astype("float32") / 255.0
        roi = np.expand_dims(roi, axis=-1)  # (64, 64, 1)
        roi = np.expand_dims(roi, axis=0)   # (1, 64, 64, 1)
        
        # Predict emotion
        preds = model.predict(roi, verbose=0)[0]
        emotion_idx = int(np.argmax(preds))
        emotion = EMOTION_LABELS[emotion_idx]
        confidence = float(preds[emotion_idx])
        
        # Create emotion scores dict
        emotion_scores = {
            EMOTION_LABELS[i]: float(preds[i]) 
            for i in range(len(EMOTION_LABELS))
        }
        
        return {
            "emotion": emotion,
            "emotion_confidence": confidence,
            "emotion_scores": emotion_scores,
            "face_bbox": {"x": x, "y": y, "w": w, "h": h}
        }
        
    except Exception as e:
        print(f"⚠️ Error detecting emotion: {e}")
        return None


def detect_emotion_in_region(frame: np.ndarray, x: int, y: int, w: int, h: int) -> Optional[Dict[str, Any]]:
    """
    Detect emotion in a specific face region.
    
    Args:
        frame: Input image
        x, y, w, h: Face region coordinates
    
    Returns:
        Dictionary with emotion results or None
    """
    model = get_emotion_model()
    if model is None:
        return None
    
    try:
        # Extract and validate face region
        face_region = frame[y:y+h, x:x+w]
        
        if face_region.size == 0:
            return None
        
        # Convert to grayscale
        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        
        # Resize for model
        gray_resized = cv2.resize(gray, (64, 64))
        
        # Prepare input
        roi = gray_resized.astype("float32") / 255.0
        roi = np.expand_dims(roi, axis=-1)  # (64, 64, 1)
        roi = np.expand_dims(roi, axis=0)   # (1, 64, 64, 1)
        
        # Predict
        preds = model.predict(roi, verbose=0)[0]
        emotion_idx = int(np.argmax(preds))
        emotion = EMOTION_LABELS[emotion_idx]
        confidence = float(preds[emotion_idx])
        
        emotion_scores = {
            EMOTION_LABELS[i]: float(preds[i]) 
            for i in range(len(EMOTION_LABELS))
        }
        
        return {
            "emotion": emotion,
            "emotion_confidence": confidence,
            "emotion_scores": emotion_scores
        }
        
    except Exception as e:
        print(f"⚠️ Error detecting emotion in region: {e}")
        return None


def emotion_to_personality_traits(emotion: str) -> Dict[str, float]:
    """
    Map emotion to Big Five personality traits.
    
    Args:
        emotion: Emotion label
    
    Returns:
        Dictionary of trait scores 0-1
    """
    trait_map = EMOTION_TO_TRAITS.get(emotion.lower(), {})
    
    # Default traits
    default_traits = {
        "openness": 0.5,
        "conscientiousness": 0.5,
        "extraversion": 0.5,
        "agreeableness": 0.5,
        "neuroticism": 0.5,
    }
    
    return {**default_traits, **trait_map}


# Pre-load model on import
print("🔄 Initializing facial emotion detector...")
model = get_emotion_model()
if model:
    print("✅ Facial emotion detector ready")
else:
    print("⚠️ Facial emotion detector will load on first use")
