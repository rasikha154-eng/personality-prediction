/**
 * YOLO Video Detection Component
 * 
 * Displays webcam video with real-time object detection overlay
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useYOLODetector, Detection } from '@/hooks/useYOLODetector';

interface YOLOVideoProps {
  isActive: boolean;
  onDetection?: (detections: Detection[]) => void;
  detectionInterval?: number;
  showStats?: boolean;
  showOverlay?: boolean;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

function getColorForClass(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function YOLOVideo({
  isActive,
  onDetection,
  detectionInterval = 300,
  showStats = true,
  showOverlay = true,
}: YOLOVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { isProcessing, detections, stats, error, detectFrame, clearDetections } = useYOLODetector();

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
        setCameraError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setCameraError(message);
      console.error('Camera error:', err);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  // Capture frame as base64
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return as base64
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Draw detections on canvas
  const drawDetections = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!showOverlay || detections.length === 0) return;

    detections.forEach(detection => {
      const { label, confidence, bbox } = detection;
      const color = getColorForClass(label);

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

      // Draw label background
      const labelText = `${label} ${(confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const padding = 6;
      const labelHeight = 20;

      ctx.fillStyle = color;
      ctx.fillRect(bbox.x, bbox.y - labelHeight - padding, textMetrics.width + padding * 2, labelHeight + padding);

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labelText, bbox.x + padding, bbox.y - padding);
    });
  }, [detections, showOverlay]);

  // Process frames
  const processFrame = useCallback(async () => {
    if (!isCameraReady || isProcessing) return;

    const frameBase64 = captureFrame();
    if (!frameBase64) return;

    // Remove data URL prefix for API
    const base64Data = frameBase64.split(',')[1];
    
    const newDetections = await detectFrame(base64Data);
    
    if (onDetection && newDetections.length > 0) {
      onDetection(newDetections);
    }
  }, [isCameraReady, isProcessing, captureFrame, detectFrame, onDetection]);

  // Render overlay
  const renderOverlay = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !showOverlay) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Sync canvas size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detections
    drawDetections(ctx, canvas.width, canvas.height);
  }, [drawDetections, showOverlay]);

  // Start/stop camera based on isActive
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
      clearDetections();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera, clearDetections]);

  // Detection loop
  useEffect(() => {
    if (isActive && isCameraReady) {
      intervalRef.current = setInterval(() => {
        processFrame();
      }, detectionInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isCameraReady, detectionInterval, processFrame]);

  // Render overlay when detections change
  useEffect(() => {
    if (isCameraReady) {
      renderOverlay();
    }
  }, [detections, isCameraReady, renderOverlay]);

  // Handle camera error
  if (cameraError) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-gray-100 rounded-lg">
        <div className="text-center text-red-500">
          <p className="font-semibold">Camera Error</p>
          <p className="text-sm">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-auto"
        playsInline
        muted
        style={{ display: isCameraReady ? 'block' : 'none' }}
      />

      {/* Overlay canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ display: isCameraReady ? 'block' : 'none' }}
      />

      {/* Loading state */}
      {!isCameraReady && isActive && (
        <div className="flex items-center justify-center h-64 bg-gray-900">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
            <p>Starting camera...</p>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {showStats && isCameraReady && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-2 rounded-md text-sm">
          <div className="flex gap-4">
            <span>FPS: {stats.fps}</span>
            <span>Objects: {detections.length}</span>
            <span className={isProcessing ? 'text-yellow-400' : 'text-green-400'}>
              {isProcessing ? 'Processing...' : 'Ready'}
            </span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-2 left-2 bg-red-500/80 text-white px-3 py-2 rounded-md text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}