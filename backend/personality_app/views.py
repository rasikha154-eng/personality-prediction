import json
import traceback
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

# ── Adaptive weights ───────────────────────────────────────────────────────────
try:
    from .adaptive_weights import adjust_weights, get_feedback_stats, record_feedback
    ADAPTIVE_WEIGHTS_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Adaptive weights not available: {e}")
    ADAPTIVE_WEIGHTS_AVAILABLE = False


# ── Model imports ──────────────────────────────────────────────────────────────
try:
    from .personality_analyzer import PersonalityAnalyzer
    analyzer = PersonalityAnalyzer()
    ANALYZER_AVAILABLE = True
except Exception as e:
    print(f"⚠️ PersonalityAnalyzer not available: {e}")
    ANALYZER_AVAILABLE = False

try:
    from .models.facetest import predict_face_traits
    FACE_MODEL_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Face model not available: {e}")
    FACE_MODEL_AVAILABLE = False

try:
    from .voice_model import predict_voice_traits
    VOICE_MODEL_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Voice model not available: {e}")
    VOICE_MODEL_AVAILABLE = False

try:
    from .fusion import fuse_all, average_face_expressions
    FUSION_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Fusion not available: {e}")
    FUSION_AVAILABLE = False


# ── Health check ───────────────────────────────────────────────────────────────
@csrf_exempt
def health_check(request):
    return JsonResponse({
        "status":    "ok",
        "analyzer":  ANALYZER_AVAILABLE,
        "face_model":FACE_MODEL_AVAILABLE,
        "voice_model":VOICE_MODEL_AVAILABLE,
        "fusion":    FUSION_AVAILABLE,
        "adaptive":  ADAPTIVE_WEIGHTS_AVAILABLE,
    })


# ── Text prediction ────────────────────────────────────────────────────────────
@csrf_exempt
def predict_personality(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        body = json.loads(request.body)
        text = body.get("text", "").strip()

        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)

        if not ANALYZER_AVAILABLE:
            return JsonResponse({"error": "Analyzer not available"}, status=503)

        result = analyzer.analyze_text(text)
        return JsonResponse(result)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# ── Face prediction ────────────────────────────────────────────────────────────
@csrf_exempt
def predict_face_only(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        image_file = request.FILES.get("face")
        if not image_file:
            return JsonResponse({"error": "No face image provided"}, status=400)

        if not FACE_MODEL_AVAILABLE:
            return JsonResponse({"error": "Face model not available"}, status=503)

        result = predict_face_traits(image_file)
        return JsonResponse(result)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# ── Voice prediction ───────────────────────────────────────────────────────────
@csrf_exempt
def predict_voice_only(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        voice_file = request.FILES.get("voice")
        if not voice_file:
            return JsonResponse({"error": "No voice file provided"}, status=400)

        if not VOICE_MODEL_AVAILABLE:
            return JsonResponse({"error": "Voice model not available"}, status=503)

        result = predict_voice_traits(voice_file)
        return JsonResponse(result)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# ── Multimodal fusion ──────────────────────────────────────────────────────────
@csrf_exempt
def predict_multimodal(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        text_result   = None
        voice_result  = None
        face_result   = None

        # ── Text ──────────────────────────────────────────────────────────────
        text = request.POST.get("text", "").strip()
        if text and ANALYZER_AVAILABLE:
            try:
                text_result = analyzer.analyze_text(text)
                print(f"✅ Text analysis: {text_result}")
            except Exception as e:
                print(f"⚠️ Text analysis failed: {e}")

        # ── Voice ─────────────────────────────────────────────────────────────
        voice_results_json = request.POST.get("voice_results")
        if voice_results_json:
            try:
                voice_result = json.loads(voice_results_json)
                print(f"✅ Voice results (pre-analyzed): {voice_result}")
            except Exception as e:
                print(f"⚠️ Voice JSON parse failed: {e}")

        if not voice_result:
            voice_file = request.FILES.get("voice")
            if voice_file and VOICE_MODEL_AVAILABLE:
                try:
                    voice_result = predict_voice_traits(voice_file)
                    print(f"✅ Voice analysis: {voice_result}")
                except Exception as e:
                    print(f"⚠️ Voice analysis failed: {e}")

        # ── Face ──────────────────────────────────────────────────────────────
        facial_results_json = request.POST.get("facial_results")
        if facial_results_json:
            try:
                facial_data = json.loads(facial_results_json)
                print(f"✅ Facial results (pre-analyzed): {facial_data}")
                if FUSION_AVAILABLE:
                    face_result = average_face_expressions(facial_data)
                else:
                    face_result = facial_data
            except Exception as e:
                print(f"⚠️ Facial JSON parse failed: {e}")

        if not face_result:
            face_file = request.FILES.get("face")
            if face_file and FACE_MODEL_AVAILABLE:
                try:
                    face_result = predict_face_traits(face_file)
                    print(f"✅ Face analysis: {face_result}")
                except Exception as e:
                    print(f"⚠️ Face analysis failed: {e}")

        # ── Fusion ────────────────────────────────────────────────────────────
        if not any([text_result, voice_result, face_result]):
            return JsonResponse({"error": "No valid data for analysis"}, status=400)

        if FUSION_AVAILABLE:
            fusion = fuse_all(text_result, voice_result, face_result)
        else:
            fusion = text_result or voice_result or face_result
            fusion["fusion_method"] = "single_modality"

        # ── Normalize all results to 0-100 scale ───────────────────────────────
        def normalize_results(results):
            """Convert decimal (0-1) or percentage (0-100) results to 0-100 scale"""
            if not results:
                return results
            normalized = {}
            big_five = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
            for key, value in results.items():
                if key in big_five and isinstance(value, (int, float)):
                    # If value is 0-1, convert to 0-100; if already 0-100, keep as is
                    if 0 <= value <= 1:
                        normalized[key] = round(value * 100, 2)
                    else:
                        normalized[key] = round(value, 2)
                else:
                    normalized[key] = value
            return normalized

        # Normalize all results
        text_result_normalized = normalize_results(text_result)
        voice_result_normalized = normalize_results(voice_result)
        face_result_normalized = normalize_results(face_result)
        fusion_normalized = normalize_results(fusion)

        return JsonResponse({
            "text":   text_result_normalized,
            "voice":  voice_result_normalized,
            "face":   face_result_normalized,
            "fusion": fusion_normalized,
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


# ── Feedback ───────────────────────────────────────────────────────────────────
@csrf_exempt
def submit_feedback(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        body        = json.loads(request.body)
        feedback    = body.get("feedback", "")
        results     = body.get("results", {})
        is_accurate = feedback == "accurate"

        if ADAPTIVE_WEIGHTS_AVAILABLE:
            record_feedback(is_accurate)
            new_weights = adjust_weights(is_accurate, results)
            stats       = get_feedback_stats()
        else:
            new_weights = {'text': 0.3, 'voice': 0.2, 'face': 0.5}
            stats       = {"total_feedback": 0, "accuracy_rate": 0}

        print(f"✅ Feedback received: {'accurate' if is_accurate else 'inaccurate'}")
        print(f"   New weights: {new_weights}")

        return JsonResponse({
            "success":        True,
            "message":        "Shukriya! Feedback recorded.",
            "new_weights":    new_weights,
            "accuracy_rate":  stats["accuracy_rate"],
            "total_feedback": stats["total_feedback"],
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)