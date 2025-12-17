import { EyePosition, FaceDetection, Point } from '../types';
import { FaceMesh, Results } from '@mediapipe/face_mesh';

/**
 * EyeDetector class handles eye keypoint detection using MediaPipe Face Mesh
 * Implements requirements 3.1, 3.2, 3.3
 * 
 * MediaPipe Face Mesh provides 468 facial landmarks.
 * Eye landmarks indices:
 * - Left eye: landmarks around indices 33, 133, 159, 145, 362, 263, 386, 374
 * - Right eye: landmarks around indices 362, 263, 386, 374, 33, 133, 159, 145
 * 
 * For pupil center approximation, we use:
 * - Left eye center: average of landmarks 468 (left iris center) or approximate from eye corners
 * - Right eye center: average of landmarks 473 (right iris center) or approximate from eye corners
 */
export class EyeDetector {
  private faceMesh: FaceMesh | null = null;
  private ready: boolean = false;
  private pendingResolve: ((eyePosition: EyePosition | null) => void) | null = null;
  private lastEyePosition: EyePosition | null = null;

  // MediaPipe Face Mesh landmark indices for eyes
  // Left eye landmarks (outer corner, inner corner, top, bottom)
  private readonly LEFT_EYE_INDICES = [33, 133, 159, 145];
  // Right eye landmarks (outer corner, inner corner, top, bottom)
  private readonly RIGHT_EYE_INDICES = [362, 263, 386, 374];

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
          maxNumFaces: 1, // Only process one face for eye detection
          refineLandmarks: true, // Enable for better eye landmark accuracy
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        // Set up results handler
        this.faceMesh.onResults((results: Results) => {
          this.processResults(results);
        });

        this.ready = true;
        resolve();
      } catch (error) {
        reject(new Error(`Failed to load eye detection model: ${error}`));
      }
    });
  }

  /**
   * Process MediaPipe results and extract eye positions
   * @param results - MediaPipe Face Mesh results
   */
  private processResults(results: Results): void {
    let eyePosition: EyePosition | null = null;

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      // Use the first face (we only process one face)
      const landmarks = results.multiFaceLandmarks[0];
      const width = results.image.width;
      const height = results.image.height;

      // Calculate left eye center
      const leftEyeCenter = this.calculateEyeCenter(
        landmarks,
        this.LEFT_EYE_INDICES,
        width,
        height
      );

      // Calculate right eye center
      const rightEyeCenter = this.calculateEyeCenter(
        landmarks,
        this.RIGHT_EYE_INDICES,
        width,
        height
      );

      eyePosition = {
        left: leftEyeCenter,
        right: rightEyeCenter,
        confidence: 0.9 // MediaPipe doesn't provide per-landmark confidence, use default
      };

      this.lastEyePosition = eyePosition;
    }

    // Resolve pending promise
    if (this.pendingResolve) {
      this.pendingResolve(eyePosition);
      this.pendingResolve = null;
    }
  }

  /**
   * Calculate eye center from landmarks
   * @param landmarks - All face landmarks
   * @param eyeIndices - Indices of eye landmarks
   * @param width - Image width
   * @param height - Image height
   * @returns Eye center point in pixel coordinates
   */
  private calculateEyeCenter(
    landmarks: Array<{ x: number; y: number; z?: number }>,
    eyeIndices: number[],
    width: number,
    height: number
  ): Point {
    let sumX = 0;
    let sumY = 0;

    for (const index of eyeIndices) {
      const landmark = landmarks[index];
      sumX += landmark.x * width;
      sumY += landmark.y * height;
    }

    return {
      x: sumX / eyeIndices.length,
      y: sumY / eyeIndices.length
    };
  }

  /**
   * Detect eye positions in the provided image data
   * Implements requirements 3.1, 3.2, 3.3
   * @param imageData - The image data to process
   * @param faceBox - The detected face bounding box (optional, for optimization)
   * @returns Promise resolving to eye positions or null if not detected
   */
  async detectEyes(
    imageData: ImageData,
    faceBox?: FaceDetection
  ): Promise<EyePosition | null> {
    if (!this.ready || !this.faceMesh) {
      throw new Error('Eye detector not initialized. Call loadModel() first.');
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
          reject(new Error(`Eye detection failed: ${error}`));
        });
      } catch (error) {
        reject(new Error(`Eye detection failed: ${error}`));
      }
    });
  }

  /**
   * Get the last detected eye position
   * Useful for continuous tracking (requirement 3.3)
   * @returns Last detected eye position or null
   */
  getLastEyePosition(): EyePosition | null {
    return this.lastEyePosition;
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
    this.lastEyePosition = null;
  }
}
