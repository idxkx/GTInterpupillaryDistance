/**
 * Unit tests for FrameProcessor
 * Tests frame extraction, format conversion, and FPS calculation
 */

import { FrameProcessor } from '../../src/core/FrameProcessor';

describe('FrameProcessor', () => {
  let frameProcessor: FrameProcessor;

  beforeEach(() => {
    frameProcessor = new FrameProcessor();
  });

  afterEach(() => {
    frameProcessor.dispose();
  });

  describe('captureFrame', () => {
    it('should extract frame from video element', () => {
      // Create a mock video element
      const videoElement = document.createElement('video');
      videoElement.width = 640;
      videoElement.height = 480;

      // Mock video properties
      Object.defineProperty(videoElement, 'videoWidth', {
        value: 640,
        writable: true
      });
      Object.defineProperty(videoElement, 'videoHeight', {
        value: 480,
        writable: true
      });
      Object.defineProperty(videoElement, 'readyState', {
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
        writable: true
      });

      // Create a canvas to simulate video content
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 640, 480);

      // Mock drawImage to simulate frame capture
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = jest.fn();

      const imageData = frameProcessor.captureFrame(videoElement);

      expect(imageData).toBeDefined();
      expect(imageData.width).toBe(640);
      expect(imageData.height).toBe(480);
      expect(imageData.data).toBeInstanceOf(Uint8ClampedArray);

      // Restore original method
      CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    });

    it('should throw error if video is not ready', () => {
      const videoElement = document.createElement('video');
      Object.defineProperty(videoElement, 'readyState', {
        value: HTMLMediaElement.HAVE_NOTHING,
        writable: true
      });

      expect(() => frameProcessor.captureFrame(videoElement)).toThrow('Video element is not ready');
    });

    it('should throw error if video dimensions are invalid', () => {
      const videoElement = document.createElement('video');
      Object.defineProperty(videoElement, 'videoWidth', {
        value: 0,
        writable: true
      });
      Object.defineProperty(videoElement, 'videoHeight', {
        value: 0,
        writable: true
      });
      Object.defineProperty(videoElement, 'readyState', {
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
        writable: true
      });

      expect(() => frameProcessor.captureFrame(videoElement)).toThrow('Video dimensions are invalid');
    });
  });

  describe('toCanvas', () => {
    it('should convert ImageData to Canvas', () => {
      // Create test ImageData
      const width = 100;
      const height = 100;
      const imageData = new ImageData(width, height);

      // Fill with red color
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;     // R
        imageData.data[i + 1] = 0;   // G
        imageData.data[i + 2] = 0;   // B
        imageData.data[i + 3] = 255; // A
      }

      const canvas = frameProcessor.toCanvas(imageData);

      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBe(width);
      expect(canvas.height).toBe(height);

      // Verify the canvas has a 2D context
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeTruthy();
    });

    it('should preserve image dimensions', () => {
      const imageData = new ImageData(320, 240);
      const canvas = frameProcessor.toCanvas(imageData);

      expect(canvas.width).toBe(320);
      expect(canvas.height).toBe(240);
    });
  });

  describe('toTensor', () => {
    it('should convert ImageData to tensor format', () => {
      const width = 100;
      const height = 100;
      const imageData = new ImageData(width, height);

      const tensorData = frameProcessor.toTensor(imageData);

      expect(tensorData).toBeDefined();
      expect(tensorData.data).toBeInstanceOf(Uint8ClampedArray);
      expect(tensorData.shape).toEqual([height, width, 4]); // RGBA
      expect(tensorData.data.length).toBe(width * height * 4);
    });

    it('should maintain data integrity', () => {
      const imageData = new ImageData(2, 2);
      // Set specific pixel values
      imageData.data[0] = 255; // First pixel R
      imageData.data[1] = 128; // First pixel G
      imageData.data[2] = 64;  // First pixel B
      imageData.data[3] = 255; // First pixel A

      const tensorData = frameProcessor.toTensor(imageData);

      expect(tensorData.data[0]).toBe(255);
      expect(tensorData.data[1]).toBe(128);
      expect(tensorData.data[2]).toBe(64);
      expect(tensorData.data[3]).toBe(255);
    });
  });

  describe('getFPS', () => {
    it('should return 0 when no frames captured', () => {
      expect(frameProcessor.getFPS()).toBe(0);
    });

    it('should return 0 when only one frame captured', () => {
      const videoElement = createMockVideoElement();
      
      // Mock drawImage
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = jest.fn();

      frameProcessor.captureFrame(videoElement);
      expect(frameProcessor.getFPS()).toBe(0);

      CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    });

    it('should calculate FPS based on frame timestamps', async () => {
      const videoElement = createMockVideoElement();
      
      // Mock drawImage
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = jest.fn();

      // Capture frames with known intervals
      frameProcessor.captureFrame(videoElement);
      await sleep(50); // 50ms delay
      frameProcessor.captureFrame(videoElement);
      await sleep(50);
      frameProcessor.captureFrame(videoElement);

      const fps = frameProcessor.getFPS();
      
      // FPS should be approximately 20 (1000ms / 50ms)
      // Allow some tolerance for timing variations
      expect(fps).toBeGreaterThan(15);
      expect(fps).toBeLessThan(25);

      CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    });

    it('should reset FPS counter', () => {
      const videoElement = createMockVideoElement();
      
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = jest.fn();

      frameProcessor.captureFrame(videoElement);
      frameProcessor.captureFrame(videoElement);
      
      expect(frameProcessor.getFPS()).toBeGreaterThanOrEqual(0);
      
      frameProcessor.resetFPS();
      expect(frameProcessor.getFPS()).toBe(0);

      CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    });
  });

  describe('getCanvas', () => {
    it('should return the internal canvas', () => {
      const canvas = frameProcessor.getCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const videoElement = createMockVideoElement();
      
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = jest.fn();

      frameProcessor.captureFrame(videoElement);
      expect(frameProcessor.getFPS()).toBeGreaterThanOrEqual(0);

      frameProcessor.dispose();
      expect(frameProcessor.getFPS()).toBe(0);

      CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    });
  });
});

// Helper functions
function createMockVideoElement(): HTMLVideoElement {
  const videoElement = document.createElement('video');
  Object.defineProperty(videoElement, 'videoWidth', {
    value: 640,
    writable: true
  });
  Object.defineProperty(videoElement, 'videoHeight', {
    value: 480,
    writable: true
  });
  Object.defineProperty(videoElement, 'readyState', {
    value: HTMLMediaElement.HAVE_CURRENT_DATA,
    writable: true
  });
  return videoElement;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
