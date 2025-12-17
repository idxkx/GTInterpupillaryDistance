/**
 * FrameProcessor - Extracts frames from video stream and converts formats
 * 
 * Responsibilities:
 * - Extract current frame from video element
 * - Convert ImageData to Canvas
 * - Convert ImageData to Tensor (for TensorFlow.js)
 * - Monitor frame rate
 */

export class FrameProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameTimestamps: number[] = [];
  private readonly FPS_SAMPLE_SIZE = 30;

  constructor() {
    // Create an offscreen canvas for frame extraction
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = context;
  }

  /**
   * Capture current frame from video element
   * @param videoElement HTML video element
   * @returns ImageData of the current frame
   */
  captureFrame(videoElement: HTMLVideoElement): ImageData {
    // Ensure video is ready
    if (videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
      throw new Error('Video element is not ready');
    }

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (width === 0 || height === 0) {
      throw new Error('Video dimensions are invalid');
    }

    // Resize canvas if needed
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Draw current video frame to canvas
    this.ctx.drawImage(videoElement, 0, 0, width, height);

    // Extract ImageData
    const imageData = this.ctx.getImageData(0, 0, width, height);

    // Record timestamp for FPS calculation
    this.recordFrameTimestamp();

    return imageData;
  }

  /**
   * Convert ImageData to Canvas
   * @param imageData ImageData to convert
   * @returns HTMLCanvasElement with the image data
   */
  toCanvas(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Convert ImageData to Tensor (for TensorFlow.js)
   * Note: This returns a plain object representation that can be used with TensorFlow.js
   * The actual Tensor creation should be done by the caller using tf.browser.fromPixels()
   * 
   * @param imageData ImageData to convert
   * @returns Object with data and shape information for tensor creation
   */
  toTensor(imageData: ImageData): {
    data: Uint8ClampedArray;
    shape: [number, number, number];
  } {
    return {
      data: imageData.data,
      shape: [imageData.height, imageData.width, 4] // RGBA channels
    };
  }

  /**
   * Get current frame rate
   * @returns Current FPS (frames per second)
   */
  getFPS(): number {
    if (this.frameTimestamps.length < 2) {
      return 0;
    }

    // Calculate average time between frames
    const timestamps = this.frameTimestamps;
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    const frameCount = timestamps.length - 1;

    if (timeSpan === 0) {
      return 0;
    }

    // FPS = frames / seconds
    return Math.round((frameCount / timeSpan) * 1000);
  }

  /**
   * Record timestamp for FPS calculation
   */
  private recordFrameTimestamp(): void {
    const now = performance.now();
    this.frameTimestamps.push(now);

    // Keep only recent timestamps for FPS calculation
    if (this.frameTimestamps.length > this.FPS_SAMPLE_SIZE) {
      this.frameTimestamps.shift();
    }
  }

  /**
   * Reset FPS counter
   */
  resetFPS(): void {
    this.frameTimestamps = [];
  }

  /**
   * Get the internal canvas (useful for debugging)
   * @returns The internal canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.frameTimestamps = [];
    // Canvas will be garbage collected
  }
}
