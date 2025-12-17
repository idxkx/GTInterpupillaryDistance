/**
 * CameraManager - Manages camera access, video stream acquisition and release
 * 
 * Responsibilities:
 * - Request camera permissions and initialize video stream
 * - Handle errors (permission denied, device not found, initialization failure)
 * - Manage video stream lifecycle
 * - Provide video stream resolution information
 */

export interface CameraManagerOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private permissionDeniedCallback: ((error: Error) => void) | null = null;
  private initializationErrorCallback: ((error: Error) => void) | null = null;

  /**
   * Request camera permission and initialize video stream
   * @param constraints Optional MediaStreamConstraints
   * @returns Promise resolving to MediaStream
   */
  async initialize(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = new Error('浏览器不支持摄像头访问');
        error.name = 'NotSupportedError';
        throw error;
      }

      // Default constraints
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      // Merge with provided constraints
      const finalConstraints = constraints || defaultConstraints;

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

      return this.stream;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get the current video stream
   * @returns MediaStream or null if not initialized
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Release camera resources
   */
  release(): void {
    if (this.stream) {
      // Stop all tracks
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    // Clear video element source
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  /**
   * Get the actual resolution of the video stream
   * @returns Object with width and height, or null if stream not available
   */
  getResolution(): { width: number; height: number } | null {
    if (!this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }

    const settings = videoTrack.getSettings();
    return {
      width: settings.width || 0,
      height: settings.height || 0
    };
  }

  /**
   * Attach video stream to a video element
   * @param videoElement HTML video element
   */
  attachToVideoElement(videoElement: HTMLVideoElement): void {
    if (!this.stream) {
      throw new Error('No stream available. Call initialize() first.');
    }

    this.videoElement = videoElement;
    videoElement.srcObject = this.stream;
  }

  /**
   * Register callback for permission denied errors
   * @param callback Function to call when permission is denied
   */
  onPermissionDenied(callback: (error: Error) => void): void {
    this.permissionDeniedCallback = callback;
  }

  /**
   * Register callback for initialization errors
   * @param callback Function to call when initialization fails
   */
  onInitializationError(callback: (error: Error) => void): void {
    this.initializationErrorCallback = callback;
  }

  /**
   * Handle errors during camera initialization
   * @param error Error object
   */
  private handleError(error: Error): void {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      // User denied camera permission
      if (this.permissionDeniedCallback) {
        this.permissionDeniedCallback(error);
      }
    } else {
      // Other initialization errors
      if (this.initializationErrorCallback) {
        this.initializationErrorCallback(error);
      }
    }
  }

  /**
   * Check if camera is currently active
   * @returns true if stream is active
   */
  isActive(): boolean {
    if (!this.stream) {
      return false;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    return videoTrack ? videoTrack.readyState === 'live' : false;
  }
}
