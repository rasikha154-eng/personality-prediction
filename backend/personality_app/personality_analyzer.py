import re
import numpy as np
from typing import Dict, List, Any


class PersonalityAnalyzer:
    """
    AI-powered personality analysis engine — Django models ke baghair
    Text analysis karke Big Five personality traits nikalta hai
    """

    def __init__(self):
        self.traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']

        self.trait_keywords = {
            'openness': {
                'positive': ['creative', 'imaginative', 'curious', 'adventurous', 'artistic', 'innovative',
                             'original', 'intellectual', 'abstract', 'philosophical', 'complex', 'variety',
                             'explore', 'discover', 'learn', 'wonder', 'dream', 'ideas', 'new', 'different'],
                'negative': ['conventional', 'traditional', 'practical', 'routine', 'simple', 'concrete',
                             'familiar', 'safe', 'stable', 'predictable']
            },
            'conscientiousness': {
                'positive': ['organized', 'responsible', 'reliable', 'disciplined', 'careful', 'thorough',
                             'punctual', 'persistent', 'achievement', 'goal', 'plan', 'systematic',
                             'focused', 'dedicated', 'hardworking', 'efficient', 'productive', 'detail'],
                'negative': ['disorganized', 'careless', 'unreliable', 'spontaneous', 'flexible', 'casual',
                             'lazy', 'messy', 'forgetful', 'impulsive']
            },
            'extraversion': {
                'positive': ['outgoing', 'social', 'talkative', 'energetic', 'assertive', 'enthusiastic',
                             'friendly', 'party', 'people', 'team', 'group', 'leadership', 'confident',
                             'exciting', 'fun', 'adventure', 'bold', 'active'],
                'negative': ['quiet', 'reserved', 'solitary', 'withdrawn', 'shy', 'introspective',
                             'alone', 'private', 'independent', 'calm']
            },
            'agreeableness': {
                'positive': ['cooperative', 'trusting', 'helpful', 'compassionate', 'kind', 'empathetic',
                             'supportive', 'understanding', 'generous', 'forgiving', 'harmonious',
                             'caring', 'warm', 'gentle', 'considerate', 'patient'],
                'negative': ['competitive', 'suspicious', 'critical', 'argumentative', 'selfish',
                             'stubborn', 'harsh', 'cold', 'aggressive']
            },
            'neuroticism': {
                'positive': ['anxious', 'worried', 'stressed', 'emotional', 'moody', 'nervous',
                             'insecure', 'sensitive', 'volatile', 'unstable', 'pressure', 'fear',
                             'doubt', 'overwhelmed', 'tense', 'upset'],
                'negative': ['calm', 'stable', 'relaxed', 'confident', 'secure', 'resilient',
                             'peaceful', 'composed', 'balanced', 'steady']
            }
        }

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Text analyze karo aur Big Five scores return karo
        Yeh main function hai jo views.py call karta hai
        """
        if not text or not text.strip():
            return {trait: 50 for trait in self.traits}

        trait_scores, confidence_scores = self._analyze_text(text)

        # 0-100 range mein clamp karo
        result = {}
        for trait in self.traits:
            result[trait] = round(max(0, min(100, trait_scores[trait])), 1)

        result['confidence_scores'] = {
            trait: round(confidence_scores[trait], 1)
            for trait in self.traits
        }

        print(f"✅ Text analysis complete: {result}")
        return result

    def _analyze_text(self, text: str):
        """Internal text analysis"""
        text_lower = text.lower()
        words      = re.findall(r'\b\w+\b', text_lower)
        word_count = len(words)

        trait_scores      = {}
        confidence_scores = {}

        for trait in self.traits:
            pos_matches = sum(1 for w in words if w in self.trait_keywords[trait]['positive'])
            neg_matches = sum(1 for w in words if w in self.trait_keywords[trait]['negative'])
            total       = pos_matches + neg_matches

            if total > 0:
                # Score: 50 base + adjustment based on pos/neg ratio
                score      = 50 + ((pos_matches - neg_matches) / total) * 30
                confidence = min(total * 8, 85)
            else:
                score      = 50
                confidence = 20

            # Word count bonus — zyada text = zyada confident
            if word_count > 100:
                confidence = min(confidence + 10, 90)

            trait_scores[trait]      = score
            confidence_scores[trait] = confidence

        return trait_scores, confidence_scores

    def get_personality_insights(self, trait_scores: Dict[str, float]) -> Dict[str, Any]:
        """Human-readable insights generate karo"""
        return {
            'summary':          self._generate_summary(trait_scores),
            'strengths':        self._identify_strengths(trait_scores),
            'areas_for_growth': self._identify_growth_areas(trait_scores),
            'career_suggestions': self._suggest_careers(trait_scores),
            'relationship_style': self._describe_relationship_style(trait_scores),
            'traits': {
                trait: {
                    'score':       round(trait_scores[trait], 1),
                    'level':       self._get_trait_level(trait_scores[trait]),
                    'description': self._get_trait_description(trait, trait_scores[trait])
                }
                for trait in self.traits
            }
        }

    def _generate_summary(self, trait_scores: Dict[str, float]) -> str:
        high_traits = [t for t, s in trait_scores.items() if s >= 65 and t in self.traits]
        descriptions = {
            'openness':          'creative and open to new experiences',
            'conscientiousness': 'organized and reliable',
            'extraversion':      'outgoing and energetic',
            'agreeableness':     'cooperative and trusting',
            'neuroticism':       'emotionally sensitive',
        }
        if high_traits:
            parts = [descriptions[t] for t in high_traits if t in descriptions]
            return f"You appear to be {', '.join(parts)}. This profile suggests unique strengths you bring to relationships and work."
        return "You have a balanced personality profile with strengths across multiple dimensions."

    def _get_trait_level(self, score: float) -> str:
        if score >= 65:   return "High"
        elif score >= 35: return "Moderate"
        else:             return "Low"

    def _get_trait_description(self, trait: str, score: float) -> str:
        descriptions = {
            'openness': {
                'high':     'You enjoy exploring new ideas, are creative, and appreciate art and beauty.',
                'moderate': 'You balance practicality with openness to new experiences.',
                'low':      'You prefer familiar experiences and practical approaches to problems.'
            },
            'conscientiousness': {
                'high':     'You are highly organized, reliable, and goal-oriented.',
                'moderate': 'You balance structure with flexibility in your approach to tasks.',
                'low':      'You tend to be more spontaneous and flexible with rules and schedules.'
            },
            'extraversion': {
                'high':     'You are outgoing, energetic, and enjoy being around people.',
                'moderate': 'You enjoy both social interaction and quiet time alone.',
                'low':      'You prefer quieter environments and smaller groups of people.'
            },
            'agreeableness': {
                'high':     'You are cooperative, trusting, and considerate of others.',
                'moderate': 'You balance cooperation with standing up for your own interests.',
                'low':      'You tend to be more competitive and skeptical of others motives.'
            },
            'neuroticism': {
                'high':     'You tend to experience emotions intensely and may worry frequently.',
                'moderate': 'You experience a normal range of emotions and handle stress reasonably well.',
                'low':      'You tend to be emotionally stable and calm under pressure.'
            }
        }
        level = self._get_trait_level(score).lower()
        return descriptions[trait][level]

    def _identify_strengths(self, trait_scores: Dict[str, float]) -> List[str]:
        strengths = []
        if trait_scores.get('conscientiousness', 0) >= 60:
            strengths.append("Strong organizational and planning skills")
        if trait_scores.get('agreeableness', 0) >= 60:
            strengths.append("Excellent interpersonal and teamwork abilities")
        if trait_scores.get('openness', 0) >= 60:
            strengths.append("Creative problem-solving and adaptability")
        if trait_scores.get('extraversion', 0) >= 60:
            strengths.append("Natural leadership and communication skills")
        if trait_scores.get('neuroticism', 100) <= 40:
            strengths.append("Emotional stability and resilience under pressure")
        return strengths[:3]

    def _identify_growth_areas(self, trait_scores: Dict[str, float]) -> List[str]:
        areas = []
        if trait_scores.get('conscientiousness', 100) <= 40:
            areas.append("Developing better organization and time management")
        if trait_scores.get('agreeableness', 100) <= 40:
            areas.append("Building stronger collaborative relationships")
        if trait_scores.get('openness', 100) <= 40:
            areas.append("Embracing new experiences and perspectives")
        if trait_scores.get('extraversion', 100) <= 40:
            areas.append("Building confidence in social situations")
        if trait_scores.get('neuroticism', 0) >= 70:
            areas.append("Developing stress management techniques")
        return areas[:2]

    def _suggest_careers(self, trait_scores: Dict[str, float]) -> List[str]:
        careers = []
        if trait_scores.get('openness', 0) >= 60:
            careers.extend(["Artist", "Designer", "Researcher", "Writer"])
        if trait_scores.get('conscientiousness', 0) >= 60:
            careers.extend(["Project Manager", "Engineer", "Accountant", "Administrator"])
        if trait_scores.get('extraversion', 0) >= 60:
            careers.extend(["Sales", "Teacher", "Manager", "Consultant"])
        if trait_scores.get('agreeableness', 0) >= 60:
            careers.extend(["Counselor", "HR", "Social Worker", "Healthcare"])
        return list(set(careers))[:4]

    def _describe_relationship_style(self, trait_scores: Dict[str, float]) -> str:
        e = trait_scores.get('extraversion', 50)
        a = trait_scores.get('agreeableness', 50)
        if e >= 60 and a >= 60:
            return "You enjoy meeting new people and building warm, supportive relationships."
        elif e <= 40 and a >= 60:
            return "You prefer deep, meaningful relationships with a smaller circle of close friends."
        elif e >= 60 and a <= 40:
            return "You enjoy social interaction but may be more competitive in your relationships."
        else:
            return "You value independence and prefer relationships that respect your personal space."