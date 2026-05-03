import { useState, useRef, useEffect, useCallback } from "react";
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
import { useYOLODetector, Detection } from "@/hooks/useYOLODetector";

// ── YOLO color helpers ─────────────────────────────────────────────────────────
const YOLO_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

function getColorForClass(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return YOLO_COLORS[Math.abs(hash) % YOLO_COLORS.length];
}

const TestInterface = () => {
  const { user, isAuthenticated } = useAuth();

  // ── step / UI state ────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── text step ──────────────────────────────────────────────────────────────
  const [textResponse, setTextResponse] = useState("");
  const [textAnalysisComplete, setTextAnalysisComplete] = useState<boolean>(false);
  const [isAnalyzingText, setIsAnalyzingText] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [userAge, setUserAge] = useState<string>("");

  // ── voice step ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceResults, setVoiceResults] = useState<any>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // ── facial step ────────────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<string>("neutral");
  const [expressionComplete, setExpressionComplete] = useState<boolean>(false);
  const [facialResults, setFacialResults] = useState<Record<string, any>>({});

  // ── YOLO state ─────────────────────────────────────────────────────────────
  const [personDetected, setPersonDetected] = useState(false);
  const [yoloDetections, setYoloDetections] = useState<Detection[]>([]);

  // ── refs ───────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const yoloIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toast } = useToast();
  const progress = (currentStep / 3) * 100;

  // ── static data ────────────────────────────────────────────────────────────
  const expressions = [
    { name: "neutral",   label: "Neutral face",  instruction: "Look directly at the camera with a relaxed expression" },
    { name: "smile",     label: "Smile",          instruction: "Show a genuine, natural smile" },
    { name: "surprised", label: "Surprised",      instruction: "Raise your eyebrows and open your eyes wide" },
    { name: "sad",       label: "Sad",            instruction: "Show a slightly sad or concerned expression" },
  ];

  const questions = [
    "How would your friends describe you in three words?",
    "Describe a situation where you felt most proud of yourself.",
    "What are your greatest strengths and one area you'd like to improve?",
  ];

  
const handleYOLODetection = useCallback((detections: Detection[]) => {
    setYoloDetections(detections);
    const hasPerson = detections.some((d) => d.label === "person");
    setPersonDetected(hasPerson);

    if (!overlayCanvasRef.current || !videoRef.current) return;
    const canvas = overlayCanvasRef.current;
    const video  = videoRef.current;
    const ctx    = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const { label, confidence, bbox } = det;
      const color    = getColorForClass(label);
      const flippedX = canvas.width - bbox.x - bbox.width;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.strokeRect(flippedX, bbox.y, bbox.width, bbox.height);
      const labelText = `${label} ${(confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 13px Inter, sans-serif";
      const textW = ctx.measureText(labelText).width;
      ctx.fillStyle = color;
      ctx.fillRect(flippedX, bbox.y - 24, textW + 10, 22);
      ctx.fillStyle = "#fff";
      ctx.fillText(labelText, flippedX + 5, bbox.y - 7);
    });
  }, []);

const { detectFrame } = useYOLODetector({
  apiUrl: "http://localhost:8001",
  onDetection: handleYOLODetection,
});
  // ── YOLO loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('YOLO useEffect triggered:', { isCameraActive, currentStep });

    if (isCameraActive && currentStep === 3) {
      console.log('✅ Starting YOLO detection loop');

      yoloIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2) return;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width  = video.videoWidth  || 640;
        tempCanvas.height = video.videoHeight || 480;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const base64 = tempCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        await detectFrame(base64);
      }, 1000);
    }

    return () => {
      if (yoloIntervalRef.current) {
        clearInterval(yoloIntervalRef.current);
        yoloIntervalRef.current = null;
      }
    };
  }, [isCameraActive, currentStep, detectFrame]);

  // ── Mount: clear old results ───────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.removeItem("tv_facial_results");
      localStorage.removeItem("tv_voice_analysis");
      localStorage.removeItem("tv_text_analysis");
    } catch (e) {
      console.error("Error clearing old results:", e);
    }

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (yoloIntervalRef.current) clearInterval(yoloIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.error("Play failed:", e));
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (voiceResults) console.log("Voice results state updated:", voiceResults);
  }, [voiceResults]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case "happy":   return "text-green-400";
      case "sad":     return "text-blue-400";
      case "angry":   return "text-red-400";
      case "disgust": return "text-yellow-400";
      default:        return "text-white";
    }
  };

  // ── Text analysis ──────────────────────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextResponse(newText);
    if (textAnalysisComplete && newText !== textResponse) {
      setTextAnalysisComplete(false);
      localStorage.removeItem("tv_text_analysis");
    }
  };

 const analyzeTextResponse = async () => {
  setIsAnalyzingText(true);
  try {
    const response = await fetch("http://localhost:8000/api/predict/text/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textResponse }),
    });
    const data = await response.json();
console.log("Text Analysis Response:", data);

// data.text nikalo agar andar hai
const textData = data.text || data;

if (textData && !textData.error) {
  localStorage.setItem("tv_text_analysis", JSON.stringify(textData));
  setTextAnalysisComplete(true);
  toast({ title: "✅ Text Analyzed", description: "Your text has been processed successfully." });
  return true;
} else {
  setTextAnalysisComplete(false);
  toast({ title: "❌ Text Analysis Failed", description: textData.error || "Could not process your text response.", variant: "destructive" });
  return false;
}
  } catch (e) {
    console.error("Text analysis error:", e);
    setTextAnalysisComplete(false);
    toast({ title: "❌ Text Analysis Failed", description: "Could not process your text response.", variant: "destructive" });
    return false;
  } finally {
    setIsAnalyzingText(false);
  }
};

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
  if (currentStep < 3) {
    if (currentStep === 1 && textResponse.trim() && userName.trim() && userAge.trim()) {
      if (!textAnalysisComplete) {
        const success = await analyzeTextResponse();
        if (success) setCurrentStep((s) => s + 1);
        return;
      }
    }
    setCurrentStep((s) => s + 1);
  } else {
    handleSubmit();
  }
};

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      if (currentStep === 2) { setRecordingComplete(false); setRecordingDuration(0); }
      if (currentStep === 3) {
        setExpressionComplete(false);
        setCurrentExpression("neutral");
        setFacialResults({});
        setPersonDetected(false);
        setYoloDetections([]);
        if (yoloIntervalRef.current) clearInterval(yoloIntervalRef.current);
      }
    }
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const toggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingComplete(false);
      setAudioBlob(null);
      audioChunksRef.current = [];

      toast({ title: "🎙️ Recording Started", description: "Please read the prompt aloud clearly." });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 22050, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });

        const mimeType = MediaRecorder.isTypeSupported("audio/wav") ? "audio/wav" : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        setMediaRecorder(recorder);

        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

        recorder.onstop = async () => {
          const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(recordedBlob);

          const formData = new FormData();
          formData.append("voice", recordedBlob, mimeType === "audio/wav" ? "recording.wav" : "recording.webm");

          try {
            const response = await fetch("http://localhost:8000/api/predict/voice/", { method: "POST", body: formData });
            const data = await response.json();
            console.log("Voice Analysis Response:", data);

            if (data.error) {
              toast({ title: "❌ Voice Analysis Failed", description: data.error, variant: "destructive" });
            } else {
              localStorage.setItem("tv_voice_analysis", JSON.stringify(data));
              const voiceData = data.voice || data;
              setVoiceResults(voiceData);
              toast({ title: "✅ Voice Analyzed", description: "Voice traits successfully processed." });
            }
          } catch {
            toast({ title: "❌ Upload Failed", description: "Could not send voice to backend.", variant: "destructive" });
          }

          if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
          setRecordingComplete(true);
          setIsRecording(false);
        };

        recorder.start(1000);
        recordingTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
            clearInterval(recordingTimerRef.current!);
            setIsRecording(false);
          }
        }, 10000);
      } catch {
        toast({ title: "Microphone Error", description: "Please allow access to the microphone.", variant: "destructive" });
        setIsRecording(false);
      }
    }
  };

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const toggleCamera = async () => {
    console.log("Toggle camera clicked, current state:", isCameraActive);

    if (!isCameraActive) {
      try {
        console.log("Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });

        console.log("Camera stream obtained successfully:", stream);
        console.log("Video tracks:", stream.getVideoTracks());

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise<void>((resolve) => {
            videoRef.current!.onloadedmetadata = () => resolve();
          });
          await videoRef.current.play();
        }

        setIsCameraActive(true);
        console.log("Camera state set to active");
        toast({ title: "Camera Activated", description: "Please follow the expression prompts" });
        setTimeout(() => startExpressionSequence(), 1000);
      } catch (error) {
        toast({
          title: "Camera Access Denied",
          description: error instanceof Error ? error.message : "Please allow camera access to continue",
          variant: "destructive",
        });
      }
    } else {
      if (yoloIntervalRef.current) { clearInterval(yoloIntervalRef.current); yoloIntervalRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
      setIsCameraActive(false);
      setExpressionComplete(false);
      setCurrentExpression("neutral");
      setFacialResults({});
      setPersonDetected(false);
      setYoloDetections([]);
    }
  };

  // ── Expression sequence ────────────────────────────────────────────────────
  const startExpressionSequence = () => {
    let expressionIndex = 0;
    const interval = setInterval(async () => {
      if (expressionIndex < expressions.length) {
        const expr = expressions[expressionIndex];
        setCurrentExpression(expr.name);

        if (videoRef.current) {
          const canvas = document.createElement("canvas");
          canvas.width  = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg"));

            if (blob) {
              const formData = new FormData();
              formData.append("face", blob, "face.jpg");
              try {
                const res  = await fetch("http://localhost:8000/api/predict/face/", { method: "POST", body: formData });
                const data = await res.json();
                console.log("Facial prediction response:", data);
                setFacialResults((prev) => {
                  const next = { ...prev, [expr.name]: data };
                  try { localStorage.setItem("tv_facial_results", JSON.stringify(next)); } catch {}
                  return next;
                });
                toast({ title: "✅ Expression Captured", description: `Processed ${expr.label}${data?.dominant_emotion ? ` — ${data.dominant_emotion}` : ""}` });
              } catch {
                toast({ title: "❌ Upload Failed", description: "Error uploading facial image", variant: "destructive" });
              }
            }
          }
        }
        expressionIndex++;
      } else {
        clearInterval(interval);
        setExpressionComplete(true);
        toast({ title: "✅ Facial Analysis Complete", description: "All expressions captured successfully" });
      }
    }, 5000);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    console.log("🚀 Starting Multimodal Fusion Submission...");

    try {
      const formData = new FormData();
      let hasValidData = false;

      if (textResponse.trim()) {
        formData.append("text", textResponse);
        if (userName.trim()) localStorage.setItem("tv_user_name", userName.trim());
        if (userAge.trim())  localStorage.setItem("tv_user_age",  userAge.trim());
        hasValidData = true;
      }

      if (voiceResults && Object.keys(voiceResults).length > 0) {
        formData.append("voice_results", JSON.stringify(voiceResults));
        hasValidData = true;
      } else if (audioBlob) {
        formData.append("voice", audioBlob, "recording.webm");
        hasValidData = true;
      }

      if (Object.keys(facialResults).length > 0) {
        formData.append("facial_results", JSON.stringify(facialResults));
        hasValidData = true;
      } else if (isCameraActive && videoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const faceBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg"));
          if (faceBlob) { formData.append("face", faceBlob, "face.jpg"); hasValidData = true; }
        }
      }

      if (!hasValidData) {
        toast({ title: "❌ No Data to Submit", description: "Please provide text, record voice, or activate camera.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const response      = await fetch("http://localhost:8000/api/predict/multimodal/", { method: "POST", body: formData });
      const fusionResults = await response.json();
      console.log("🔬 Fusion Response:", fusionResults);

      if (fusionResults.error) {
        toast({ title: "❌ Analysis Failed", description: fusionResults.error, variant: "destructive" });
      } else {
        if (fusionResults.text)   localStorage.setItem("tv_text_analysis",  JSON.stringify(fusionResults.text));
        if (fusionResults.voice)  localStorage.setItem("tv_voice_analysis", JSON.stringify(fusionResults.voice));
        if (fusionResults.face)   localStorage.setItem("tv_facial_results", JSON.stringify(fusionResults.face));
        if (fusionResults.fusion) {
          localStorage.setItem("tv_fusion_results", JSON.stringify(fusionResults.fusion));
          console.log("🎯 FUSION RESULTS STORED:", fusionResults.fusion);
        }

        toast({
          title: "🎯 Multimodal Analysis Complete!",
          description: `Analyzed ${fusionResults.fusion?.modalities_used || 0} modalities with ${(fusionResults.fusion?.confidence * 100).toFixed(0)}% confidence.`,
        });

        if (isAuthenticated && user) {
          try {
            await resultsService.saveTestResult({
              text_result:   fusionResults.text   || null,
              voice_result:  fusionResults.voice  || null,
              face_result:   fusionResults.face   || null,
              fusion_result: fusionResults.fusion || null,
            });
          } catch {
            toast({ title: "⚠️ Warning", description: "Results analyzed but not saved to server." });
          }
        }

        setTimeout(() => { setIsSubmitting(false); window.location.href = "/results"; }, 2000);
      }
    } catch {
      toast({ title: "❌ Submission Failed", description: "Failed to submit data for analysis.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  // ── Submitting screen ──────────────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 pt-20">
        <Card className="bg-card border border-border p-12 text-center max-w-lg shadow-lg">
          <Loader2 className="h-16 w-16 text-accent animate-spin mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4">Analyzing Your Personality</h3>
          <p className="text-gray-300 font-lora mb-6">Our AI is processing your responses across all three modalities...</p>
          <div className="space-y-2 text-left">
            <div className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-3" />Text analysis complete</div>
            <div className="flex items-center text-accent"><Loader2 className="w-4 h-4 animate-spin mr-3" />Processing voice patterns...</div>
            <div className="flex items-center text-accent"><Loader2 className="w-4 h-4 animate-spin mr-3" />Analyzing facial expressions...</div>
          </div>
        </Card>
      </section>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <section id="test" className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="container mx-auto max-w-4xl">

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-white">Personality Assessment</h2>
            <span className="text-accent font-medium">Step {currentStep} of 3</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/10" />
        </div>

        <Card className="bg-card border border-border p-8 shadow-lg">

          {/* ── Step 1: Text ───────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Share Your Thoughts</h3>

              <div className="mb-8 space-y-4">
                <p className="text-gray-300 font-lora mb-4">First, please tell us a bit about yourself:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 border border-border rounded-lg p-6">
                  <div className="space-y-2">
                    <Label htmlFor="userName" className="text-foreground font-medium">Your Name</Label>
                    <Input id="userName" type="text" placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)}
                      className="bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userAge" className="text-foreground font-medium">Your Age</Label>
                    <Input id="userAge" type="number" placeholder="Enter your age" min="1" max="120" value={userAge} onChange={(e) => setUserAge(e.target.value)}
                      className="bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-accent" />
                  </div>
                </div>
              </div>

              <div className="mb-8 space-y-4">
                <p className="text-gray-300 font-lora mb-4">Now, please answer these questions in the text area below:</p>
                <div className="text-left bg-secondary/30 border border-border rounded-lg p-6 space-y-4">
                  {questions.map((q, i) => (
                    <p key={i} className="text-foreground font-medium text-base">{i + 1}. {q}</p>
                  ))}
                </div>
              </div>

              <Textarea placeholder="Write your detailed responses here..."
                className="min-h-48 bg-secondary/20 border-border text-foreground placeholder:text-muted-foreground resize-none focus:border-accent focus:ring-accent"
                value={textResponse} onChange={handleTextChange} />

              {textResponse.trim() && (
                <div className="mt-4 flex items-center justify-center">
                  {!textAnalysisComplete ? (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-accent">
                        <Loader2 className={`h-4 w-4 mr-2 ${isAnalyzingText ? "animate-spin" : ""}`} />
                        <span className="text-sm">{isAnalyzingText ? "Analyzing..." : "Ready to analyze"}</span>
                      </div>
                      <Button onClick={analyzeTextResponse} size="sm" variant="outline" disabled={isAnalyzingText}
                        className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B] disabled:opacity-50">
                        {isAnalyzingText ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing...</> : "Analyze Now"}
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

          {/* ── Step 2: Voice ──────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Voice Recording</h3>
              <p className="text-gray-300 font-lora mb-8">
                Please read the following prompt aloud. Our AI will analyze your vocal patterns, tone, and speech characteristics.
              </p>

              <Card className="bg-secondary/20 border border-border p-6 mb-8">
                <p className="text-foreground font-lora text-lg leading-relaxed">
                  "I believe that understanding ourselves is the first step toward personal growth. When I reflect on my
                  experiences, I can see patterns in how I approach challenges and interact with others. This self-awareness
                  helps me make better decisions."
                </p>
              </Card>

              <div className="flex flex-col items-center">
                <Button onClick={toggleRecording} size="lg"
                  className={`rounded-full w-20 h-20 mb-4 ${isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-accent hover:bg-accent/80"} text-white`}>
                  {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>

                <p className="text-gray-300 mb-2">
                  {isRecording ? `Recording... ${formatTime(recordingDuration)}` : "Click to start recording"}
                </p>

                {recordingComplete && (
                  <div className="flex items-center text-green-400 mt-2">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>✅ Recording complete ({formatTime(recordingDuration)})</span>
                  </div>
                )}

                {isRecording && (
                  <div className="flex space-x-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 bg-accent animate-pulse rounded"
                        style={{ height: `${Math.random() * 40 + 10}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}

                {voiceResults && (
                  <Card className="bg-secondary/20 border border-accent/50 p-6 mt-8 shadow-lg w-full">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-accent text-[#1B1F3B]">Voice Analysis Results</Badge>
                      <span className="text-sm text-green-400 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />Request sent &amp; received
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-white font-semibold mb-3">Voice Analysis</h4>
                        <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Detected Emotion:</span>
                            <span className={`font-semibold capitalize ${getEmotionColor(voiceResults.detected_emotion)}`}>
                              {voiceResults.detected_emotion || "Unknown"}
                            </span>
                          </div>
                          {voiceResults.emotion_confidence && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Confidence:</span>
                              <span className="text-white font-semibold">{(voiceResults.emotion_confidence * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-3">Personality Scores</h4>
                        <div className="space-y-3">
                          {Object.entries(voiceResults).map(([trait, score]) => {
                            if (typeof score === "number" && trait !== "emotion_confidence") {
                              return (
                                <div key={trait} className="flex items-center justify-between">
                                  <span className="text-gray-300 capitalize">{trait.replace("_", " ")}</span>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={score} className="w-20 h-2" />
                                    <span className="text-white font-semibold min-w-[3rem]">{score}%</span>
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

          {/* ── Step 3: Facial + YOLO ──────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Facial Analysis</h3>
              <p className="text-gray-300 font-lora mb-8">
                Our AI will analyze your facial expressions. Please look directly at the camera and follow the prompts.
              </p>

              <div className="relative bg-black rounded-xl p-4 mb-6 border-2 border-dashed border-accent/50">
                {isCameraActive ? (
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">

                    {/* Video */}
                    <video
                      ref={videoRef}
                      autoPlay muted playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                      onLoadedMetadata={(e) => {
                        console.log("Video metadata loaded");
                        (e.target as HTMLVideoElement).play().catch(console.error);
                      }}
                      onCanPlay={(e) => {
                        console.log("Video can play");
                        (e.target as HTMLVideoElement).play().catch(console.error);
                      }}
                      onPlaying={() => console.log("Video is playing")}
                      onError={(e) => console.error("Video error:", e)}
                    />

                    {/* YOLO overlay canvas */}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />

                    {/* Person detected badge — top right */}
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
                      personDetected ? "bg-green-500/80 text-white" : "bg-red-500/80 text-white"
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${personDetected ? "bg-white animate-pulse" : "bg-white/60"}`} />
                      {personDetected ? "Person Detected" : "No Person Found"}
                    </div>

                    {/* YOLO stats — top left */}
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-md text-xs flex gap-3">
                      <span>Objects: {yoloDetections.length}</span>
                      <span className="text-yellow-400">YOLO Active</span>
                    </div>

                    {/* Expression guidance — bottom */}
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 rounded-lg p-3 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-base">
                            {expressions.find((e) => e.name === currentExpression)?.label}
                          </h4>
                          <p className="text-sm text-gray-300">
                            {expressions.find((e) => e.name === currentExpression)?.instruction}
                          </p>
                        </div>
                        {expressionComplete && <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />}
                      </div>
                    </div>

                    {/* Face circle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-56 h-56 border-4 rounded-full opacity-40 transition-colors duration-500 ${
                        personDetected ? "border-green-400" : "border-accent animate-pulse"
                      }`} />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <CameraOff className="h-16 w-16 mx-auto mb-4" />
                      <p>Camera not active</p>
                      <p className="text-sm">Click "Activate Camera" to begin</p>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={toggleCamera} variant={isCameraActive ? "destructive" : "default"}
                className={isCameraActive ? "" : "bg-accent text-[#1B1F3B] hover:bg-accent/90"}>
                {isCameraActive ? "Stop Camera" : "Activate Camera"}
              </Button>

              {/* Warning: person not in frame */}
              {isCameraActive && !personDetected && (
                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Koi banda frame mein nahi mila. Apna chehra camera ke saamne rakho.</span>
                </div>
              )}

              {/* Facial results */}
              {Object.keys(facialResults).length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expressions.map((exp) => {
                    const result = facialResults[exp.name];
                    const emotion = result?.dominant_emotion || result?.face?.dominant_emotion;
                    return (
                      <Card key={exp.name} className="bg-secondary/20 border border-border p-4 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-foreground font-semibold">{exp.label}</div>
                          {result
                            ? <span className="text-green-400 text-sm flex items-center"><CheckCircle className="h-4 w-4 mr-1" />Captured</span>
                            : <span className="text-gray-400 text-sm">Pending</span>}
                        </div>
                        {result && (
  <div className="text-sm text-gray-300 space-y-1">
    {emotion && <div><span className="text-white">Detected emotion:</span> {emotion}</div>}
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"].map((trait) => {
        const value = result?.[trait];
        if (typeof value !== "number") return null;
        return (
          <div key={trait} className="flex items-center justify-between">
            <span className="capitalize">{trait.replace("_", " ")}</span>
            <span className="text-white">{value}%</span>
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

          {/* ── Navigation ─────────────────────────────────────────────────── */}
          <div className="flex justify-between mt-12">
            <Button onClick={handleBack} variant="outline" disabled={currentStep === 1}
              className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B]">
              <ChevronLeft className="h-4 w-4 mr-2" />Back
            </Button>

            <Button onClick={handleNext}
              disabled={
                (currentStep === 1 && (!textResponse.trim() || !userName.trim() || !userAge.trim())) ||
                (currentStep === 2 && !recordingComplete) ||
                (currentStep === 3 && !expressionComplete) ||
                (currentStep === 1 && textResponse.trim() && userName.trim() && userAge.trim() && !textAnalysisComplete && isAnalyzingText)
              }
              className="bg-accent text-[#1B1F3B] hover:bg-accent/90">
              {currentStep === 1 && textResponse.trim() && !textAnalysisComplete && isAnalyzingText
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing...</>
                : currentStep === 3 ? "Analyze Results"
                : <>{`Next`}<ChevronRight className="h-4 w-4 ml-2" /></>
              }
            </Button>
          </div>

        </Card>
      </div>
    </section>
  );
};

export default TestInterface;