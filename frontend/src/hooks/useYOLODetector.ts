/**
 * YOLO Object Detection Hook
 * 
 * Handles real-time object detection using YOLOv8 backend
 */

import { useState, useRef, useCallback, useEffect } from 'react';

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

const API_URL = 'http://localhost:8001';

export function useYOLODetector() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<YOLOStats>({
    fps: 0,
    processingTime: 0,
    lastDetectionTime: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // FPS tracking
  const frameTimesRef = useRef<number[]>([]);
  const lastProcessTimeRef = useRef(0);

  const detectFrame = useCallback(async (imageBase64: string): Promise<Detection[]> => {
    const now = performance.now();
    
    // Throttle requests to avoid overwhelming the backend
    if (now - lastProcessTimeRef.current < 200) {
      return detections;
    }
    
    lastProcessTimeRef.current = now;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update FPS
      const currentTime = performance.now();
      frameTimesRef.current.push(currentTime);
      
      // Keep only last 10 frame times for FPS calculation
      if (frameTimesRef.current.length > 10) {
        frameTimesRef.current.shift();
      }
      
      // Calculate FPS
      let fps = 0;
      if (frameTimesRef.current.length >= 2) {
        const timeDiff = frameTimesRef.current[frameTimesRef.current.length - 1] - 
                        frameTimesRef.current[0];
        fps = ((frameTimesRef.current.length - 1) / timeDiff) * 1000;
      }

      setStats({
        fps: Math.round(fps),
        processingTime: data.processing_time_ms || 0,
        lastDetectionTime: currentTime,
      });

      setDetections(data.detections || []);
      return data.detections || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Detection failed';
      setError(errorMessage);
      console.error('YOLO detection error:', err);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [detections]);

  const clearDetections = useCallback(() => {
    setDetections([]);
    frameTimesRef.current = [];
  }, []);

  return {
    isProcessing,
    detections,
    stats,
    error,
    detectFrame,
    clearDetections,
  };
}