from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import TestResult
from .serializers import UserSerializer, TestResultSerializer
from .models.predict_bigfive import predict_text_traits
from .models.voice_model import predict_voice_traits
from .models.facetest import predict_face_traits
from .models.fusion import fuse_all, average_face_expressions
import uuid
import json
import os

def _with_cors(resp: Response) -> Response:
    resp["Access-Control-Allow-Origin"] = "*"
    resp["Access-Control-Allow-Headers"] = "Content-Type"
    resp["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return resp


@api_view(['POST', 'OPTIONS'])
def predict_personality(request):
    if request.method == 'OPTIONS':
        return _with_cors(Response(status=status.HTTP_204_NO_CONTENT))

    text = request.data.get('text')
    audio = request.FILES.get('voice')
    image = request.FILES.get('face')

    results = {}

    if text:
        results['text'] = predict_text_traits(text)
    if audio:
        results['voice'] = predict_voice_traits(audio)
    if image:
        results['face'] = predict_face_traits(image)

    if not results:
        return _with_cors(Response({
            'error': 'No valid inputs provided. Send any of: text, voice (file), face (file).'
        }, status=status.HTTP_400_BAD_REQUEST))

    # If all three modalities are present, also include fused output
    if all(k in results for k in ('text', 'voice', 'face')):
        # Average face expressions first, then fuse with other modalities
        averaged_face = average_face_expressions(results['face'])
        results['fusion'] = fuse_all(results['text'], results['voice'], averaged_face)

    return _with_cors(Response(results))


@api_view(['POST', 'OPTIONS'])
def predict_face_only(request):
    if request.method == 'OPTIONS':
        return _with_cors(Response(status=status.HTTP_204_NO_CONTENT))

    image = request.FILES.get('face')
    if not image:
        return _with_cors(Response({'error': 'No face image provided'}, status=status.HTTP_400_BAD_REQUEST))

    face_result = predict_face_traits(image)
    return _with_cors(Response(face_result))


@api_view(['POST', 'OPTIONS'])
def predict_voice_only(request):
    if request.method == 'OPTIONS':
        return _with_cors(Response(status=status.HTTP_204_NO_CONTENT))

    audio = request.FILES.get('voice')
    if not audio:
        return _with_cors(Response({'error': 'No voice file provided'}, status=status.HTTP_400_BAD_REQUEST))

    print(f"Received audio file: {audio.name}")  # Debugging line
    voice_result = predict_voice_traits(audio)
    return _with_cors(Response(voice_result))


# ===== MULTIMODAL PREDICTION ENDPOINT FOR FRONTEND =====

@api_view(['POST', 'OPTIONS'])
def predict_multimodal(request):
    """Enhanced multimodal prediction endpoint for frontend integration"""
    if request.method == 'OPTIONS':
        return _with_cors(Response(status=status.HTTP_204_NO_CONTENT))

    try:
        text = request.data.get('text')
        audio = request.FILES.get('voice') or request.FILES.get('audio')
        image = request.FILES.get('face') or request.FILES.get('image')
        facial_results_json = request.data.get('facial_results')
        voice_results_json = request.data.get('voice_results')
        
        results = {}

        # Text analysis
        if text and text.strip():
            print(f"🔤 Processing text: '{text[:50]}...'")
            text_result = predict_text_traits(text)
            print(f"📝 Text analysis result: {text_result}")
            if 'error' not in text_result:
                results['text'] = text_result

        # Voice analysis - use existing results if provided, otherwise analyze new audio
        if voice_results_json:
            try:
                import json
                voice_results = json.loads(voice_results_json)
                print(f"🎙️ Using existing voice results: {voice_results}")
                results['voice'] = voice_results
            except Exception as e:
                print(f"❌ Error parsing voice results JSON: {e}")
        elif audio:
            print(f"🎙️ Processing voice file: {audio.name}, size: {audio.size}")
            voice_result = predict_voice_traits(audio)
            print(f"🔊 Voice analysis result: {voice_result}")
            if 'error' not in voice_result:
                results['voice'] = voice_result

        # Face analysis - use existing results if provided, otherwise analyze new image
        if facial_results_json:
            try:
                import json
                facial_results = json.loads(facial_results_json)
                print(f"📊 Using existing facial results: {facial_results}")
                results['face'] = facial_results
            except Exception as e:
                print(f"❌ Error parsing facial results JSON: {e}")
        elif image:
            print(f"📷 Processing face image: {image.name}, size: {image.size}")
            face_result = predict_face_traits(image)
            print(f"😊 Face analysis result: {face_result}")
            if 'error' not in face_result:
                results['face'] = face_result

        if not results:
            return _with_cors(Response({
                'error': 'No valid inputs provided. Send any of: text, voice (file), face (file).'
            }, status=status.HTTP_400_BAD_REQUEST))

        # Multimodal fusion if we have multiple modalities
        if len(results) >= 2:
            print("🔍 FUSION INPUT DEBUG:")
            print(f"   Text result: {results.get('text', {})}")
            print(f"   Voice result: {results.get('voice', {})}")
            print(f"   Raw face result: {results.get('face', {})}")
            
            # Average face expressions if available
            face_averaged = results.get('face', {})
            if isinstance(face_averaged, dict) and 'expressions' in face_averaged:
                print("📊 Face has 'expressions' - using average_face_expressions")
                face_averaged = average_face_expressions(face_averaged['expressions'])
            elif isinstance(face_averaged, dict) and any(key in ['neutral', 'smile', 'sad', 'surprised', 'happy', 'angry'] for key in face_averaged.keys()):
                print("📊 Face has expression keys - using average_face_expressions on direct results")
                face_averaged = average_face_expressions(face_averaged)
            else:
                print("📷 Face is single result - using as-is")
            
            print(f"   Final face for fusion: {face_averaged}")
            
            fusion_result = fuse_all(
                results.get('text', {}),
                results.get('voice', {}), 
                face_averaged
            )
            results['fusion'] = fusion_result

        return _with_cors(Response(results))
        
    except Exception as e:
        return _with_cors(Response(
            {'error': f'Prediction failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ))


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint"""
    return _with_cors(Response({
        'status': 'healthy',
        'service': 'personality-prediction-backend',
        'version': '1.0.0',
        'models_available': {
            'text': 'bigfive-regression-model',
            'voice': 'SpeechEmotionModel',
            'face': '_mini_XCEPTION'
        }
    }))

@api_view(['POST', 'OPTIONS'])
def submit_feedback(request):
    if request.method == 'OPTIONS':
        return _with_cors(Response(status=status.HTTP_204_NO_CONTENT))
    
    try:
        feedback = request.data.get('feedback')  # 'accurate' ya 'inaccurate'
        modality = request.data.get('modality')  # 'text', 'voice', 'face', 'fusion'
        results  = request.data.get('results')   # actual scores
        
        # Simple file mein save karo
        import json
        from datetime import datetime
        
        feedback_path = os.path.join(
            os.path.dirname(__file__), 
            'models', 'feedback_log.json'
        )
        
        # Existing feedback load karo
        if os.path.exists(feedback_path):
            with open(feedback_path, 'r') as f:
                all_feedback = json.load(f)
        else:
            all_feedback = []
        
        # Naya entry add karo
        all_feedback.append({
            "timestamp": datetime.now().isoformat(),
            "feedback":  feedback,
            "modality":  modality,
            "results":   results,
        })
        
        # Save karo
        with open(feedback_path, 'w') as f:
            json.dump(all_feedback, f, indent=2)
        
        # Accuracy stats calculate karo
        total    = len(all_feedback)
        accurate = sum(1 for f in all_feedback if f['feedback'] == 'accurate')
        accuracy = round((accurate / total) * 100, 1) if total > 0 else 0
        
        return _with_cors(Response({
            'message': 'Feedback saved',
            'total_feedback': total,
            'accuracy_rate': accuracy
        }))
        
    except Exception as e:
        return _with_cors(Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ))
