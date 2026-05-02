"""
YOLO Object Detection FastAPI Backend with Facial Emotion Recognition

Requirements:
    pip install fastapi uvicorn python-multipart opencv-python ultralytics numpy keras pillow

Run:
    uvicorn yolo_api:app --host 0.0.0.0 --port 8001 --reload
"""

import base64
import io
import time
import os
import sys
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from typing import List, Optional

# Add backend to path to import facetest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import facial_emotion
    FACIAL_EMOTION_AVAILABLE = True
    print("✅ Facial emotion detection available")
except Exception as e:
    print(f"⚠️ Facial emotion model not available: {e}")
    FACIAL_EMOTION_AVAILABLE = False


# Initialize FastAPI app
app = FastAPI(title="YOLO Object Detection API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load YOLO model
print("Loading YOLO model...")
MODEL = YOLO("yolov8n.pt")
print("✅ YOLO model loaded")


# Response models
class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class Detection(BaseModel):
    label: str
    confidence: float
    bbox: BoundingBox


class EmotionDetection(BaseModel):
    label: str
    confidence: float
    bbox: BoundingBox
    emotion: Optional[str] = None
    emotion_confidence: Optional[float] = None
    emotion_scores: Optional[dict] = None


class DetectionResponse(BaseModel):
    detections: List[Detection]
    processing_time_ms: float
    model: str


class EmotionDetectionResponse(BaseModel):
    detections: List[EmotionDetection]
    processing_time_ms: float
    model: str
    facial_model: Optional[str] = None


# COCO class names
CLASS_NAMES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
    'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
    'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
    'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
]


def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decode base64 image string to numpy array."""
    # Remove data URL prefix if present
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    
    # Decode base64
    img_bytes = base64.b64decode(base64_str)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    
    # Decode image
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    return img


def encode_image_to_base64(img: np.ndarray) -> str:
    """Encode numpy array to base64 string."""
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')


def detect_emotion_in_face_region(img: np.ndarray, x: int, y: int, w: int, h: int) -> dict:
    """
    Detect emotion in a face region using the facial emotion model.
    
    Args:
        img: Full image
        x, y, w, h: Face bounding box coordinates and dimensions
    
    Returns:
        Dictionary with emotion, confidence, and scores
    """
    if not FACIAL_EMOTION_AVAILABLE:
        return None
    
    try:
        result = facial_emotion.detect_emotion_in_region(img, x, y, w, h)
        return result
        
    except Exception as e:
        print(f"Error detecting emotion: {e}")
        return None


@app.post("/detect-with-emotions", response_model=EmotionDetectionResponse)
async def detect_with_emotions(image: str = File(description="Base64 encoded image")):
    """
    Detect objects with YOLO and facial emotions using emotion model.
    Specifically designed for person detection with facial emotion recognition.
    
    Args:
        image: Base64 encoded image
    
    Returns:
        List of detections with emotions (for "person" class)
    """
    start_time = time.time()
    
    try:
        # Decode image
        img = decode_base64_image(image)
        
        if img is None:
            return EmotionDetectionResponse(
                detections=[],
                processing_time_ms=0,
                model="yolov8n.pt",
                facial_model="_mini_XCEPTION.102-0.66" if FACIAL_EMOTION_AVAILABLE else None
            )
        
        # Run YOLO detection
        results = MODEL(img, verbose=False)
        
        # Parse results
        detections = []
        
        for result in results:
            for box in result.boxes:
                conf = float(box.conf[0])
                
                # Filter by confidence threshold
                if conf < 0.25:
                    continue
                
                # Get class and bbox
                cls = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Convert to x, y, width, height format
                x, y = int(x1), int(y1)
                width, height = int(x2 - x1), int(y2 - y1)
                
                # Get class name
                label = CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else f"class_{cls}"
                
                # If it's a person, try to detect emotion
                emotion_data = None
                if label == "person" and FACIAL_EMOTION_AVAILABLE:
                    emotion_data = detect_emotion_in_face_region(img, x, y, width, height)
                
                detection = EmotionDetection(
                    label=label,
                    confidence=conf,
                    bbox=BoundingBox(x=x, y=y, width=width, height=height)
                )
                
                if emotion_data:
                    detection.emotion = emotion_data.get("emotion")
                    detection.emotion_confidence = emotion_data.get("emotion_confidence")
                    detection.emotion_scores = emotion_data.get("emotion_scores")
                
                detections.append(detection)
        
        processing_time = (time.time() - start_time) * 1000
        
        return EmotionDetectionResponse(
            detections=detections,
            processing_time_ms=round(processing_time, 2),
            model="yolov8n.pt",
            facial_model="_mini_XCEPTION.102-0.66" if FACIAL_EMOTION_AVAILABLE else None
        )
        
    except Exception as e:
        print(f"Error processing frame with emotions: {e}")
        import traceback
        traceback.print_exc()
        return EmotionDetectionResponse(
            detections=[],
            processing_time_ms=0,
            model="yolov8n.pt",
            facial_model="_mini_XCEPTION.102-0.66" if FACIAL_EMOTION_AVAILABLE else None
        )



@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": "yolov8n.pt",
        "facial_model": "_mini_XCEPTION.102-0.66" if FACIAL_EMOTION_AVAILABLE else None,
        "endpoints": [
            "/detect - YOLO object detection only",
            "/detect-with-annotated - YOLO with visual annotations",
            "/detect-with-emotions - YOLO + facial emotion recognition"
        ]
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(image: str = File(description="Base64 encoded image")):
    """
    Detect objects in an image frame.
    
    Args:
        image: Base64 encoded image (with or without data URL prefix)
    
    Returns:
        List of detections with label, confidence, and bounding box
    """
    start_time = time.time()
    
    try:
        # Decode image
        img = decode_base64_image(image)
        
        if img is None:
            return DetectionResponse(
                detections=[],
                processing_time_ms=0,
                model="yolov8n.pt"
            )
        
        # Run YOLO detection
        results = MODEL(img, verbose=False)
        
        # Parse results
        detections = []
        
        for result in results:
            for box in result.boxes:
                conf = float(box.conf[0])
                
                # Filter by confidence threshold
                if conf < 0.25:
                    continue
                
                # Get class and bbox
                cls = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                
                # Convert to x, y, width, height format
                x, y = int(x1), int(y1)
                width, height = int(x2 - x1), int(y2 - y1)
                
                # Get class name
                label = CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else f"class_{cls}"
                
                detections.append(Detection(
                    label=label,
                    confidence=conf,
                    bbox=BoundingBox(x=x, y=y, width=width, height=height)
                ))
        
        processing_time = (time.time() - start_time) * 1000
        
        return DetectionResponse(
            detections=detections,
            processing_time_ms=round(processing_time, 2),
            model="yolov8n.pt"
        )
        
    except Exception as e:
        print(f"Error processing frame: {e}")
        return DetectionResponse(
            detections=[],
            processing_time_ms=0,
            model="yolov8n.pt"
        )


@app.post("/detect-with-annotated")
async def detect_with_annotated(image: str = File(description="Base64 encoded image")):
    """
    Detect objects and return annotated image along with detections.
    
    Returns both the detections and the annotated image for drawing on frontend.
    """
    start_time = time.time()
    
    try:
        # Decode image
        img = decode_base64_image(image)
        
        if img is None:
            return {"error": "Failed to decode image"}
        
        # Run YOLO detection
        results = MODEL(img, verbose=False)
        
        # Parse results and draw annotations
        detections = []
        annotated_img = img.copy()
        
        colors = {}  # Cache colors per class
        
        for result in results:
            for box in result.boxes:
                conf = float(box.conf[0])
                
                if conf < 0.25:
                    continue
                
                cls = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                x, y, w, h = int(x1), int(y1), int(x2 - x1), int(y2 - y1)
                
                label = CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else f"class_{cls}"
                
                # Get or create color for this class
                if cls not in colors:
                    np.random.seed(cls)
                    colors[cls] = (
                        np.random.randint(50, 255),
                        np.random.randint(50, 255),
                        np.random.randint(50, 255)
                    )
                color = colors[cls]
                
                # Draw bounding box
                cv2.rectangle(annotated_img, (x, y), (x + w, y + h), color, 2)
                
                # Draw label
                label_text = f"{label} {conf:.2f}"
                (text_width, text_height), baseline = cv2.getTextSize(
                    label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
                )
                
                # Label background
                cv2.rectangle(
                    annotated_img,
                    (x, y - text_height - baseline - 5),
                    (x + text_width, y),
                    color,
                    -1
                )
                
                # Label text
                cv2.putText(
                    annotated_img,
                    label_text,
                    (x, y - baseline - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1
                )
                
                detections.append(Detection(
                    label=label,
                    confidence=conf,
                    bbox=BoundingBox(x=x, y=y, width=w, height=h)
                ))
        
        processing_time = (time.time() - start_time) * 1000
        
        # Encode annotated image
        annotated_base64 = encode_image_to_base64(annotated_img)
        
        return {
            "detections": detections,
            "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
            "processing_time_ms": round(processing_time, 2),
            "model": "yolov8n.pt"
        }
        
    except Exception as e:
        print(f"Error processing frame: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)