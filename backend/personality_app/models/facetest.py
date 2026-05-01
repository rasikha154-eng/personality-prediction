import random

# Mock implementation for face analysis
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Emotion to Trait Mapping (example logic)
emotion_to_traits = {
    "angry": {"agreeableness": 0.2, "neuroticism": 0.8},
    "disgust": {"agreeableness": 0.3, "openness": 0.3, "neuroticism": 0.7},
    "fear": {"neuroticism": 0.8, "conscientiousness": 0.4},
    "happy": {"extraversion": 0.9, "agreeableness": 0.8, "neuroticism": 0.2},
    "sad": {"neuroticism": 0.7, "openness": 0.5, "extraversion": 0.3},
    "surprise": {"openness": 0.9, "extraversion": 0.7, "neuroticism": 0.3},
    "neutral": {"conscientiousness": 0.6, "agreeableness": 0.5, "neuroticism": 0.4},
}


def predict_face_traits(image_file):
    """
    Predict personality traits from facial expression
    """
    if not image_file:
        return {"error": "no_image_provided"}

    # Mock emotion detection
    detected_emotion = random.choice(emotion_labels)
    emotion_confidence = random.uniform(0.65, 0.95)

    # Base personality scores
    base_scores = {
        "openness": random.randint(40, 80),
        "conscientiousness": random.randint(50, 85),
        "extraversion": random.randint(30, 75),
        "agreeableness": random.randint(45, 90),
        "neuroticism": random.randint(20, 60)
    }

    # Adjust scores based on detected emotion
    trait_weights = emotion_to_traits.get(detected_emotion, {})
    for trait, weight in trait_weights.items():
        # Apply emotion-based adjustment
        adjustment = int((weight - 0.5) * 20)  # Convert weight to score adjustment
        base_scores[trait] = max(0, min(100, base_scores[trait] + adjustment))

    return {
        **base_scores,
        "dominant_emotion": detected_emotion,
        "emotion_confidence": round(emotion_confidence, 2)
    }
    
    # Ensure model is available
    model = _get_emotion_model()
    if model is None:
        return {"error": "face_model_not_available", "detail": f"Missing file: {EMOTION_MODEL_PATH}"}

    try:
        # Read and convert image
        image = Image.open(image_file).convert("RGB")
        image = np.array(image)
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        print("Image loaded and converted to grayscale")

        # Load Haar cascade for face detection
        face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        print(f"Detected {len(faces)} face(s)")

        if len(faces) == 0:
            return {"error": "no_face_detected", "detail": "No face found in the image"}

        # Process the first face detected
        (x, y, w, h) = faces[0]
        roi_gray = gray[y:y + h, x:x + w]
        
        # Model expects 64x64x1
        roi_gray = cv2.resize(roi_gray, (64, 64))
        roi = roi_gray.astype("float32") / 255.0
        roi = np.expand_dims(roi, axis=-1)  # add channel dim -> (64,64,1)
        roi = np.expand_dims(roi, axis=0)   # add batch dim -> (1,64,64,1)
        print("Face ROI prepared for model input")

        # Predict emotion
        preds = model.predict(roi)[0]
        emotion_idx = int(np.argmax(preds))
        emotion = emotion_labels[emotion_idx]
        confidence = float(preds[emotion_idx])
        
        print(f"Predicted emotion: {emotion} (confidence: {confidence:.3f})")
        print(f"Raw predictions: {preds}")

        # Map to Big Five traits
        trait_map = emotion_to_traits.get(emotion, {})
        default_traits = {
            "openness": 0.5,
            "conscientiousness": 0.5,
            "extraversion": 0.5,
            "agreeableness": 0.5,
            "neuroticism": 0.5,
        }

        final_traits = {**default_traits, **trait_map}
        final_traits["dominant_emotion"] = emotion
        final_traits["emotion_confidence"] = confidence

        print("Facial trait prediction completed successfully!")
        return final_traits

    except Exception as exc:
        print(f"Error in facial trait prediction: {exc}")
        import traceback
        traceback.print_exc()
        return {"error": "face_inference_failed", "detail": str(exc)}


# Keep the original webcam test function for testing purposes
def test_webcam():
    """
    Test function to run facial emotion recognition with webcam
    """
    model = _get_emotion_model()
    if model is None:
        print("Model not available for webcam test")
        return

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(0)

    print("Press 'q' to quit webcam test.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            roi_gray = gray[y:y + h, x:x + w]
            roi_gray = cv2.resize(roi_gray, (64, 64))
            roi_gray = roi_gray.astype("float") / 255.0
            roi_gray = np.expand_dims(roi_gray, axis=-1)
            roi_gray = np.expand_dims(roi_gray, axis=0)

            preds = model.predict(roi_gray)
            emotion_idx = np.argmax(preds)
            emotion_text = emotion_labels[emotion_idx]

            # Draw rectangle and text
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, emotion_text, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)

        cv2.imshow("Facial Emotion Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    test_webcam()
