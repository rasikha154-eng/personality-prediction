import os
import numpy as np
import librosa
import joblib
import tempfile
import shutil

os.environ["PATH"] += os.pathsep + r"C:\ffmpeg\bin"

MODEL_PATH   = os.path.join(os.path.dirname(__file__), "emotion_rf_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "label_encoder.pkl")

_model = None
_le    = None

EMOTION_TO_PERSONALITY = {
    "neutral":  {"openness":50,"conscientiousness":60,"extraversion":50,"agreeableness":55,"neuroticism":40},
    "calm":     {"openness":55,"conscientiousness":70,"extraversion":45,"agreeableness":65,"neuroticism":30},
    "happy":    {"openness":70,"conscientiousness":60,"extraversion":75,"agreeableness":75,"neuroticism":25},
    "sad":      {"openness":55,"conscientiousness":50,"extraversion":35,"agreeableness":65,"neuroticism":70},
    "angry":    {"openness":45,"conscientiousness":50,"extraversion":60,"agreeableness":30,"neuroticism":75},
    "fear":     {"openness":50,"conscientiousness":45,"extraversion":30,"agreeableness":55,"neuroticism":80},
    "disgust":  {"openness":40,"conscientiousness":55,"extraversion":35,"agreeableness":35,"neuroticism":65},
    "surprise": {"openness":75,"conscientiousness":55,"extraversion":65,"agreeableness":60,"neuroticism":45},
}

def _load_models():
    global _model, _le
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        _le    = joblib.load(ENCODER_PATH)

def _extract_features(file_path):
    y, sr = librosa.load(file_path, sr=22050, duration=3.0)
    mfcc        = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    mfcc_delta  = librosa.feature.delta(mfcc)
    mfcc_delta2 = librosa.feature.delta(mfcc, order=2)
    chroma      = librosa.feature.chroma_stft(y=y, sr=sr)
    mel         = librosa.feature.melspectrogram(y=y, sr=sr)
    contrast    = librosa.feature.spectral_contrast(y=y, sr=sr)
    rolloff     = librosa.feature.spectral_rolloff(y=y, sr=sr)
    centroid    = librosa.feature.spectral_centroid(y=y, sr=sr)
    bandwidth   = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    harmonic    = librosa.effects.harmonic(y)
    tonnetz     = librosa.feature.tonnetz(y=harmonic, sr=sr)
    zcr         = np.mean(librosa.feature.zero_crossing_rate(y))
    rms         = np.mean(librosa.feature.rms(y=y))

    return np.concatenate([
        np.mean(mfcc, axis=1),          np.std(mfcc, axis=1),
        np.mean(mfcc_delta, axis=1),    np.std(mfcc_delta, axis=1),
        np.mean(mfcc_delta2, axis=1),   np.std(mfcc_delta2, axis=1),
        np.mean(chroma, axis=1),        np.std(chroma, axis=1),
        np.mean(mel, axis=1),
        np.mean(contrast, axis=1),
        np.mean(rolloff, axis=1),
        np.mean(centroid, axis=1),
        np.mean(bandwidth, axis=1),
        np.mean(tonnetz, axis=1),
        [zcr, rms]
    ])

def predict_voice_traits(audio_file_path=None):
    _load_models()
    temp_path = None
    wav_path  = None

    try:
        if audio_file_path and hasattr(audio_file_path, 'read'):
            with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
                shutil.copyfileobj(audio_file_path, tmp)
                temp_path = tmp.name

            # webm → wav convert karo
            wav_path = temp_path.replace('.webm', '.wav')
            ffmpeg = r"C:\ffmpeg\bin\ffmpeg.exe"
            os.system(f'"{ffmpeg}" -y -i "{temp_path}" -ar 22050 -ac 1 "{wav_path}" -loglevel quiet')
            file_path = wav_path if os.path.exists(wav_path) else temp_path

        elif audio_file_path and isinstance(audio_file_path, str):
            file_path = audio_file_path

        else:
            return {"error": "no_audio_provided"}

        features   = _extract_features(file_path).reshape(1, -1)
        pred_id    = _model.predict(features)[0]
        proba      = _model.predict_proba(features)[0]
        emotion    = _le.inverse_transform([pred_id])[0]
        confidence = round(float(proba[pred_id]), 2)

        personality = EMOTION_TO_PERSONALITY.get(
            emotion, EMOTION_TO_PERSONALITY["neutral"]
        )

        return {
            **personality,
            "detected_emotion":   emotion,
            "emotion_confidence": confidence,
        }

    except Exception as e:
        return {"error": "inference_failed", "detail": str(e)}

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)