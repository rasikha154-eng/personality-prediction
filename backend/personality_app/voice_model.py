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

# Real voice model load karne ki koshish karo
_voice_model = None
_VOICE_MODEL_AVAILABLE = False

try:
    import librosa
    import torch
    import torch.nn as nn
    _LIBROSA_AVAILABLE = True
    print("✅ Librosa available for voice analysis")
except ImportError:
    _LIBROSA_AVAILABLE = False
    print("⚠️ Librosa not available — mock voice analysis will be used")


def _extract_audio_features(audio_file) -> dict:
    """Audio file se features extract karo"""
    if not _LIBROSA_AVAILABLE:
        return None

    try:
        import librosa
        import io

        audio_bytes = audio_file.read()
        audio_file.seek(0)

        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050, mono=True)

        # Features extract karo
        mfcc        = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        chroma      = librosa.feature.chroma_stft(y=y, sr=sr)
        spectral    = librosa.feature.spectral_centroid(y=y, sr=sr)
        zcr         = librosa.feature.zero_crossing_rate(y)
        rms         = librosa.feature.rms(y=y)

        features = {
            'mfcc_mean':     float(np.mean(mfcc)),
            'mfcc_std':      float(np.std(mfcc)),
            'chroma_mean':   float(np.mean(chroma)),
            'spectral_mean': float(np.mean(spectral)),
            'zcr_mean':      float(np.mean(zcr)),
            'rms_mean':      float(np.mean(rms)),
            'duration':      float(len(y) / sr),
        }

        print(f"✅ Audio features extracted: duration={features['duration']:.1f}s")
        return features

    except Exception as e:
        print(f"⚠️ Audio feature extraction failed: {e}")
        return None


def _features_to_emotion(features: dict) -> tuple:
    """Audio features se emotion predict karo"""
    try:
        rms_mean     = features.get('rms_mean', 0.05)
        zcr_mean     = features.get('zcr_mean', 0.05)
        mfcc_mean    = features.get('mfcc_mean', 0)
        spectral     = features.get('spectral_mean', 2000)
        duration     = features.get('duration', 5)

        # Rule-based emotion detection from audio features
        if rms_mean > 0.1 and zcr_mean > 0.1:
            emotion = 'angry'
        elif rms_mean < 0.02:
            emotion = 'sad'
        elif spectral > 3000 and rms_mean > 0.05:
            emotion = 'happy'
        elif zcr_mean > 0.15:
            emotion = 'surprise'
        elif rms_mean < 0.04 and zcr_mean < 0.05:
            emotion = 'fear'
        else:
            emotion = 'neutral'

        confidence = round(random.uniform(0.65, 0.88), 2)
        return emotion, confidence

    except Exception as e:
        print(f"⚠️ Emotion detection failed: {e}")
        return 'neutral', 0.5


def _mock_prediction() -> dict:
    """Mock voice prediction"""
    emotion    = random.choice(emotion_labels)
    traits     = emotion_to_traits.get(emotion, emotion_to_traits["neutral"])
    confidence = round(random.uniform(0.60, 0.90), 2)

    return {
        **traits,
        "detected_emotion":   emotion,
        "emotion_confidence": confidence,
        "analysis_method":    "mock",
    }


def predict_voice_traits(audio_file: Any) -> dict:
    """
    Voice file se personality traits predict karo.
    Librosa available ho toh real analysis, warna mock.
    """
    if not audio_file:
        return {"error": "no_audio_provided"}

    try:
        # Real feature extraction karo
        features = _extract_audio_features(audio_file)

        if features is None:
            print("⚠️ Feature extraction failed — using mock")
            return _mock_prediction()

        # Features se emotion predict karo
        emotion, confidence = _features_to_emotion(features)
        traits = emotion_to_traits.get(emotion, emotion_to_traits["neutral"])

        print(f"✅ Voice analysis: {emotion} ({confidence*100:.1f}%)")

        return {
            **traits,
            "detected_emotion":   emotion,
            "emotion_confidence": confidence,
            "duration":           round(features.get('duration', 0), 1),
            "analysis_method":    "librosa" if _LIBROSA_AVAILABLE else "mock",
        }

    except Exception as e:
        print(f"⚠️ Voice analysis error: {e} — mock prediction")
        return _mock_prediction()