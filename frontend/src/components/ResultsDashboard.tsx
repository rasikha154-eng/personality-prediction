import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Share,
  RotateCcw,
  Heart,
  Brain,
  Zap,
  Users,
  Target,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";

const ResultsDashboard = () => {
  const { toast } = useToast();

  const handleFeedback = async (isAccurate: boolean) => {
    try {
      const response = await fetch("http://localhost:8000/api/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: isAccurate ? "accurate" : "inaccurate",
          modality: "fusion",
          results:  fusionResults ?? {},
        }),
      });
      const data = await response.json();
      toast({
        title: isAccurate ? "✅ Shukriya!" : "📝 Feedback mila!",
        description: `Total accuracy: ${data.accuracy_rate}% (${data.total_feedback} responses)`,
      });
    } catch {
      toast({ title: "❌ Feedback Failed", variant: "destructive" });
    }
  };

  const [facialResults, setFacialResults] = useState<Record<string, any> | null>(null);
  const [textResults, setTextResults] = useState<any>(null);
  const [textInput, setTextInput] = useState<string>("");
  const [voiceResults, setVoiceResults] = useState<any>(null);
  const [fusionResults, setFusionResults] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");
  const [userAge, setUserAge] = useState<string>("");

  // Dynamic personality type based on fusion results
  const getPersonalityType = () => {
    if (!fusionResults)
      return {
        type: "ENFP",
        name: "The Campaigner",
        description:
          "Enthusiastic, creative and sociable free spirits, who can always find a reason to smile.",
      };

    // Simple MBTI-like classification based on Big Five
    const traits = fusionResults;
    const isExtraverted = traits.extraversion > 0.5;
    const isOpenToExperience = traits.openness > 0.5;
    const isAgreeable = traits.agreeableness > 0.5;
    const isConscientious = traits.conscientiousness > 0.5;
    const isEmotionallyStable = traits.neuroticism < 0.5;

    // Determine dominant characteristics
    if (isExtraverted && isOpenToExperience && isAgreeable) {
      return {
        type: "ENFP",
        name: "The Campaigner",
        description:
          "Enthusiastic, creative and sociable free spirits, who can always find a reason to smile.",
      };
    } else if (isConscientious && isEmotionallyStable && !isExtraverted) {
      return {
        type: "ISTJ",
        name: "The Logistician",
        description:
          "Practical and fact-minded, reliable and responsible individuals.",
      };
    } else if (isOpenToExperience && !isAgreeable && isExtraverted) {
      return {
        type: "ENTP",
        name: "The Debater",
        description:
          "Smart and curious thinkers who cannot resist an intellectual challenge.",
      };
    } else if (isAgreeable && isConscientious && isEmotionallyStable) {
      return {
        type: "ISFJ",
        name: "The Protector",
        description:
          "Warm-hearted and dedicated, always ready to protect loved ones.",
      };
    } else {
      return {
        type: "DYNAMIC",
        name: "The Unique Individual",
        description:
          "A complex personality with a distinctive blend of traits that makes you uniquely you.",
      };
    }
  };

  // Dynamic traits based on fusion results
  const getKeyTraits = () => {
    if (!fusionResults)
      return [
        { icon: Heart, trait: "Empathetic", color: "text-pink-400" },
        { icon: Brain, trait: "Creative", color: "text-purple-400" },
        { icon: Zap, trait: "Energetic", color: "text-yellow-400" },
        { icon: Users, trait: "Social", color: "text-blue-400" },
        { icon: Target, trait: "Goal-Oriented", color: "text-green-400" },
      ];

    const traits = [];

    if (fusionResults.agreeableness > 0.6) {
      traits.push({ icon: Heart, trait: "Empathetic", color: "text-pink-400" });
    }
    if (fusionResults.openness > 0.6) {
      traits.push({ icon: Brain, trait: "Creative", color: "text-purple-400" });
    }
    if (fusionResults.extraversion > 0.6) {
      traits.push({ icon: Zap, trait: "Energetic", color: "text-yellow-400" });
      traits.push({ icon: Users, trait: "Social", color: "text-blue-400" });
    }
    if (fusionResults.conscientiousness > 0.6) {
      traits.push({
        icon: Target,
        trait: "Goal-Oriented",
        color: "text-green-400",
      });
    }
    if (fusionResults.neuroticism < 0.4) {
      traits.push({
        icon: CheckCircle,
        trait: "Emotionally Stable",
        color: "text-green-400",
      });
    }

    // Ensure we have at least 3 traits
    if (traits.length < 3) {
      const defaultTraits = [
        { icon: Heart, trait: "Thoughtful", color: "text-pink-400" },
        { icon: Brain, trait: "Analytical", color: "text-purple-400" },
        { icon: Users, trait: "Collaborative", color: "text-blue-400" },
      ];
      traits.push(...defaultTraits.slice(0, 3 - traits.length));
    }

    return traits.slice(0, 5); // Limit to 5 traits
  };

  // Dynamic confidence scores
  const getModalityScores = () => {
    const defaultScores = [
      {
        name: "Text Analysis",
        confidence: 92,
        insights: "Strong emotional intelligence detected",
      },
      {
        name: "Voice Analysis",
        confidence: 88,
        insights: "Enthusiastic and warm tone patterns",
      },
      {
        name: "Facial Analysis",
        confidence: 85,
        insights: "Genuine expressions and high empathy markers",
      },
    ];

    if (!fusionResults?.modality_scores) return defaultScores;

    const scores = [];

    if (fusionResults.modality_scores.text) {
      scores.push({
        name: "Text Analysis",
        confidence: Math.round(85 + Math.random() * 10), // Simulate confidence
        insights: "Personality traits detected from written expression",
      });
    }

    if (fusionResults.modality_scores.voice) {
      scores.push({
        name: "Voice Analysis",
        confidence: Math.round(80 + Math.random() * 15),
        insights: "Emotional patterns detected from vocal characteristics",
      });
    }

    if (fusionResults.modality_scores.face) {
      scores.push({
        name: "Facial Analysis",
        confidence: Math.round(75 + Math.random() * 20),
        insights: "Personality indicators from facial expressions",
      });
    }

    return scores.length > 0 ? scores : defaultScores;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tv_facial_results");
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log("Loading facial results from localStorage:", parsed);
        setFacialResults(parsed);
      } else {
        console.log("No facial results found in localStorage");
      }

      const textAnalysis = localStorage.getItem("tv_text_analysis");
      console.log("tv_text_analysis from localStorage:", textAnalysis);
      if (textAnalysis) {
        const parsed = JSON.parse(textAnalysis);
        console.log("Loading text analysis from localStorage:", parsed);
        setTextResults(parsed);
      } else {
        // Also check for tv_text as an alternative
        const textAlt = localStorage.getItem("tv_text");
        console.log("tv_text from localStorage:", textAlt);
        if (textAlt) {
          const parsed = JSON.parse(textAlt);
          console.log("Loading text from tv_text:", parsed);
          setTextResults(parsed);
        } else {
          console.log("No text analysis found in localStorage");
        }
      }

      const textInputRaw = localStorage.getItem("tv_text_analysis");
       if (textInputRaw) {
  const parsed = JSON.parse(textInputRaw);
  setTextInput(JSON.stringify(parsed));
  console.log("Text input loaded:", textInputRaw);
}else {
        console.log("No text input found in localStorage");
      }

      const voiceAnalysis = localStorage.getItem("tv_voice_analysis");
      if (voiceAnalysis) {
        const parsed = JSON.parse(voiceAnalysis);
        console.log("Loading voice analysis from localStorage:", parsed);
        setVoiceResults(parsed);
      } else {
        console.log("No voice analysis found in localStorage");
      }

      // Load fusion results - this is the final combined result
      const fusionAnalysis = localStorage.getItem("tv_fusion_results");
      if (fusionAnalysis) {
        const parsed = JSON.parse(fusionAnalysis);
        console.log("Loading FUSION results from localStorage:", parsed);
        setFusionResults(parsed);
      } else {
        console.log("No fusion results found in localStorage");
      }

      // Load user information
      const storedUserName = localStorage.getItem("tv_user_name");
      if (storedUserName) {
        setUserName(storedUserName);
        console.log("User name loaded:", storedUserName);
      }

      const storedUserAge = localStorage.getItem("tv_user_age");
      if (storedUserAge) {
        setUserAge(storedUserAge);
        console.log("User age loaded:", storedUserAge);
      }
    } catch (e) {
      console.error("Error loading results from localStorage:", e);
    }
  }, []);

  // Use dynamic data instead of hardcoded values
  const personalityType = getPersonalityType();
  const keyTraits = getKeyTraits();
  const modalityScores = getModalityScores();

  // Dynamic Big Five traits from fusion results
  const getBigFiveTraits = () => {
    if (!fusionResults)
      return [
        { name: "Openness", score: 85, description: "Creative & Open-minded" },
        {
          name: "Conscientiousness",
          score: 72,
          description: "Organized & Reliable",
        },
        { name: "Extraversion", score: 78, description: "Social & Energetic" },
        {
          name: "Agreeableness",
          score: 90,
          description: "Compassionate & Trusting",
        },
        { name: "Neuroticism", score: 35, description: "Emotionally Stable" },
      ];

    return [
      {
        name: "Openness",
        score: Math.round((fusionResults.openness || 0.5) * 100),
        description:
          fusionResults.openness > 0.6
            ? "Creative & Open-minded"
            : fusionResults.openness < 0.4
            ? "Practical & Traditional"
            : "Balanced & Adaptable",
      },
      {
        name: "Conscientiousness",
        score: Math.round((fusionResults.conscientiousness || 0.5) * 100),
        description:
          fusionResults.conscientiousness > 0.6
            ? "Organized & Reliable"
            : fusionResults.conscientiousness < 0.4
            ? "Flexible & Spontaneous"
            : "Moderately Organized",
      },
      {
        name: "Extraversion",
        score: Math.round((fusionResults.extraversion || 0.5) * 100),
        description:
          fusionResults.extraversion > 0.6
            ? "Social & Energetic"
            : fusionResults.extraversion < 0.4
            ? "Reflective & Reserved"
            : "Ambivert",
      },
      {
        name: "Agreeableness",
        score: Math.round((fusionResults.agreeableness || 0.5) * 100),
        description:
          fusionResults.agreeableness > 0.6
            ? "Compassionate & Trusting"
            : fusionResults.agreeableness < 0.4
            ? "Competitive & Skeptical"
            : "Balanced & Fair",
      },
      {
        name: "Neuroticism",
        score: Math.round((fusionResults.neuroticism || 0.5) * 100),
        description:
          fusionResults.neuroticism > 0.6
            ? "Emotionally Sensitive"
            : fusionResults.neuroticism < 0.4
            ? "Emotionally Stable"
            : "Moderately Stable",
      },
    ];
  };

  const bigFiveTraits = getBigFiveTraits();

  const handleDownloadPDF = () => {
    toast({
      title: "Generating PDF Report",
      description: "Please wait while your report is being created...",
    });

    try {
      // Create PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246); // Blue color
      doc.text("AI Personality Analysis Report", pageWidth / 2, 25, { align: "center" });
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, { align: "center" });
      
      // Personality Type Section
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text("Your Personality Type", 20, 50);
      
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text(`${personalityType.type} - ${personalityType.name}`, 20, 60);
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      const descLines = doc.splitTextToSize(personalityType.description, 170);
      doc.text(descLines, 20, 70);
      
      let yPos = 70 + (descLines.length * 5) + 15;
      
      // Big Five Traits Section
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text("Big Five Personality Traits", 20, yPos);
      yPos += 15;
      
      // Draw trait bars
      bigFiveTraits.forEach((trait, index) => {
        const traitName = trait.name.charAt(0).toUpperCase() + trait.name.slice(1);
        const score = trait.score;
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(traitName, 20, yPos);
        
        // Draw progress bar background
        doc.setFillColor(230, 230, 230);
        doc.rect(60, yPos - 5, 100, 8, "F");
        
        // Draw progress bar
        doc.setFillColor(59, 130, 246);
        doc.rect(60, yPos - 5, score, 8, "F");
        
        // Draw score text
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(`${score}%`, 165, yPos);
        
        yPos += 15;
      });
      
      yPos += 10;
      
      // Modality Results Section
      if (fusionResults || facialResults || textResults || voiceResults) {
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Detailed Analysis Results", 20, yPos);
        yPos += 15;
        
        // Helper function to format percentage values
        const formatPercentage = (value: any): string => {
          if (typeof value === 'number') {
            return String(Math.round(value));
          }
          return String(value);
        };
        
        // Text Results
        if (textResults && Object.keys(textResults).length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(59, 130, 246);
          doc.text("Text Analysis", 20, yPos);
          yPos += 8;
          
          doc.setFontSize(9);
          doc.setTextColor(60);
          const textTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
          textTraits.forEach(trait => {
            if (textResults[trait] !== undefined) {
              doc.text(`${trait}: ${formatPercentage(textResults[trait])}%`, 25, yPos);
              yPos += 6;
            }
          });
          yPos += 5;
        }
        
        // Voice Results
        if (voiceResults && Object.keys(voiceResults).length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(59, 130, 246);
          doc.text("Voice Analysis", 20, yPos);
          yPos += 8;
          
          doc.setFontSize(9);
          doc.setTextColor(60);
          const voiceTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
          voiceTraits.forEach(trait => {
            if (voiceResults[trait] !== undefined) {
              doc.text(`${trait}: ${formatPercentage(voiceResults[trait])}%`, 25, yPos);
              yPos += 6;
            }
          });
          yPos += 5;
        }
        
        // Face Results
        if (facialResults && Object.keys(facialResults).length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(59, 130, 246);
          doc.text("Facial Analysis", 20, yPos);
          yPos += 8;
          
          doc.setFontSize(9);
          doc.setTextColor(60);
          const faceTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
          faceTraits.forEach(trait => {
            if (facialResults[trait] !== undefined) {
              doc.text(`${trait}: ${formatPercentage(facialResults[trait])}%`, 25, yPos);
              yPos += 6;
            }
          });
          yPos += 5;
        }
        
        // Fusion Results
        if (fusionResults && Object.keys(fusionResults).length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(59, 130, 246);
          doc.text("Multimodal Fusion", 20, yPos);
          yPos += 8;
          
          doc.setFontSize(9);
          doc.setTextColor(60);
          const fusionTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
          fusionTraits.forEach(trait => {
            if (fusionResults[trait] !== undefined) {
              doc.text(`${trait}: ${formatPercentage(fusionResults[trait])}%`, 25, yPos);
              yPos += 6;
            }
          });
        }
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Generated by AI Personality Predictor", pageWidth / 2, 285, { align: "center" });
      
      // Save the PDF
      doc.save("personality-analysis-report.pdf");
      
      toast({
        title: "✅ Download Complete",
        description: "Your PDF report has been downloaded.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "❌ Download Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    const shareData = {
      title: "My AI Personality Analysis",
      text: `I just discovered I'm an ${personalityType.type} - ${personalityType.name}! Check out AI Personality Predictor to discover your personality type.`,
      url: window.location.origin,
    };

    if (navigator.share) {
      navigator
        .share(shareData)
        .then(() => {
          toast({
            title: "Shared Successfully",
            description: "Your results have been shared!",
          });
        })
        .catch(() => {
          fallbackShare();
        });
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    const text = `I just discovered I'm an ${personalityType.type} - ${personalityType.name}! Check out AI Personality Predictor: ${window.location.origin}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: "Link Copied",
          description: "Share link has been copied to your clipboard!",
        });
      });
    } else {
      toast({
        title: "Share Options",
        description: "Copy this link to share: " + window.location.origin,
      });
    }
  };

  const handleRetakeTest = () => {
    // Clear all stored results
    try {
      localStorage.removeItem("tv_facial_results");
      localStorage.removeItem("tv_voice_analysis");
      localStorage.removeItem("tv_text_analysis");
      localStorage.removeItem("tv_text");
      localStorage.removeItem("tv_text_results");
      localStorage.removeItem("tv_fusion_results");
      localStorage.removeItem("tv_user_name");
      localStorage.removeItem("tv_user_age");
      console.log("Cleared all stored results");
    } catch (e) {
      console.error("Error clearing results:", e);
    }

    toast({
      title: "Restarting Test",
      description: "Taking you back to the beginning...",
    });

    setTimeout(() => {
      window.location.href = "/test";
    }, 1000);
  };

  return (
    <section id="results" className="min-h-screen py-20 px-4 pt-20">
      <div className="container mx-auto max-w-6xl">
        {/* 🎯 FUSION RESULTS - FINAL MULTIMODAL PERSONALITY PREDICTION */}
        {fusionResults && (
          <div className="mb-8">
            <div className="text-center mb-8">
              {/* User Information Display */}
              {(userName || userAge) && (
                <div className="mb-6">
                  <Card className="bg-secondary/20 border border-accent/30 p-4 max-w-md mx-auto">
                    <div className="flex items-center justify-center space-x-4">
                      {userName && (
                        <div className="text-center">
                          <span className="text-sm text-gray-400">Name</span>
                          <p className="text-lg font-semibold text-white">
                            {userName}
                          </p>
                        </div>
                      )}
                      {userName && userAge && (
                        <div className="h-8 w-px bg-border"></div>
                      )}
                      {userAge && (
                        <div className="text-center">
                          <span className="text-sm text-gray-400">Age</span>
                          <p className="text-lg font-semibold text-white">
                            {userAge}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                AI Personality Analysis
              </h1>
            </div>

            {/* Personality Type */}
            <div className="text-center mb-8">
              <Badge className="bg-accent text-[#1B1F3B] text-lg px-4 py-2 mb-4">
                Your Personality Type
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {personalityType.type}
              </h2>
              <h3 className="text-2xl md:text-3xl text-accent mb-6 font-lora">
                {personalityType.name}
              </h3>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto font-lora">
                {personalityType.description}
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left Side - Personality Profile */}
              <div className="lg:col-span-4">
                <h3 className="text-2xl font-bold text-white mb-6">
                  🧠 Your Final Personality Profile
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      key: "openness",
                      name: "Openness",
                      icon: "🌟",
                      desc: "Creative & Open-minded",
                    },
                    {
                      key: "conscientiousness",
                      name: "Conscientiousness",
                      icon: "🎯",
                      desc: "Organized & Reliable",
                    },
                    {
                      key: "extraversion",
                      name: "Extraversion",
                      icon: "🗣️",
                      desc: "Social & Energetic",
                    },
                    {
                      key: "agreeableness",
                      name: "Agreeableness",
                      icon: "🤝",
                      desc: "Compassionate & Trusting",
                    },
                    {
                      key: "neuroticism",
                      name: "Neuroticism",
                      icon: "😌",
                      desc: "Emotional Stability",
                    },
                  ].map((trait) => {
                    const score = fusionResults[trait.key] || 0;
                    return (
                      <div
                        key={trait.key}
                        className="bg-secondary/30 border border-border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{trait.icon}</span>
                            <span className="text-white font-semibold">
                              {trait.name}
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-accent">
                            {(score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={score * 100} className="h-2 mb-2" />
                        <div className="text-xs text-gray-400">
                          {trait.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Middle - Personality Summary */}
              <div className="lg:col-span-5">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex-1 min-w-0">
                    Personality Summary
                  </h3>
                  <Button
                    onClick={handleDownloadPDF}
                    size="sm"
                    className="bg-accent text-[#1B1F3B] hover:bg-accent/90 text-sm px-3 py-2 rounded-md flex items-center space-x-2 ml-3"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF</span>
                  </Button>
                </div>
                <div className="prose prose-invert max-w-none font-lora">
                  <p className="text-gray-300 text-lg leading-relaxed mb-6">
                    Your personality profile reveals a{" "}
                    <strong className="text-accent">
                      {fusionResults.agreeableness > 0.55 &&
                      fusionResults.extraversion > 0.55
                        ? "vibrant and empathetic individual"
                        : fusionResults.conscientiousness > 0.55 &&
                          fusionResults.neuroticism < 0.45
                        ? "reliable and organized individual"
                        : fusionResults.openness > 0.55 &&
                          fusionResults.extraversion > 0.5
                        ? "creative and enthusiastic individual"
                        : fusionResults.agreeableness > 0.55 &&
                          fusionResults.conscientiousness > 0.5
                        ? "caring and dependable individual"
                        : fusionResults.conscientiousness > 0.5 &&
                          fusionResults.agreeableness > 0.5
                        ? "balanced and thoughtful individual"
                        : "unique and complex individual"}
                    </strong>
                    {fusionResults.extraversion > 0.55
                      ? " who thrives in social environments"
                      : " who values meaningful connections"}{" "}
                    and approaches life with{" "}
                    {fusionResults.openness > 0.5
                      ? "creativity and curiosity"
                      : fusionResults.conscientiousness > 0.55
                      ? "purpose and dedication"
                      : "thoughtfulness and balance"}
                    .{" "}
                    {fusionResults.agreeableness > 0.55
                      ? "You demonstrate strong emotional intelligence and have a natural ability to connect with others."
                      : fusionResults.neuroticism < 0.45
                      ? "You show remarkable emotional stability and resilience."
                      : fusionResults.conscientiousness > 0.55
                      ? "You approach tasks with dedication and attention to detail."
                      : "You bring a thoughtful perspective to your interactions."}
                  </p>
                  <p className="text-gray-300 text-lg leading-relaxed mb-6">
                    Your{" "}
                    {fusionResults.openness > 0.55
                      ? "elevated"
                      : fusionResults.openness < 0.4
                      ? "practical"
                      : "balanced"}{" "}
                    openness score indicates a{" "}
                    <strong className="text-accent">
                      {fusionResults.openness > 0.55
                        ? "curious and imaginative mind"
                        : fusionResults.openness < 0.4
                        ? "practical and grounded approach"
                        : "balanced perspective on new experiences"}
                    </strong>
                    {fusionResults.openness > 0.5
                      ? " that enjoys exploring new ideas and experiences"
                      : " that values both innovation and tradition"}
                    . Combined with your{" "}
                    {fusionResults.agreeableness > 0.55
                      ? "strong agreeableness"
                      : "balanced interpersonal style"}
                    , you likely{" "}
                    {fusionResults.agreeableness > 0.55
                      ? "excel in collaborative environments and are valued for your supportive nature"
                      : "bring a fair and balanced approach to team dynamics"}
                    .
                  </p>
                </div>
              </div>

              {/* Right Side - Key Traits */}
              <div className="lg:col-span-3">
                <h3 className="text-2xl font-bold text-white mb-6">
                  Key Traits
                </h3>
                <div className="space-y-4">
                  {keyTraits.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 bg-secondary/20 border border-border rounded-lg p-4"
                    >
                      <item.icon className={`h-8 w-8 ${item.color}`} />
                      <span className="text-white font-medium text-lg">
                        {item.trait}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
{fusionResults && (
  <div className="text-center mb-8">
    <p className="text-gray-300 mb-4 text-lg">Was this analysis accurate?</p>
    <div className="flex gap-4 justify-center">
      <Button
        onClick={() => handleFeedback(true)}
        className="bg-green-500 hover:bg-green-600 text-white px-8"
      >
        👍 Yes, Accurate
      </Button>
      <Button
        onClick={() => handleFeedback(false)}
        variant="outline"
        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white px-8"
      >
        👎 Not Accurate
      </Button>
    </div>
  </div>
)}
        {/* Action Buttons - Centered horizontally above footer */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12 mb-8">
          <Button
            onClick={handleShare}
            variant="outline"
            className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B] min-w-48"
          >
            <Share className="h-4 w-4 mr-2" />
            Share Results
          </Button>
          <Button
            onClick={handleRetakeTest}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 min-w-48"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Test
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ResultsDashboard;
