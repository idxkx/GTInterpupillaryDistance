import { FaceDetector } from '../../src/core/FaceDetector';
import { FaceDetection } from '../../src/types';
import * as fc from 'fast-check';

describe('FaceDetector', () => {
  let detector: FaceDetector;

  beforeEach(() => {
    detector = new FaceDetector();
  });

  afterEach(() => {
    detector.dispose();
  });

  describe('Unit Tests', () => {
    test('should initialize correctly', () => {
      expect(detector).toBeDefined();
      expect(detector.isReady()).toBe(false);
    });

    test('should throw error when detecting before model is loaded', async () => {
      const imageData = new ImageData(640, 480);
      await expect(detector.detect(imageData)).rejects.toThrow(
        'Face detector not initialized'
      );
    });

    test('selectBestFace should return null for empty array', () => {
      const result = detector.selectBestFace([], 640, 480);
      expect(result).toBeNull();
    });

    test('selectBestFace should return the only face when array has one element', () => {
      const face: FaceDetection = {
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
        confidence: 0.9
      };
      const result = detector.selectBestFace([face], 640, 480);
      expect(result).toBe(face);
    });

    test('selectBestFace should select larger face when multiple faces present', () => {
      const smallFace: FaceDetection = {
        boundingBox: { x: 100, y: 100, width: 100, height: 100 },
        confidence: 0.9
      };
      const largeFace: FaceDetection = {
        boundingBox: { x: 200, y: 200, width: 300, height: 300 },
        confidence: 0.9
      };
      const result = detector.selectBestFace([smallFace, largeFace], 640, 480);
      expect(result).toBe(largeFace);
    });

    test('selectBestFace should prefer centered face when sizes are similar', () => {
      const offCenterFace: FaceDetection = {
        boundingBox: { x: 10, y: 10, width: 150, height: 150 },
        confidence: 0.9
      };
      const centeredFace: FaceDetection = {
        boundingBox: { x: 245, y: 165, width: 150, height: 150 }, // Centered in 640x480
        confidence: 0.9
      };
      const result = detector.selectBestFace([offCenterFace, centeredFace], 640, 480);
      expect(result).toBe(centeredFace);
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: pupillary-distance-measurement, Property 2: 持续跟踪一致性
    test('Property 2: Continuous tracking consistency - faces in consecutive frames should be detected', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of frames with faces
          fc.array(
            fc.record({
              hasFace: fc.constant(true), // All frames have a face
              boundingBox: fc.record({
                x: fc.integer({ min: 0, max: 440 }),
                y: fc.integer({ min: 0, max: 280 }),
                width: fc.integer({ min: 100, max: 200 }),
                height: fc.integer({ min: 100, max: 200 })
              }),
              confidence: fc.float({ min: Math.fround(0.7), max: Math.fround(1.0) })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (frames) => {
            // Simulate continuous detection
            // For each frame with a face, selectBestFace should return a face
            const imageWidth = 640;
            const imageHeight = 480;

            let allFramesDetected = true;

            for (const frame of frames) {
              if (frame.hasFace) {
                const detection: FaceDetection = {
                  boundingBox: frame.boundingBox,
                  confidence: frame.confidence
                };
                
                const result = detector.selectBestFace([detection], imageWidth, imageHeight);
                
                // If face is present in frame, it should be detected
                if (result === null) {
                  allFramesDetected = false;
                  break;
                }
              }
            }

            return allFramesDetected;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: pupillary-distance-measurement, Property 3: 多人脸选择一致性
    test('Property 3: Multi-face selection consistency - largest or most centered face should be selected', () => {
      fc.assert(
        fc.property(
          // Generate multiple faces in a frame
          fc.array(
            fc.record({
              boundingBox: fc.record({
                x: fc.integer({ min: 0, max: 540 }),
                y: fc.integer({ min: 0, max: 380 }),
                width: fc.integer({ min: 50, max: 300 }),
                height: fc.integer({ min: 50, max: 300 })
              }),
              confidence: fc.float({ min: Math.fround(0.7), max: Math.fround(1.0) })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (faces) => {
            const imageWidth = 640;
            const imageHeight = 480;
            const imageCenterX = imageWidth / 2;
            const imageCenterY = imageHeight / 2;

            const detections: FaceDetection[] = faces.map(f => ({
              boundingBox: f.boundingBox,
              confidence: f.confidence
            }));

            const selected = detector.selectBestFace(detections, imageWidth, imageHeight);

            if (selected === null) {
              return false; // Should always select a face when faces are present
            }

            // Calculate the expected best face manually
            const scoredFaces = detections.map(face => {
              const faceArea = face.boundingBox.width * face.boundingBox.height;
              const faceCenterX = face.boundingBox.x + face.boundingBox.width / 2;
              const faceCenterY = face.boundingBox.y + face.boundingBox.height / 2;
              
              const distanceFromCenter = Math.sqrt(
                Math.pow((faceCenterX - imageCenterX) / imageWidth, 2) +
                Math.pow((faceCenterY - imageCenterY) / imageHeight, 2)
              );

              const sizeScore = faceArea / (imageWidth * imageHeight);
              const centralityScore = 1 - distanceFromCenter;
              const totalScore = (sizeScore * 0.7) + (centralityScore * 0.3);

              return { face, score: totalScore };
            });

            scoredFaces.sort((a, b) => b.score - a.score);
            const expectedBest = scoredFaces[0].face;

            // The selected face should match the expected best face
            return (
              selected.boundingBox.x === expectedBest.boundingBox.x &&
              selected.boundingBox.y === expectedBest.boundingBox.y &&
              selected.boundingBox.width === expectedBest.boundingBox.width &&
              selected.boundingBox.height === expectedBest.boundingBox.height
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
