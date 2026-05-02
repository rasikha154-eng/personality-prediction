import { useState, useRef, useCallback } from 'react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface YOLOStats {
  fps: number;
  processingTime: number;
  lastDetectionTime: number;
}

interface UseYOLODetectorOptions {
  apiUrl?: string;
  detectionInterval?: number;
  onDetection?: (detections: Detection[]) => void;
}

export function useYOLODetector({
  apiUrl = 'http://localhost:8001',
  detectionInterval = 300,
  onDetection,
}: UseYOLODetectorOptions = {}) {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<YOLOStats>({
    fps: 0,
    processingTime: 0,
    lastDetectionTime: 0,
  });

  const isProcessingRef = useRef(false);
  const lastFrameTime = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);

  const detectFrame = useCallback(async (base64Data: string): Promise<Detection[]> => {
    if (isProcessingRef.current) return [];
    isProcessingRef.current = true;

    try {
      const formData = new FormData();
      formData.append("image", base64Data);

      // ✅ Sirf /detect — sahi endpoint
      const response = await fetch(`${apiUrl}/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error('YOLO API error:', response.status);
        return [];
      }

      const data = await response.json();
      const newDetections: Detection[] = data.detections || [];

      // FPS calculate karo
      const now = performance.now();
      frameTimesRef.current.push(now);
      if (frameTimesRef.current.length > 10) frameTimesRef.current.shift();

      let fps = 0;
      if (frameTimesRef.current.length >= 2) {
        const timeDiff = frameTimesRef.current[frameTimesRef.current.length - 1] - frameTimesRef.current[0];
        fps = ((frameTimesRef.current.length - 1) / timeDiff) * 1000;
      }

      setDetections(newDetections);
      setStats({
        fps: Math.round(fps),
        processingTime: data.processing_time_ms || 0,
        lastDetectionTime: now,
      });

      onDetection?.(newDetections);
      return newDetections;

    } catch (err) {
      console.error('YOLO fetch error:', err);
      setError('YOLO API unreachable');
      return [];
    } finally {
      isProcessingRef.current = false;
    }
  }, [apiUrl, onDetection]);

  const startDetection = useCallback(() => setIsRunning(true), []);

  const stopDetection = useCallback(() => {
    setIsRunning(false);
    setDetections([]);
    frameTimesRef.current = [];
  }, []);

  const clearDetections = useCallback(() => {
    setDetections([]);
    frameTimesRef.current = [];
  }, []);

  return {
    detections,
    isRunning,
    error,
    stats,
    detectFrame,
    startDetection,
    stopDetection,
    clearDetections,
  };
}