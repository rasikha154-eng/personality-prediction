from typing import Dict, Any
import numpy as np


def load_adaptive_weights() -> dict:
    try:
        import os, sys
        app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if app_dir not in sys.path:
            sys.path.insert(0, app_dir)
        from personality_app.adaptive_weights import load_weights
        weights = load_weights()
        print(f"🎯 Adaptive weights loaded: {weights}")
        return weights
    except Exception as e:
        print(f"⚠️ Could not load adaptive weights: {e} — using defaults")
        return {'text': 0.3, 'voice': 0.2, 'face': 0.5}


def fuse_all(text_result: Dict[str, Any], voice_result: Dict[str, Any], face_result: Dict[str, Any]) -> Dict[str, Any]:
    print("🔬 FUSION: Starting multimodal fusion...")

    big_five_traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
    weights         = load_adaptive_weights()
    print(f"🎯 Using weights: {weights}")

    fused_results = {}

    for trait in big_five_traits:
        trait_scores  = []
        trait_weights = []

        if text_result and trait in text_result and isinstance(text_result[trait], (int, float)):
            score = text_result[trait] / 100.0 if text_result[trait] > 1 else text_result[trait]
            trait_scores.append(score)
            trait_weights.append(weights['text'])
            print(f"   📝 Text  {trait}: {score:.3f}")

        if voice_result and trait in voice_result and isinstance(voice_result[trait], (int, float)):
            score = voice_result[trait] / 100.0 if voice_result[trait] > 1 else voice_result[trait]
            trait_scores.append(score)
            trait_weights.append(weights['voice'])
            print(f"   🎙️ Voice {trait}: {score:.3f}")

        if face_result and trait in face_result and isinstance(face_result[trait], (int, float)):
            score = face_result[trait] / 100.0 if face_result[trait] > 1 else face_result[trait]
            trait_scores.append(score)
            trait_weights.append(weights['face'])
            print(f"   📷 Face  {trait}: {score:.3f}")

        if trait_scores:
            total_w      = sum(trait_weights)
            norm_weights = [w / total_w for w in trait_weights]
            weighted_avg = sum(s * w for s, w in zip(trait_scores, norm_weights))
            fused_results[trait] = round(weighted_avg, 3)
        else:
            fused_results[trait] = 0.5

    fused_results['modality_scores'] = {
        'text':  text_result  if text_result  else None,
        'voice': voice_result if voice_result else None,
        'face':  face_result  if face_result  else None,
    }

    modalities_available             = sum([bool(text_result), bool(voice_result), bool(face_result)])
    fused_results['confidence']      = min(modalities_available / 3.0, 1.0)
    fused_results['modalities_used'] = modalities_available
    fused_results['fusion_method']   = 'adaptive_weighted_average'
    fused_results['weights_used']    = weights

    print(f"✅ Fusion complete — modalities: {modalities_available}, confidence: {fused_results['confidence']:.2f}")
    return fused_results


def average_face_expressions(face_results: Dict[str, Any]) -> Dict[str, Any]:
    if not face_results:
        return {}

    big_five_traits  = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
    averaged_results = {}

    for trait in big_five_traits:
        values = []
        for expr_name, expr_result in face_results.items():
            if isinstance(expr_result, dict) and trait in expr_result:
                val = expr_result[trait]
                if isinstance(val, (int, float)):
                    values.append(val)

        averaged_results[trait] = round(float(np.mean(values)), 3) if values else 0.5

    # Dominant emotion
    best_emotion    = None
    best_confidence = 0.0
    best_expression = None

    for expr_name, expr_result in face_results.items():
        if isinstance(expr_result, dict):
            emotion    = expr_result.get('dominant_emotion')
            confidence = expr_result.get('emotion_confidence', 0)
            if confidence > best_confidence:
                best_confidence = confidence
                best_emotion    = emotion
                best_expression = expr_name

    if best_emotion:
        averaged_results['dominant_emotion']    = best_emotion
        averaged_results['emotion_confidence']  = round(best_confidence, 3)
        averaged_results['dominant_expression'] = best_expression

    averaged_results['expressions_analyzed'] = list(face_results.keys())
    averaged_results['total_expressions']    = len(face_results)

    print(f"✅ Face expressions averaged: {averaged_results}")
    return averaged_results