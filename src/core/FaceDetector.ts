import { FaceDetection } from '../types';
import { FaceMesh, Results } from '@mediapipe/face_mesh';

/**
 * FaceDetector class handles face detection using MediaPipe Face Mesh
 * Implements requirements 2.1, 2.2, 2.4
 */
export class FaceDetector {
  private faceMesh: FaceMesh | null = null;
  private ready: boolean = false;
  private lastDetections: FaceDetection[] = [];
  private pendingResolve: ((detections: FaceDetection[]) => void) | null = null;

  constructor() {}

  /**
   * Load and initialize the MediaPipe Face Mesh model
   * @returns Promise that resolves when model is loaded
   */
  async loadModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.faceMesh = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        });

        this.faceMesh.setOptions({
          maxNumFaces: 5, // Allow detection of multiple faces
          refineLandmarks: false, // Disable for better performance
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        // Set up results handler
        this.faceMesh.onResults((results: Results) => {
          this.processResults(results);
        });

        this.ready = true;
        resolve();
      } catch (error) {
        reject(new Error(`Failed to load face detection model: ${error}`));
      }
    });
  }

  /**
   * Process MediaPipe results
   * @param results - MediaPipe Face Mesh results
   */
  private processResults(results: Results): void {
    const detections: FaceDetection[] = [];

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      for (let i = 0; i < results.multiFaceLandmarks.length; i++) {
        const landmarks = results.multiFaceLandmarks[i];
        
        // Calculate bounding box from landmarks
        const boundingBox = this.calculateBoundingBox(
          landmarks, 
          results.image.width, 
          results.image.height
        );
        
        detections.push({
          boundingBox,
          confidence: 0.9 // MediaPipe doesn't provide per-face confidence, use default
        });
      }
    }

    this.lastDetections = detections;
    
    // Resolve pending promise
    if (this.pendingResolve) {
      this.pendingResolve(detections);
      this.pendingResolve = null;
    }
  }

  /**
   * Detect faces in the provided image data
   * @param imageData - The image data to process
   * @returns Promise resolving to array of face detections
   */
  async detect(imageData: ImageData): Promise<FaceDetection[]> {
    if (!this.ready || !this.faceMesh) {
      throw new Error('Face detector not initialized. Call loadModel() first.');
    }

    return new Promise((resolve, reject) => {
      try {
        // Store resolve function
        this.pendingResolve = resolve;

        // Create a canvas from ImageData
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.putImageData(imageData, 0, 0);

        // Send to MediaPipe
        this.faceMesh!.send({ image: canvas }).catch((error) => {
          reject(new Error(`Face detection failed: ${error}`));
        });
      } catch (error) {
        reject(new Error(`Face detection failed: ${error}`));
      }
    });
  }

  /**
   * Calculate bounding box from face landmarks
   * @param landmarks - Array of face landmarks
   * @param width - Image width
   * @param height - Image height
   * @returns Bounding box coordinates
   */
  private calculateBoundingBox(
    landmarks: Array<{ x: number; y: number; z?: number }>,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const landmark of landmarks) {
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Select the best face from multiple detections
   * Prioritizes the largest face (closest to camera) or most centered face
   * Implements requirement 2.4
   * @param detections - Array of face detections
   * @param imageWidth - Width of the image
   * @param imageHeight - Height of the image
   * @returns The selected face detection or null if no faces
   */
  selectBestFace(
    detections: FaceDetection[],
    imageWidth: number,
    imageHeight: number
  ): FaceDetection | null {
    if (detections.length === 0) {
      return null;
    }

    if (detections.length === 1) {
      return detections[0];
    }

    // Calculate score for each face based on size and position
    const imageCenterX = imageWidth / 2;
    const imageCenterY = imageHeight / 2;

    const scoredFaces = detections.map(face => {
      const faceArea = face.boundingBox.width * face.boundingBox.height;
      const faceCenterX = face.boundingBox.x + face.boundingBox.width / 2;
      const faceCenterY = face.boundingBox.y + face.boundingBox.height / 2;
      
      // Distance from image center (normalized)
      const distanceFromCenter = Math.sqrt(
        Math.pow((faceCenterX - imageCenterX) / imageWidth, 2) +
        Math.pow((faceCenterY - imageCenterY) / imageHeight, 2)
      );

      // Score: 70% weight on size, 30% weight on centrality
      const sizeScore = faceArea / (imageWidth * imageHeight);
      const centralityScore = 1 - distanceFromCenter;
      const totalScore = (sizeScore * 0.7) + (centralityScore * 0.3);

      return {
        face,
        score: totalScore
      };
    });

    // Sort by score descending and return the best one
    scoredFaces.sort((a, b) => b.score - a.score);
    return scoredFaces[0].face;
  }

  /**
   * Check if the model is ready for detection
   * @returns true if model is loaded and ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.ready = false;
    this.lastDetections = [];
  }
}
