"""
YOLO Integration Example

This module demonstrates how to integrate YOLO object detection
into your existing personality prediction pipeline.
"""

from yolo_detector import YOLODetector
import cv2


class MultimodalPersonalityPipeline:
    """
    Example integration of YOLO with your existing pipeline.
    
    This shows how YOLO can be used alongside your existing
    face detection, voice analysis, and text analysis modules.
    """
    
    def __init__(self):
        # Initialize YOLO detector
        self.yolo_detector = YOLODetector(
            model_name="yolov8n.pt",  # Use nano model for speed
            confidence_threshold=0.25
        )
        
        # Pipeline state
        self.is_running = False
        self.frame_count = 0
        
    def process_video_frame(self, frame):
        """
        Process a single video frame with all detection modules.
        
        Args:
            frame: Video frame from camera
            
        Returns:
            Dictionary with results from all detection modules
        """
        results = {
            'frame_number': self.frame_count,
            'yolo_detections': [],
            'face_detections': [],
            'person_present': False
        }
        
        # Run YOLO detection
        annotated_frame, yolo_detections = self.yolo_detector.detect_frame(frame)
        
        results['yolo_detections'] = yolo_detections
        
        # Check if person is in frame (useful for personality analysis)
        for det in yolo_detections:
            if det['class'] == 'person':
                results['person_present'] = True
                results['person_confidence'] = det['confidence']
                results['person_bbox'] = det['bbox']
                break
        
        # Here you would integrate with your existing:
        # - Face detection (from personality_app)
        # - Voice analysis (from voice_model.py)
        # - Text analysis (from text_model.py)
        
        self.frame_count += 1
        
        return annotated_frame, results
    
    def run_realtime(self, camera_index: int = 0):
        """
        Run the complete pipeline in real-time.
        
        Args:
            camera_index: Camera to use
        """
        self.is_running = True
        
        cap = cv2.VideoCapture(camera_index)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        print("🎯 Starting Multimodal Personality Pipeline with YOLO...")
        print("Press 'q' to quit")
        
        while self.is_running:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            annotated_frame, results = self.process_video_frame(frame)
            
            # Display
            cv2.imshow("Multimodal Pipeline", annotated_frame)
            
            # Print person detection status
            if results['person_present']:
                print(f"Frame {self.frame_count}: Person detected "
                      f"(confidence: {results.get('person_confidence', 0):.2f})")
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        print("✅ Pipeline stopped")


# Example usage
if __name__ == "__main__":
    # Option 1: Run standalone YOLO detection
    # from yolo_detector import YOLODetector
    # detector = YOLODetector()
    # detector.run()  # Webcam
    
    # Option 2: Run with video file
    # detector = YOLODetector()
    # detector.run_video("input.mp4", output_path="output.mp4")
    
    # Option 3: Integrate with pipeline
    pipeline = MultimodalPersonalityPipeline()
    pipeline.run_realtime()