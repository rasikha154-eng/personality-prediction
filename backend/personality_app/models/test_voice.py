from voice_model import predict_voice_traits

# Dataset se koi bhi ek file ka path do
result = predict_voice_traits(
    r"C:\personality-prediction\backend\personality_app\models\audio_speech_actors_01-24\Actor_01\03-01-01-01-01-01-01.wav"
)

print("\n=== RESULT ===")
for key, value in result.items():
    print(f"{key}: {value}")