/**
 * YOLO Video Component with Facial Emotion Recognition
 * 
 * Displays real-time webcam video with YOLO object detection
 * and facial emotion recognition overlays
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useYOLODetector, Detection } from '../hooks/useYOLODetector';

interface YOLOVideoProps {
  onDetectionsUpdate?: (detections: Detection[]) => void;
  includeEmotions?: boolean;
  showStats?: boolean;
  detectionInterval?: number;
}

export const YOLOVideo: React.FC<YOLOVideoProps> = ({
  onDetectionsUpdate,
  includeEmotions = true,
  showStats = true,
  detectionInterval = 300,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const { detections, stats, error, detectFrame } = useYOLODetector(includeEmotions);

  // Color mapping for classes
  const classColors: { [key: string]: [number, number, number] } = {
    person: [0, 255, 0],
    car: [255, 0, 0],
    dog: [0, 0, 255],
    cat: [255, 255, 0],
    bus: [255, 0, 255],
    truck: [0, 255, 255],
  };

  const getClassColor = (label: string): [number, number, number] => {
    return classColors[label] || [
      Math.abs(label.charCodeAt(0) * 73) % 256,
      Math.abs(label.charCodeAt(1) * 97) % 256,
      Math.abs(label.charCodeAt(2) * 127) % 256,
    ];
  };

  // Emotion to color mapping
  const emotionColors: { [key: string]: [number, number, number] } = {
    happy: [0, 255, 0],
    sad: [0, 0, 255],
    angry: [255, 0, 0],
    surprise: [255, 255, 0],
    fear: [128, 0, 255],
    disgust: [0, 128, 0],
    neutral: [128, 128, 128],
  };

  const getEmotionColor = (emotion: string): [number, number, number] => {
    return emotionColors[emotion.toLowerCase()] || [128, 128, 128];
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const drawDetections = useCallback(
    (canvas: HTMLCanvasElement, detections: Detection[]) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear previous drawings (optional - can leave for effect)
      // ctx.clearRect(0, 0, canvas.width, canvas.height);

      detections.forEach((det) => {
        const { x, y, width, height } = det.bbox;
        const [r, g, b] = getClassColor(det.label);
        const color = `rgb(${r}, ${g}, ${b})`;

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        const label = `${det.label} ${(det.confidence * 100).toFixed(1)}%`;
        const fontSize = 14;
        ctx.font = `${fontSize}px Arial`;
        const textMetrics = ctx.measureText(label);
        const textHeight = fontSize + 4;

        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight - 5, textMetrics.width + 10, textHeight);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 5, y - 5);

        // Draw emotion if available
        if (det.emotion) {
          const emotionLabel = `${det.emotion} ${(
            (det.emotion_confidence || 0) * 100
          ).toFixed(1)}%`;
          const [er, eg, eb] = getEmotionColor(det.emotion);
          const emotionColor = `rgb(${er}, ${eg}, ${eb})`;

          ctx.font = `bold ${fontSize}px Arial`;
          const emotionMetrics = ctx.measureText(emotionLabel);

          ctx.fillStyle = emotionColor;
          ctx.fillRect(
            x,
            y + height + 5,
            emotionMetrics.width + 10,
            textHeight
          );

          ctx.fillStyle = '#ffffff';
          ctx.fillText(emotionLabel, x + 5, y + height + textHeight);
        }
      });
    },
    []
  );

  // Detection loop
  useEffect(() => {
    if (!cameraActive || !canvasRef.current) return;

    setIsDetecting(true);
    const detectionTimer = setInterval(async () => {
      const frameBase64 = captureFrame();
      if (!frameBase64) return;

      // Remove data URL prefix for API
      const base64Data = frameBase64.includes(',')
        ? frameBase64.split(',')[1]
        : frameBase64;

      const newDetections = await detectFrame(base64Data);
      drawDetections(canvasRef.current!, newDetections);

      if (onDetectionsUpdate) {
        onDetectionsUpdate(newDetections);
      }
    }, detectionInterval);

    return () => clearInterval(detectionTimer);
  }, [cameraActive, detectFrame, drawDetections, detectionInterval, onDetectionsUpdate]);

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="relative">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto block"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />

        {/* Canvas overlay for detections */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />

        {/* Error message */}
        {error && (
          <div className="absolute top-4 left-4 bg-red-500 text-white p-3 rounded">
            {error}
          </div>
        )}

        {/* Stats overlay */}
        {showStats && cameraActive && (
          <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded font-mono text-sm">
            <div>FPS: {stats.fps}</div>
            <div>Processing: {stats.processingTime.toFixed(0)}ms</div>
            <div>Detections: {detections.length}</div>
            {includeEmotions && (
              <div>With Emotions: {detections.filter((d) => d.emotion).length}</div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-3">
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className={`px-4 py-2 rounded font-semibold text-white transition ${
              cameraActive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {cameraActive ? 'Stop Camera' : 'Start Camera'}
          </button>

          {includeEmotions && (
            <div className="flex-1 text-right text-white text-sm bg-black/50 px-3 py-2 rounded">
              Facial Emotion Recognition: <span className="text-green-400">ON</span>
            </div>
          )}
        </div>
      </div>

      {/* Detections list */}
      {detections.length > 0 && (
        <div className="p-4 bg-gray-800 text-white text-sm max-h-40 overflow-y-auto">
          <h3 className="font-semibold mb-2">
            Detections ({detections.length}):
          </h3>
          <div className="space-y-1">
            {detections.map((det, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-xs"
              >
                <span>
                  {det.label}
                  {det.emotion && ` - ${det.emotion}`}
                </span>
                <span className="text-gray-400">
                  {(det.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default YOLOVideo;
