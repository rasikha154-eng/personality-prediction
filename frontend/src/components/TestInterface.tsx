import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resultsService } from "@/services/resultsApi";
import { useAuth } from "@/contexts/AuthContext";

const TestInterface = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [textResponse, setTextResponse] = useState("");
  const [currentExpression, setCurrentExpression] = useState<string>("neutral");
  const [expressionComplete, setExpressionComplete] = useState<boolean>(false);
  const [facialResults, setFacialResults] = useState<Record<string, any>>({});
  const [textAnalysisComplete, setTextAnalysisComplete] =
    useState<boolean>(false);
  const [isAnalyzingText, setIsAnalyzingText] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [userAge, setUserAge] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [voiceResults, setVoiceResults] = useState<any>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const progress = (currentStep / 3) * 100;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextResponse(newText);

    // Reset analysis completion if text changes
    if (textAnalysisComplete && newText !== textResponse) {
      setTextAnalysisComplete(false);
      // Clear old analysis results
      localStorage.removeItem("tv_text_analysis");
    }
  };

  const expressions = [
    {
      name: "neutral",
      label: "Neutral face",
      instruction: "Look directly at the camera with a relaxed expression",
    },
    {
      name: "smile",
      label: "Smile",
      instruction: "Show a genuine, natural smile",
    },
    {
      name: "surprised",
      label: "Surprised",
      instruction: "Raise your eyebrows and open your eyes wide",
    },
    {
      name: "sad",
      label: "Sad",
      instruction: "Show a slightly sad or concerned expression",
    },
  ];

  const questions = [
    "How would your friends describe you in three words?",
    "Describe a situation where you felt most proud of yourself.",
    "What are your greatest strengths and one area you'd like to improve?",
  ];

  useEffect(() => {
    // Clear old results when component mounts (starting fresh test)
    try {
      localStorage.removeItem("tv_facial_results");
      localStorage.removeItem("tv_voice_analysis");
      localStorage.removeItem("tv_text_analysis");
      console.log("Cleared old results for fresh test");
    } catch (e) {
      console.error("Error clearing old results:", e);
    }

    // Check if there are existing text analysis results
    const existingTextAnalysis = localStorage.getItem("tv_text_analysis");
    if (existingTextAnalysis) {
      try {
        const parsed = JSON.parse(existingTextAnalysis);
        if (parsed && !parsed.error) {
          setTextAnalysisComplete(true);
          console.log("Found existing text analysis results");
        }
      } catch (e) {
        console.error("Error parsing existing text analysis:", e);
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Debug voice results changes
  useEffect(() => {
    if (voiceResults) {
      console.log("Voice results state updated:", voiceResults);
    }
  }, [voiceResults]);

  const handleNext = () => {
    if (currentStep < 3) {
      // If moving from Step 1, analyze text first if not already done
      if (
        currentStep === 1 &&
        textResponse.trim() &&
        userName.trim() &&
        userAge.trim()
      ) {
        if (!textAnalysisComplete) {
          // Auto-analyze text before proceeding
          analyzeTextResponse()
            .then(() => {
              // Only proceed after analysis is complete
              setCurrentStep(currentStep + 1);
            })
            .catch((error) => {
              console.error("Text analysis failed:", error);
              toast({
                title: "❌ Text Analysis Failed",
                description: "Please try again or check your text input.",
                variant: "destructive",
              });
            });
          return; // Don't proceed until analysis is complete
        }
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const analyzeTextResponse = async () => {
    setIsAnalyzingText(true);
    try {
      const response = await fetch("http://localhost:8000/api/predict/text/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textResponse }),
      });

      const data = await response.json();
      console.log("Text analysis response:", data);

      // Store text analysis results - handle both direct results and nested structure
      if (data && !data.error) {
        try {
          // Store the entire response for better debugging
          localStorage.setItem("tv_text_analysis", JSON.stringify(data));
          console.log("Stored text analysis results:", data);
          setTextAnalysisComplete(true);

          toast({
            title: "✅ Text Analyzed",
            description: "Your text has been processed successfully.",
          });
        } catch (e) {
          console.error("Error storing text results:", e);
          toast({
            title: "⚠️ Storage Warning",
            description: "Results processed but couldn't be saved locally.",
          });
        }
      } else {
        console.error("Text analysis returned error:", data);
        setTextAnalysisComplete(false);
        toast({
          title: "❌ Text Analysis Failed",
          description: data.error || "Could not process your text response.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error analyzing text:", error);
      setTextAnalysisComplete(false);
      toast({
        title: "❌ Text Analysis Failed",
        description: "Could not process your text response.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingText(false);
    }
  };
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.error("Play failed:", e));
    }
  }, [isCameraActive, streamRef.current]);
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Reset states when going back
      if (currentStep === 2) {
        setRecordingComplete(false);
        setRecordingDuration(0);
      }
      if (currentStep === 3) {
        setExpressionComplete(false);
        setCurrentExpression("neutral");
        setFacialResults({});
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    console.log("🚀 Starting Multimodal Fusion Submission...");

    try {
      // Prepare FormData for multimodal submission
      const formData = new FormData();
      let hasValidData = false;

      // Add text data if available
      if (textResponse.trim()) {
        formData.append("text", textResponse);
        localStorage.setItem("tv_text_results", textResponse);

        // Store user information
        if (userName.trim()) {
          localStorage.setItem("tv_user_name", userName.trim());
        }
        if (userAge.trim()) {
          localStorage.setItem("tv_user_age", userAge.trim());
        }

        hasValidData = true;
        console.log("✅ Text data added to submission");
      }

      // Add voice data - prefer existing voice results over re-processing to maintain consistency
      if (voiceResults && Object.keys(voiceResults).length > 0) {
        // Use existing voice analysis results to maintain consistency
        console.log(
          "✅ Using existing voice analysis results for fusion (maintains consistency)"
        );
        console.log("🎙️ Existing voice results:", voiceResults);

        // Send the voice results as JSON data instead of audio file
        formData.append("voice_results", JSON.stringify(voiceResults));
        hasValidData = true;
      } else if (audioBlob) {
        // Only re-process audio if no previous voice analysis exists
        const fileName = "recording.webm"; // Use the recorded audio blob
        formData.append("voice", audioBlob, fileName);
        hasValidData = true;
        console.log(
          "✅ New voice data added to submission (will be processed)"
        );
      } else {
        console.log("⚠️ No voice data available - skipping voice submission");
      }

      // Add face data - prefer existing facial results over new capture to maintain consistency
      if (Object.keys(facialResults).length > 0) {
        // Use existing facial analysis results to maintain consistency with individual tests
        console.log(
          "✅ Using existing facial analysis results for fusion (maintains consistency)"
        );
        console.log("📊 Existing facial results:", facialResults);

        // Send the facial results as JSON data instead of image
        formData.append("facial_results", JSON.stringify(facialResults));
        hasValidData = true;
      } else if (isCameraActive && videoRef.current) {
        // Only capture new image if no previous facial analysis exists
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const faceBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg")
          );

          if (faceBlob) {
            formData.append("face", faceBlob, "face.jpg");
            hasValidData = true;
            console.log("✅ New face image captured and added to submission");
          } else {
            console.log("⚠️ Failed to capture face image from video");
          }
        } else {
          console.log("⚠️ Failed to get canvas context for face capture");
        }
      } else {
        console.log(
          "⚠️ No face data available - camera not active and no previous results"
        );
      }

      if (!hasValidData) {
        toast({
          title: "❌ No Data to Submit",
          description: "Please provide text, record voice, or activate camera.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      console.log("📡 Sending multimodal data to fusion endpoint...");

      // Submit all data to multimodal fusion endpoint
      const response = await fetch(
        "http://localhost:8000/api/predict/multimodal/",
        {
          method: "POST",
          body: formData,
        }
      );

      const fusionResults = await response.json();
      console.log("🔬 Fusion Response:", fusionResults);

      if (fusionResults.error) {
        toast({
          title: "❌ Analysis Failed",
          description: fusionResults.error,
          variant: "destructive",
        });
      } else {
        // Store all results including fusion
        try {
          // Store individual modality results
          if (fusionResults.text) {
            localStorage.setItem(
              "tv_text_analysis",
              JSON.stringify(fusionResults.text)
            );
          }
          if (fusionResults.voice) {
            localStorage.setItem(
              "tv_voice_analysis",
              JSON.stringify(fusionResults.voice)
            );
          }
          if (fusionResults.face) {
            localStorage.setItem(
              "tv_facial_results",
              JSON.stringify(fusionResults.face)
            );
          }

          // Store the important fusion result
          if (fusionResults.fusion) {
            localStorage.setItem(
              "tv_fusion_results",
              JSON.stringify(fusionResults.fusion)
            );
            console.log("🎯 FUSION RESULTS STORED:", fusionResults.fusion);
          }          toast({
            title: "🎯 Multimodal Analysis Complete!",
            description: `Analyzed ${
              fusionResults.fusion?.modalities_used || 0
            } modalities with ${(
              fusionResults.fusion?.confidence * 100
            ).toFixed(0)}% confidence.`,
          });

          // Save results to backend if user is authenticated
          if (isAuthenticated && user) {
            try {
              await resultsService.saveTestResult({
                text_result: fusionResults.text || null,
                voice_result: fusionResults.voice || null,
                face_result: fusionResults.face || null,
                fusion_result: fusionResults.fusion || null,
              });
              console.log("✅ Results saved to backend");
            } catch (error) {
              console.error("Failed to save results to backend:", error);
              toast({
                title: "⚠️ Warning",
                description: "Results analyzed but not saved to server. They're saved locally.",
              });
            }
          }

          setTimeout(() => {
            setIsSubmitting(false);
            window.location.href = "/results";
          }, 2000);
        } catch (e) {
          console.error("Error storing fusion results:", e);
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      console.error("Multimodal submission failed:", error);
      toast({
        title: "❌ Submission Failed",
        description: "Failed to submit data for analysis. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingComplete(false);
      setAudioBlob(null); // Clear previous audio blob
      audioChunksRef.current = []; // Reset ref instead of state

      toast({
        title: "🎙️ Recording Started",
        description: "Please read the prompt aloud clearly.",
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 22050,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        let mimeType = "audio/wav";
        if (!MediaRecorder.isTypeSupported("audio/wav")) {
          mimeType = "audio/webm";
          console.log("WAV not supported, using WebM format");
        }

        const recorder = new MediaRecorder(stream, { mimeType: mimeType });
        setMediaRecorder(recorder);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const recordedAudioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          // Store audio blob for later submission
          setAudioBlob(recordedAudioBlob);

          // Upload to Django backend with correct file extension
          const formData = new FormData();
          const fileName =
            mimeType === "audio/wav" ? "recording.wav" : "recording.webm";
          formData.append("voice", recordedAudioBlob, fileName);

          try {
            const response = await fetch(
              "http://localhost:8000/api/predict/voice/",
              {
                method: "POST",
                body: formData,
              }
            );

            const data = await response.json();
            console.log("Voice Analysis Response:", data); // Check the response

            if (data.error) {
              toast({
                title: "❌ Voice Analysis Failed",
                description: data.error,
                variant: "destructive",
              });
            } else {
              // Store voice analysis results
              try {
                localStorage.setItem("tv_voice_analysis", JSON.stringify(data));
                console.log("Voice results stored:", data);
                setVoiceResults(data); // Also update state
              } catch (e) {
                console.error("Error storing voice results:", e);
              }

              toast({
                title: "✅ Voice Analyzed",
                description: "Voice traits successfully processed.",
              });

              // Store the full voice results in localStorage, only if data exists
              try {
                localStorage.setItem("tv_voice_results", JSON.stringify(data));
                console.log("Voice results saved to localStorage:", data);
              } catch (e) {
                console.error("Error saving voice results to localStorage", e);
              }

              // Now set the voice results state using setVoiceResults
              // Store the voice results from the response
              const voiceData = data.voice || data;
              console.log("Setting voice results state:", voiceData);
              setVoiceResults(voiceData); // Store the voice data in state
            }
          } catch (error) {
            console.error("Upload failed:", error);
            toast({
              title: "❌ Upload Failed",
              description: "Could not send voice to backend.",
              variant: "destructive",
            });
          }

          // Stop all tracks and update states
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          setRecordingComplete(true);
          setIsRecording(false);
        };

        recorder.start(1000); // Request data every 1 second

        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
            clearInterval(recordingTimerRef.current!);
            setIsRecording(false);
          }
        }, 15000);
      } catch (error) {
        console.error("Microphone access error:", error);
        toast({
          title: "Microphone Error",
          description: "Please allow access to the microphone.",
          variant: "destructive",
        });
        setIsRecording(false);
      }
    }
  };

  const toggleCamera = async () => {
    console.log("Toggle camera clicked, current state:", isCameraActive);

    if (!isCameraActive) {
      try {
        console.log("Requesting camera access...");

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error("getUserMedia not supported");
          throw new Error("Camera not supported by this browser");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        console.log("Camera stream obtained successfully:", stream);
        console.log("Video tracks:", stream.getVideoTracks());

        streamRef.current = stream;

        if (videoRef.current) {
          console.log("Setting video srcObject to stream...");
          videoRef.current.srcObject = stream;

          // Wait for the stream to be ready and play
          await new Promise((resolve) => {
            videoRef.current!.onloadedmetadata = () => {
              console.log("Video metadata loaded successfully");
              resolve(true);
            };
          });

          try {
            await videoRef.current.play();
            console.log("Video is now playing successfully");
          } catch (playError) {
            console.error("Error playing video:", playError);
          }
        }

        setIsCameraActive(true);
        console.log("Camera state set to active");

        toast({
          title: "Camera Activated",
          description: "Please follow the expression prompts",
        });

        // Start expression sequence after a short delay
        setTimeout(() => {
          startExpressionSequence();
        }, 1000);
      } catch (error) {
        console.error("Camera activation error:", error);
        toast({
          title: "Camera Access Denied",
          description:
            error instanceof Error
              ? error.message
              : "Please allow camera access to continue",
          variant: "destructive",
        });
      }
    } else {
      console.log("Stopping camera...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      setExpressionComplete(false);
      setCurrentExpression("neutral");
      setFacialResults({});
      console.log("Camera stopped and state reset");
    }
  };
  const getEmotionColor = (emotion: string) => {
  switch (emotion) {
    case "happy":
      return "text-green-400";
    case "sad":
      return "text-blue-400";
    case "angry":
      return "text-red-400";
    case "disgust":
      return "text-yellow-400";
    default:
      return "text-white";
  }
};

  const startExpressionSequence = () => {
    let expressionIndex = 0;
    const interval = setInterval(async () => {
      if (expressionIndex < expressions.length) {
        const expr = expressions[expressionIndex];
        const exprName = expr.name;
        setCurrentExpression(exprName);

        // Capture snapshot
        if (videoRef.current) {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/jpeg")
            );

            if (blob) {
              const formData = new FormData();
              formData.append("face", blob, "face.jpg");

              try {
                const res = await fetch(
                  "http://localhost:8000/api/predict/face/",
                  {
                    method: "POST",
                    body: formData,
                  }
                );
                const data = await res.json();
                console.log("Facial prediction response:", data);
                setFacialResults((prev) => ({ ...prev, [exprName]: data }));
                try {
                  const next = { ...facialResults, [exprName]: data };
                  localStorage.setItem(
                    "tv_facial_results",
                    JSON.stringify(next)
                  );
                } catch (e) {
                  // ignore storage errors
                }
                toast({
                  title: "✅ Expression Captured",
                  description: `Processed ${expr.label}${
                    data?.dominant_emotion ? ` — ${data.dominant_emotion}` : ""
                  }`,
                });
              } catch (error) {
                toast({
                  title: "❌ Upload Failed",
                  description: "Error uploading facial image",
                  variant: "destructive",
                });
              }
            }
          }
        }

        expressionIndex++;
      } else {
        clearInterval(interval);
        setExpressionComplete(true);
        toast({
          title: "✅ Facial Analysis Complete",
          description: "All expressions captured successfully",
        });
      }
    }, 5000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isSubmitting) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 pt-20">
        <Card className="bg-card border border-border p-12 text-center max-w-lg shadow-lg">
          <Loader2 className="h-16 w-16 text-accent animate-spin mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4">
            Analyzing Your Personality
          </h3>
          <p className="text-gray-300 font-lora mb-6">
            Our AI is processing your responses across all three modalities...
          </p>
          <div className="space-y-2 text-left">
            <div className="flex items-center text-green-400">
              <CheckCircle className="w-4 h-4 mr-3" />
              Text analysis complete
            </div>
            <div className="flex items-center text-accent">
              <Loader2 className="w-4 h-4 animate-spin mr-3" />
              Processing voice patterns...
            </div>
            <div className="flex items-center text-accent">
              <Loader2 className="w-4 h-4 animate-spin mr-3" />
              Analyzing facial expressions...
            </div>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section
      id="test"
      className="min-h-screen flex items-center justify-center px-4 pt-20"
    >
      <div className="container mx-auto max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-white">
              Personality Assessment
            </h2>
            <span className="text-accent font-medium">
              Step {currentStep} of 3
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-white/10" />
        </div>

        <Card className="bg-card border border-border p-8 shadow-lg">
          {/* Step 1: Text Analysis */}
          {currentStep === 1 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Share Your Thoughts
              </h3>

              {/* User Information Section */}
              <div className="mb-8 space-y-4">
                <p className="text-gray-300 font-lora mb-4">
                  First, please tell us a bit about yourself:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 border border-border rounded-lg p-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="userName"
                      className="text-foreground font-medium"
                    >
                      Your Name
                    </Label>
                    <Input
                      id="userName"
                      type="text"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="userAge"
                      className="text-foreground font-medium"
                    >
                      Your Age
                    </Label>
                    <Input
                      id="userAge"
                      type="number"
                      placeholder="Enter your age"
                      min="1"
                      max="120"
                      value={userAge}
                      onChange={(e) => setUserAge(e.target.value)}
                      className="bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Guided Questions */}
              <div className="mb-8 space-y-4">
                <p className="text-gray-300 font-lora mb-4">
                  Now, please answer these questions in the text area below:
                </p>
                <div className="text-left bg-secondary/30 border border-border rounded-lg p-6 space-y-4">
                  {questions.map((question, index) => (
                    <p
                      key={index}
                      className="text-foreground font-medium text-base"
                    >
                      {index + 1}. {question}
                    </p>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Write your detailed responses here..."
                className="min-h-48 bg-secondary/20 border-border text-foreground placeholder:text-muted-foreground resize-none focus:border-accent focus:ring-accent"
                value={textResponse}
                onChange={handleTextChange}
              />

              {/* Text Analysis Status */}
              {textResponse.trim() && (
                <div className="mt-4 flex items-center justify-center">
                  {!textAnalysisComplete ? (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-accent">
                        {isAnalyzingText ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm">Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-4 w-4 mr-2" />
                            <span className="text-sm">Ready to analyze</span>
                          </>
                        )}
                      </div>
                      <Button
                        onClick={analyzeTextResponse}
                        size="sm"
                        variant="outline"
                        disabled={isAnalyzingText}
                        className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B] disabled:opacity-50"
                      >
                        {isAnalyzingText ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          "Analyze Now"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-400">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm">Text analysis complete</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Voice Analysis */}
          {currentStep === 2 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Voice Recording
              </h3>
              <p className="text-gray-300 font-lora mb-8">
                Please read the following prompt aloud. Our AI will analyze your
                vocal patterns, tone, and speech characteristics.
              </p>

              <Card className="bg-secondary/20 border border-border p-6 mb-8">
                <p className="text-foreground font-lora text-lg leading-relaxed">
                  "I believe that understanding ourselves is the first step
                  toward personal growth. When I reflect on my experiences, I
                  can see patterns in how I approach challenges and interact
                  with others. This self-awareness helps me make better
                  decisions."
                </p>
              </Card>

              <div className="flex flex-col items-center">
                <Button
                  onClick={toggleRecording}
                  size="lg"
                  className={`rounded-full w-20 h-20 mb-4 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-accent hover:bg-accent/80"
                  } text-white`}
                >
                  {isRecording ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </Button>

                <p className="text-gray-300 mb-2">
                  {isRecording
                    ? `Recording... ${formatTime(recordingDuration)}`
                    : "Click to start recording"}
                </p>

                {recordingComplete && (
                  <div className="flex items-center text-green-400 mt-2">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>
                      ✅ Recording complete ({formatTime(recordingDuration)})
                    </span>
                  </div>
                )}

                {isRecording && (
                  <div className="flex space-x-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 bg-accent animate-pulse rounded"
                        style={{
                          height: `${Math.random() * 40 + 10}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Voice Results Display */}
                {voiceResults && (
                  <Card className="bg-secondary/20 border border-accent/50 p-6 mt-8 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-accent text-[#1B1F3B]">
                        Voice Analysis Results
                      </Badge>
                      <span className="text-sm text-green-400 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Request sent & received
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Voice Analysis Summary */}
                      <div>
                        <h4 className="text-white font-semibold mb-3">
                          Voice Analysis
                        </h4>
                        <div className="bg-secondary/30 border border-border rounded-lg p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">
                                Detected Emotion:
                              </span>
                              <span className={`font-semibold capitalize ${getEmotionColor(voiceResults.detected_emotion)}`}>
  {voiceResults.detected_emotion || "Unknown"}
</span>
                            </div>
                            {voiceResults.emotion_confidence && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-300">
                                  Confidence:
                                </span>
                                <span className="text-white font-semibold">
                                  {(
                                    voiceResults.emotion_confidence * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Voice Trait Scores */}
                      <div>
                        <h4 className="text-white font-semibold mb-3">
                          Personality Scores
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(voiceResults).map(([trait, score]) => {
  if (
    typeof score === "number" &&
    trait !== "emotion_confidence"
  ) {
    return (
      <div
        key={trait}
        className="flex items-center justify-between"
      >
        <span className="text-gray-300 capitalize">
          {trait.replace("_", " ")}
        </span>
        <div className="flex items-center space-x-2">
          <Progress
            value={score} // ✅ FIXED
            className="w-20 h-2"
          />
          <span className="text-white font-semibold min-w-[3rem]">
            {score}% {/* ✅ FIXED */}
          </span>
        </div>
      </div>
    );
  }
  return null;
})}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Facial Analysis */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Facial Analysis
              </h3>
              <p className="text-gray-300 font-lora mb-8">
                Our AI will analyze your facial expressions and
                micro-expressions. Please look directly at the camera and follow
                the prompts.
              </p>

              <div className="relative bg-black rounded-xl p-4 mb-6 border-2 border-dashed border-accent/50">
                {isCameraActive ? (
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      webkit-playsinline
                      className="w-full h-full object-cover"
                      style={{
                        transform: "scaleX(-1)",
                        background: "#000000",
                        width: "100%",
                        height: "100%",
                      }}
                      onLoadedMetadata={(e) => {
                        console.log("Video metadata loaded");
                        const video = e.target as HTMLVideoElement;
                        video
                          .play()
                          .catch((e) => console.error("Play failed:", e));
                      }}
                      onCanPlay={(e) => {
                        console.log("Video can play");
                        const video = e.target as HTMLVideoElement;
                        video
                          .play()
                          .catch((e) => console.error("Play failed:", e));
                      }}
                      onPlaying={() => {
                        console.log("Video is playing");
                      }}
                      onError={(e) => {
                        console.error("Video error:", e);
                      }}
                    />

                    {/* Expression Guidance Overlay */}
                    <div className="absolute top-4 left-4 right-4 bg-black/70 rounded-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {
                              expressions.find(
                                (exp) => exp.name === currentExpression
                              )?.label
                            }
                          </h4>
                          <p className="text-sm text-gray-300">
                            {
                              expressions.find(
                                (exp) => exp.name === currentExpression
                              )?.instruction
                            }
                          </p>
                        </div>
                        {expressionComplete && (
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        )}
                      </div>
                    </div>

                    {/* Face Detection Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-4 border-accent rounded-full opacity-50 animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <CameraOff className="h-16 w-16 mx-auto mb-4" />
                      <p>Camera not active</p>
                      <p className="text-sm">
                        Click "Activate Camera" to begin
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={toggleCamera}
                variant={isCameraActive ? "destructive" : "default"}
                className={
                  isCameraActive
                    ? ""
                    : "bg-accent text-[#1B1F3B] hover:bg-accent/90"
                }
              >
                {isCameraActive ? "Stop Camera" : "Activate Camera"}
              </Button>

              {/* Facial Results Panel */}
              {Object.keys(facialResults).length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expressions.map((exp) => {
                    const result = facialResults[exp.name];
                    const emotion =
                      result?.dominant_emotion ||
                      result?.face?.dominant_emotion;
                    return (
                      <Card
                        key={exp.name}
                        className="bg-secondary/20 border border-border p-4 text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-foreground font-semibold">
                            {exp.label}
                          </div>
                          {result ? (
                            <span className="text-green-400 text-sm flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" /> Captured
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              Pending
                            </span>
                          )}
                        </div>
                        {result && (
                          <div className="text-sm text-gray-300 space-y-1">
                            {emotion && (
                              <div>
                                <span className="text-white">
                                  Detected emotion:
                                </span>{" "}
                                {emotion}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {[
                                "openness",
                                "conscientiousness",
                                "extraversion",
                                "agreeableness",
                                "emotional_stability",
                              ].map((trait) => {
                                const value = result?.[trait];
                                if (typeof value !== "number") return null;
                                const pct = Math.round(value * 100);
                                return (
                                  <div
                                    key={trait}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="capitalize">
                                      {trait.replace("_", " ")}
                                    </span>
                                    <span className="text-white">{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              {expressionComplete && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <div className="flex items-center justify-center text-green-400">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>All facial expressions captured successfully!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-12">
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={currentStep === 1}
              className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B]"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 &&
                  (!textResponse.trim() ||
                    !userName.trim() ||
                    !userAge.trim())) ||
                (currentStep === 2 && !recordingComplete) ||
                (currentStep === 3 && !expressionComplete) ||
                (currentStep === 1 &&
                  textResponse.trim() &&
                  userName.trim() &&
                  userAge.trim() &&
                  !textAnalysisComplete &&
                  isAnalyzingText)
              }
              className="bg-accent text-[#1B1F3B] hover:bg-accent/90"
            >
              {currentStep === 1 &&
              textResponse.trim() &&
              !textAnalysisComplete &&
              isAnalyzingText ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : currentStep === 3 ? (
                "Analyze Results"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default TestInterface;
