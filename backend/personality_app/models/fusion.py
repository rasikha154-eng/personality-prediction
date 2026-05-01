from typing import Dict, Any
import numpy as np


def fuse_all(text_result: Dict[str, Any], voice_result: Dict[str, Any], face_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fuse results from all three modalities (text, voice, face) using weighted averaging.
    
    Args:
        text_result: Text analysis results
        voice_result: Voice analysis results  
        face_result: Facial analysis results (averaged across all expressions)
    
    Returns:
        Fused personality traits with confidence scores
    """
    
    print("🔬 FUSION DEBUG: Starting multimodal fusion...")
    print(f"   Text result: {text_result}")
    print(f"   Voice result: {voice_result}")
    print(f"   Face result: {face_result}")
    
    # Define Big Five traits
    big_five_traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
    
    # Define weights for each modality (can be adjusted based on reliability)
    weights = {
        'text': 0.3,      # Text analysis - 30%
        'voice': 0.2,     # Voice analysis - 20% 
        'face': 0.5       # Face analysis - 50% (most weighted)
    }
    
    print(f"🎯 Using fusion weights: {weights}")
    
    fused_results = {}
    
    # Process each Big Five trait
    for trait in big_five_traits:
        trait_scores = []
        trait_weights = []
        modality_contributions = {}
        
        print(f"\n🧩 Processing trait: {trait}")
        
        # Collect scores from each modality
        if text_result and trait in text_result and isinstance(text_result[trait], (int, float)):
            # Convert percentage to 0-1 scale if needed
            score = text_result[trait] / 100.0 if text_result[trait] > 1 else text_result[trait]
            trait_scores.append(score)
            trait_weights.append(weights['text'])
            modality_contributions['text'] = score
            print(f"   📝 Text {trait}: {score:.3f} (weight: {weights['text']})")
            
        if voice_result and trait in voice_result and isinstance(voice_result[trait], (int, float)):
            # Voice results are in 0-100 scale (percentage)
            score = voice_result[trait] / 100.0 if voice_result[trait] > 1 else voice_result[trait]
            trait_scores.append(score)
            trait_weights.append(weights['voice'])
            modality_contributions['voice'] = score
            print(f"   🎙️ Voice {trait}: {score:.3f} (weight: {weights['voice']})")
            
        if face_result and trait in face_result and isinstance(face_result[trait], (int, float)):
            # Face results are in 0-100 scale (percentage)
            score = face_result[trait] / 100.0 if face_result[trait] > 1 else face_result[trait]
            trait_scores.append(score)
            trait_weights.append(weights['face'])
            modality_contributions['face'] = score
            print(f"   📷 Face {trait}: {score:.3f} (weight: {weights['face']})")
        
        # Calculate weighted average if we have scores
        if trait_scores:
            # Normalize weights
            total_weight = sum(trait_weights)
            normalized_weights = [w / total_weight for w in trait_weights]
            
            # Calculate weighted average
            weighted_avg = sum(score * weight for score, weight in zip(trait_scores, normalized_weights))
            fused_results[trait] = round(weighted_avg, 3)
            
            print(f"   ⚖️ {trait} fusion:")
            print(f"      Scores: {trait_scores}")
            print(f"      Weights: {normalized_weights}")
            print(f"      Final: {weighted_avg:.3f}")
        else:
            fused_results[trait] = 0.5  # Default neutral value
            print(f"   ⚠️ No data for {trait}, using default: 0.5")
    
    # Add modality-specific information
    fused_results['modality_scores'] = {
        'text': text_result if text_result else None,
        'voice': voice_result if voice_result else None,
        'face': face_result if face_result else None
    }
    
    # Calculate overall confidence
    modalities_available = sum([
        1 if text_result else 0,
        1 if voice_result else 0,
        1 if face_result else 0
    ])
    
    fused_results['confidence'] = min(modalities_available / 3.0, 1.0)
    fused_results['modalities_used'] = modalities_available
    
    # Add fusion method info
    fused_results['fusion_method'] = 'weighted_average'
    fused_results['weights_used'] = weights
    
    print(f"\n🎯 FUSION COMPLETE!")
    print(f"   Final fused results: {fused_results}")
    print(f"   Modalities used: {modalities_available}")
    print(f"   Overall confidence: {fused_results['confidence']:.3f}")
    
    return fused_results


def average_face_expressions(face_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Average personality traits across all facial expressions.
    
    Args:
        face_results: Dictionary with expression names as keys and results as values
    
    Returns:
        Averaged personality traits
    """
    print(f"📊 AVERAGING FACE EXPRESSIONS:")
    print(f"   Input face_results: {face_results}")
    
    if not face_results:
        print("   ❌ No face results to average")
        return {}
    
    big_five_traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
    averaged_results = {}
    
    # Average each trait across all expressions
    for trait in big_five_traits:
        trait_values = []
        
        print(f"   🧩 Processing trait: {trait}")
        for expression_name, expression_result in face_results.items():
            if isinstance(expression_result, dict) and trait in expression_result:
                value = expression_result[trait]
                if isinstance(value, (int, float)):
                    trait_values.append(value)
                    print(f"      {expression_name}: {value}")
                else:
                    print(f"      {expression_name}: invalid value type {type(value)}")
            else:
                print(f"      {expression_name}: missing {trait} or not dict")
        
        if trait_values:
            averaged_value = round(np.mean(trait_values), 3)
            averaged_results[trait] = averaged_value
            print(f"   ✅ {trait}: averaged {trait_values} → {averaged_value}")
        else:
            averaged_results[trait] = 0.5
            print(f"   ⚠️ {trait}: no values found, using default 0.5")
    
    # Find the expression with highest emotion confidence for dominant emotion
    best_emotion = None
    best_confidence = 0.0
    best_expression = None
    
    print(f"   🎯 Finding dominant emotion across expressions:")
    for expression_name, expression_result in face_results.items():
        if isinstance(expression_result, dict):
            emotion = expression_result.get('dominant_emotion')
            confidence = expression_result.get('emotion_confidence', 0)
            
            print(f"      {expression_name}: {emotion} ({confidence:.3f})")
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_emotion = emotion
                best_expression = expression_name
    
    # Add dominant emotion info if found
    if best_emotion:
        averaged_results['dominant_emotion'] = best_emotion
        averaged_results['emotion_confidence'] = round(best_confidence, 3)
        averaged_results['dominant_expression'] = best_expression
        print(f"   👑 Dominant emotion: {best_emotion} ({best_confidence:.3f}) from {best_expression}")
    else:
        print(f"   ⚠️ No dominant emotion found in expressions")
    
    # Add expression summary
    averaged_results['expressions_analyzed'] = list(face_results.keys())
    averaged_results['total_expressions'] = len(face_results)
    
    print(f"   🎯 Final averaged results: {averaged_results}")
    return averaged_results
