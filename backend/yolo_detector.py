"""
YOLO Object Detection Module for Real-time Video Processing

This module provides a clean, modular interface for integrating YOLOv8
object detection into your existing pipeline.

Usage:
    from yolo_detector import YOLODetector
    
    detector = YOLODetector()
    detector.run()  # For webcam
    # OR
    detector.run_video("path/to/video.mp4")  # For video file
"""

import cv2
import time
from ultralytics import YOLO
import numpy as np


class YOLODetector:
    """
    Modular YOLO object detector for real-time video processing.
    
    Attributes:
        model_name (str): YOLO model to use (default: yolov8n.pt for speed)
        confidence_threshold (float): Minimum confidence to display detections
        line_thickness (int): Thickness of bounding box lines
    """
    
    # COCO class names for common object detection
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
    
    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        confidence_threshold: float = 0.25,
        line_thickness: int = 2,
        device: str = "cpu"
    ):
        """
        Initialize the YOLO detector.
        
        Args:
            model_name: Pre-trained YOLO model name (yolov8n.pt, yolov8s.pt, yolov8m.pt, etc.)
            confidence_threshold: Minimum confidence for detections to be shown
            line_thickness: Thickness of bounding box lines
            device: Device to run model on ("cpu" or "cuda")
        """
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.line_thickness = line_thickness
        self.device = device
        
        # Load the YOLO model
        print(f"Loading YOLO model: {model_name}...")
        self.model = YOLO(model_name)
        self.model.to(device)
        print(f"✅ YOLO model loaded on {device}")
        
        # FPS tracking
        self.frame_count = 0
        self.start_time = time.time()
        self.fps = 0
        
    def _draw_detections(self, frame: np.ndarray, results) -> np.ndarray:
        """
        Draw bounding boxes and labels on the frame.
        
        Args:
            frame: Input video frame
            results: YOLO detection results
            
        Returns:
            Frame with drawn detections
        """
        annotated_frame = frame.copy()
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                
                # Get confidence and class
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                
                # Skip low confidence detections
                if conf < self.confidence_threshold:
                    continue
                
                # Get class name
                class_name = self.CLASS_NAMES[cls] if cls < len(self.CLASS_NAMES) else f"class_{cls}"
                
                # Create label with confidence
                label = f"{class_name} {conf:.2f}"
                
                # Generate random color for this class
                color = self._get_color(cls)
                
                # Draw bounding box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, self.line_thickness)
                
                # Draw label background
                (label_width, label_height), baseline = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
                )
                cv2.rectangle(
                    annotated_frame,
                    (x1, y1 - label_height - baseline - 5),
                    (x1 + label_width, y1),
                    color,
                    -1
                )
                
                # Draw label text
                cv2.putText(
                    annotated_frame,
                    label,
                    (x1, y1 - baseline - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1
                )
                
        return annotated_frame
    
    def _get_color(self, class_id: int) -> tuple:
        """
        Generate a consistent color for each class ID.
        
        Args:
            class_id: Object class ID
            
        Returns:
            BGR color tuple
        """
        # Generate consistent colors based on class ID
        np.random.seed(class_id)
        return (
            np.random.randint(50, 255),
            np.random.randint(50, 255),
            np.random.randint(50, 255)
        )
    
    def _update_fps(self) -> float:
        """
        Update and return the current FPS.
        
        Returns:
            Current FPS value
        """
        self.frame_count += 1
        elapsed = time.time() - self.start_time
        
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.start_time = time.time()
            
        return self.fps
    
    def _draw_fps(self, frame: np.ndarray) -> np.ndarray:
        """
        Draw FPS counter on the frame.
        
        Args:
            frame: Input video frame
            
        Returns:
            Frame with FPS display
        """
        fps_text = f"FPS: {self.fps:.1f}"
        
        # Draw background rectangle
        cv2.rectangle(frame, (10, 10), (120, 40), (0, 0, 0), -1)
        
        # Draw FPS text
        cv2.putText(
            frame,
            fps_text,
            (15, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )
        
        return frame
    
    def detect_frame(self, frame: np.ndarray) -> tuple:
        """
        Process a single frame and return detections.
        
        Args:
            frame: Input video frame (numpy array)
            
        Returns:
            Tuple of (annotated_frame, detections_list)
        """
        # Run YOLO detection
        results = self.model(frame, verbose=False)
        
        # Draw detections on frame
        annotated_frame = self._draw_detections(frame, results)
        
        # Update FPS
        self._update_fps()
        annotated_frame = self._draw_fps(annotated_frame)
        
        # Extract detection details
        detections = []
        for result in results:
            for box in result.boxes:
                if box.conf[0] >= self.confidence_threshold:
                    detections.append({
                        'class': self.CLASS_NAMES[int(box.cls[0])] if int(box.cls[0]) < len(self.CLASS_NAMES) else "unknown",
                        'confidence': float(box.conf[0]),
                        'bbox': box.xyxy[0].cpu().numpy().tolist()
                    })
        
        return annotated_frame, detections
    
    def run(self, camera_index: int = 0, window_name: str = "YOLO Object Detection"):
        """
        Run real-time object detection from webcam.
        
        Args:
            camera_index: Index of the camera to use (default: 0 for primary webcam)
            window_name: Name of the display window
        """
        # Open video capture
        cap = cv2.VideoCapture(camera_index)
        
        if not cap.isOpened():
            print(f"❌ Error: Could not open camera {camera_index}")
            return
        
        print(f"📷 Starting camera {camera_index}...")
        print("Press 'q' to quit, 's' to save screenshot")
        
        # Set video resolution for better performance
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        
        try:
            while True:
                # Read frame
                ret, frame = cap.read()
                
                if not ret:
                    print("❌ Error: Failed to read frame")
                    break
                
                # Process frame with YOLO
                annotated_frame, detections = self.detect_frame(frame)
                
                # Display the frame
                cv2.imshow(window_name, annotated_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    # Save screenshot
                    filename = f"screenshot_{int(time.time())}.jpg"
                    cv2.imwrite(filename, annotated_frame)
                    print(f"📸 Screenshot saved: {filename}")
                    
        except KeyboardInterrupt:
            print("\n⚠️ Interrupted by user")
        finally:
            # Cleanup
            cap.release()
            cv2.destroyAllWindows()
            print("✅ Cleanup complete")
    
    def run_video(
        self,
        video_path: str,
        output_path: str = None,
        window_name: str = "YOLO Object Detection",
        show_display: bool = True
    ):
        """
        Run object detection on a video file.
        
        Args:
            video_path: Path to input video file
            output_path: Path to save output video (None to skip saving)
            window_name: Name of the display window
            show_display: Whether to show the video window
        """
        # Open video capture
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"❌ Error: Could not open video: {video_path}")
            return
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"📹 Processing video: {video_path}")
        print(f"   Resolution: {width}x{height}, FPS: {fps}")
        
        # Setup video writer if output path provided
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            print(f"💾 Saving output to: {output_path}")
        
        if show_display:
            cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        
        frame_count = 0
        total_detections = 0
        
        try:
            while True:
                # Read frame
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Process frame with YOLO
                annotated_frame, detections = self.detect_frame(frame)
                
                total_detections += len(detections)
                frame_count += 1
                
                # Print progress every 30 frames
                if frame_count % 30 == 0:
                    print(f"   Processed {frame_count} frames, {total_detections} total detections")
                
                # Write to output video
                if writer:
                    writer.write(annotated_frame)
                
                # Display the frame
                if show_display:
                    cv2.imshow(window_name, annotated_frame)
                    
                    # Handle key press
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                        
        except KeyboardInterrupt:
            print("\n⚠️ Interrupted by user")
        finally:
            # Cleanup
            cap.release()
            if writer:
                writer.release()
            if show_display:
                cv2.destroyAllWindows()
            
            print(f"✅ Video processing complete!")
            print(f"   Total frames: {frame_count}")
            print(f"   Total detections: {total_detections}")
    
    def process_image(self, image_path: str, save_path: str = None) -> list:
        """
        Process a single image file.
        
        Args:
            image_path: Path to input image
            save_path: Path to save annotated image (None to skip saving)
            
        Returns:
            List of detections
        """
        # Read image
        frame = cv2.imread(image_path)
        
        if frame is None:
            print(f"❌ Error: Could not read image: {image_path}")
            return []
        
        # Process with YOLO
        annotated_frame, detections = self.detect_frame(frame)
        
        # Save output if path provided
        if save_path:
            cv2.imwrite(save_path, annotated_frame)
            print(f"💾 Annotated image saved: {save_path}")
        
        # Print detections
        print(f"\n📊 Detections in {image_path}:")
        for i, det in enumerate(detections, 1):
            print(f"   {i}. {det['class']} ({det['confidence']:.2f})")
        
        return detections


# Convenience function for quick testing
def main():
    """Main function for standalone testing."""
    import argparse
    
    parser = argparse.ArgumentParser(description="YOLO Object Detection")
    parser.add_argument("--model", default="yolov8n.pt", help="YOLO model name")
    parser.add_argument("--camera", type=int, default=0, help="Camera index")
    parser.add_argument("--video", help="Path to video file")
    parser.add_argument("--image", help="Path to image file")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    
    args = parser.parse_args()
    
    # Create detector
    detector = YOLODetector(
        model_name=args.model,
        confidence_threshold=args.conf
    )
    
    # Run based on input
    if args.image:
        detector.process_image(args.image, save_path="output.jpg")
    elif args.video:
        detector.run_video(args.video, output_path="output.mp4")
    else:
        detector.run(camera_index=args.camera)


if __name__ == "__main__":
    main()