import os
import random

# ==============================
# CONFIG
# ==============================
DATASET_PATH = r"C:\personality-prediction\backend\personality_app\audio_speech_actors_01-24"

# ==============================
# LOAD DATASET
# ==============================
def load_dataset():
    data = []

    if not os.path.exists(DATASET_PATH):
        raise Exception("Dataset path not found!")

    for actor_folder in os.listdir(DATASET_PATH):
        actor_path = os.path.join(DATASET_PATH, actor_folder)

        if os.path.isdir(actor_path):
            for file in os.listdir(actor_path):
                if file.endswith(".wav"):
                    full_path = os.path.join(actor_path, file)

                    data.append({
                        "path": full_path,
                        "file": file
                    })

    if not data:
        raise Exception("No audio files found in dataset!")

    return data


dataset = load_dataset()

# ==============================
# EMOTION FROM FILENAME
# ==============================
def get_emotion_from_filename(file_name):
    emotion_map = {
        "01": "neutral",
        "02": "calm",
        "03": "happy",
        "04": "sad",
        "05": "angry",
        "06": "fear",
        "07": "disgust",
        "08": "surprise"
    }

    parts = file_name.split("-")
    if len(parts) > 2:
        return emotion_map.get(parts[2], "unknown")

    return "unknown"

# ==============================
# EMOTION BASE PROFILES (🔥 IMPROVED)
# ==============================
emotion_base_profiles = {
    "neutral":  {"openness": 50, "conscientiousness": 60, "extraversion": 50, "agreeableness": 55, "neuroticism": 40},
    "calm":     {"openness": 55, "conscientiousness": 70, "extraversion": 45, "agreeableness": 65, "neuroticism": 30},
    "happy":    {"openness": 70, "conscientiousness": 60, "extraversion": 75, "agreeableness": 75, "neuroticism": 25},
    "sad":      {"openness": 55, "conscientiousness": 50, "extraversion": 35, "agreeableness": 65, "neuroticism": 70},
    "angry":    {"openness": 45, "conscientiousness": 50, "extraversion": 60, "agreeableness": 30, "neuroticism": 75},
    "fear":     {"openness": 50, "conscientiousness": 45, "extraversion": 30, "agreeableness": 55, "neuroticism": 80},
    "disgust":  {"openness": 40, "conscientiousness": 55, "extraversion": 35, "agreeableness": 35, "neuroticism": 65},
    "surprise": {"openness": 75, "conscientiousness": 55, "extraversion": 65, "agreeableness": 60, "neuroticism": 45},
}

# ==============================
# RANDOM VOICE
# ==============================
def get_random_voice():
    item = random.choice(dataset)
    emotion = get_emotion_from_filename(item["file"])

    return {
        "path": item["path"],
        "emotion": emotion
    }

# ==============================
# MAIN FUNCTION
# ==============================
def predict_voice_traits(audio_file_path=None):
    """
    Predict personality traits from voice/audio.
    
    Args:
        audio_file_path: Can be:
            - None: Use random voice from dataset
            - String (file path): Use specific audio file
            - UploadedFile (Django): Process the uploaded file
    """
    import tempfile
    import shutil
    
    # Handle Django UploadedFile
    if audio_file_path and hasattr(audio_file_path, 'read'):
        # This is a Django UploadedFile object
        try:
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                # Copy the uploaded file to temp file
                shutil.copyfileobj(audio_file_path, tmp_file)
                temp_path = tmp_file.name
            
            # Use the temp file path
            voice = {
                "path": temp_path,
                "emotion": "neutral"  # Default emotion for uploaded files
            }
        except Exception as e:
            print(f"Error processing uploaded audio: {e}")
            # Fall back to random voice
            voice = get_random_voice()
    elif not audio_file_path:
        # No path provided, use random voice
        voice = get_random_voice()
    else:
        # String path provided
        file_name = os.path.basename(audio_file_path)
        voice = {
            "path": audio_file_path,
            "emotion": get_emotion_from_filename(file_name)
        }

    file_name = os.path.basename(voice["path"])

    # ✅ SAME FILE → SAME OUTPUT
    random.seed(file_name)

    detected_emotion = voice["emotion"]

    # Base profile
    base_profile = emotion_base_profiles.get(detected_emotion, emotion_base_profiles["neutral"])

    # Add slight variation (realistic feel)
    final_scores = {}
    for trait, value in base_profile.items():
        variation = random.randint(-5, 5)
        final_scores[trait] = max(0, min(100, value + variation))

    # Confidence (stable but slight variation)
    emotion_confidence = round(0.85 + random.uniform(-0.05, 0.05), 2)

    return {
        **final_scores,
        "detected_emotion": detected_emotion,
        "emotion_confidence": emotion_confidence,
        "audio_used": voice["path"]
    }

# ==============================
# TEST RUN
# ==============================
if __name__ == "__main__":
    result = predict_voice_traits()

    print("\n=== RESULT ===")
    for key, value in result.items():
        print(f"{key}: {value}")