import os
import numpy as np
import librosa
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
import joblib
from tqdm import tqdm

DATASET_PATH      = r"C:\personality-prediction\backend\personality_app\models\audio_speech_actors_01-24"
MODEL_SAVE_PATH   = r"C:\personality-prediction\backend\personality_app\models\emotion_rf_model.pkl"
ENCODER_SAVE_PATH = r"C:\personality-prediction\backend\personality_app\models\label_encoder.pkl"

EMOTION_MAP = {
    "01": "neutral", "02": "calm",    "03": "happy",
    "04": "sad",     "05": "angry",   "06": "fear",
    "07": "disgust", "08": "surprise"
}

def extract_features(file_path):
    try:
        y, sr = librosa.load(file_path, sr=22050, duration=3.0)

        # MFCC — 40 coefficients + delta + delta-delta
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        mfcc_delta  = librosa.feature.delta(mfcc)
        mfcc_delta2 = librosa.feature.delta(mfcc, order=2)

        # Chroma
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)

        # Mel spectrogram
        mel = librosa.feature.melspectrogram(y=y, sr=sr)

        # Spectral features
        spec_contrast  = librosa.feature.spectral_contrast(y=y, sr=sr)
        spec_rolloff   = librosa.feature.spectral_rolloff(y=y, sr=sr)
        spec_centroid  = librosa.feature.spectral_centroid(y=y, sr=sr)
        spec_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)

        # Tonnetz
        harmonic = librosa.effects.harmonic(y)
        tonnetz  = librosa.feature.tonnetz(y=harmonic, sr=sr)

        # ZCR + RMS
        zcr = np.mean(librosa.feature.zero_crossing_rate(y))
        rms = np.mean(librosa.feature.rms(y=y))

        features = np.concatenate([
            np.mean(mfcc, axis=1),          np.std(mfcc, axis=1),
            np.mean(mfcc_delta, axis=1),    np.std(mfcc_delta, axis=1),
            np.mean(mfcc_delta2, axis=1),   np.std(mfcc_delta2, axis=1),
            np.mean(chroma, axis=1),        np.std(chroma, axis=1),
            np.mean(mel, axis=1),
            np.mean(spec_contrast, axis=1),
            np.mean(spec_rolloff, axis=1),
            np.mean(spec_centroid, axis=1),
            np.mean(spec_bandwidth, axis=1),
            np.mean(tonnetz, axis=1),
            [zcr, rms]
        ])
        return features

    except Exception as e:
        print(f"Error: {file_path} — {e}")
        return None

def load_data():
    X, y = [], []
    for actor_folder in sorted(os.listdir(DATASET_PATH)):
        actor_path = os.path.join(DATASET_PATH, actor_folder)
        if not os.path.isdir(actor_path):
            continue
        files = [f for f in os.listdir(actor_path) if f.endswith(".wav")]
        for file in tqdm(files, desc=f"{actor_folder}"):
            parts = file.replace(".wav", "").split("-")
            if len(parts) != 7:
                continue
            emotion = EMOTION_MAP.get(parts[2])
            if not emotion:
                continue
            features = extract_features(os.path.join(actor_path, file))
            if features is not None:
                X.append(features)
                y.append(emotion)
    return np.array(X), np.array(y)

if __name__ == "__main__":
    print("Extracting features — thoda time lagega...")
    X, y = load_data()
    print(f"\nTotal samples: {len(X)}  |  Feature size: {X.shape[1]}")

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # Voting classifier — RF + GB combined
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        n_jobs=-1,
        random_state=42
    )
    gb = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )

    model = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', VotingClassifier(
            estimators=[('rf', rf), ('gb', gb)],
            voting='soft'
        ))
    ])

    print("\nTraining — CPU pe 15-20 min lag sakte hain...")
    model.fit(X_train, y_train)

    print("\nEvaluation:")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    joblib.dump(model, MODEL_SAVE_PATH)
    joblib.dump(le,    ENCODER_SAVE_PATH)
    print(f"\nModel saved → {MODEL_SAVE_PATH}")
    print(f"Encoder saved → {ENCODER_SAVE_PATH}")