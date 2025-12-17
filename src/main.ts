// Main entry point for the pupillary distance measurement application
import '../public/styles.css';
import { DEFAULT_CONFIG, STATUS_MESSAGES } from './config/constants';
import { CameraManager } from './core/CameraManager';
import { FaceDetector } from './core/FaceDetector';
import { FrameProcessor } from './core/FrameProcessor';

console.log('Pupillary Distance Measurement System');
console.log('Version: 1.0.0');
console.log('Configuration:', DEFAULT_CONFIG);

// Global instances
let cameraManager: CameraManager | null = null;
let faceDetector: FaceDetector | null = null;
let frameProcessor: FrameProcessor | null = null;
let detectionLoop: number | null = null;

// Update status message in UI
function updateStatusMessage(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
  const statusElement = document.getElementById('status-message');
  const statusText = document.getElementById('status-text');
  
  if (statusElement && statusText) {
    statusText.textContent = message;
    statusElement.className = `status-message ${type}`;
  }
}

// Show/hide loading indicator
function setLoading(show: boolean, message?: string): void {
  const loadingElement = document.getElementById('loading');
  const messageElement = document.getElementById('loading-message');
  
  if (loadingElement) {
    if (show) {
      loadingElement.classList.remove('hidden');
      if (message && messageElement) {
        messageElement.textContent = message;
      }
    } else {
      loadingElement.classList.add('hidden');
    }
  }
}

// Start face detection loop
function startDetectionLoop(videoElement: HTMLVideoElement, overlayCanvas: HTMLCanvasElement): void {
  if (!faceDetector || !frameProcessor) return;

  const ctx = overlayCanvas.getContext('2d');
  if (!ctx) return;

  const detect = async () => {
    try {
      if (!videoElement.paused && !videoElement.ended && videoElement.readyState >= 2) {
        // Capture frame from video
        const imageData = frameProcessor!.captureFrame(videoElement);
        
        // Detect faces
        const faces = await faceDetector!.detect(imageData);
        
        // Clear overlay
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (faces.length > 0) {
          // Select best face
          const bestFace = faceDetector!.selectBestFace(faces, imageData.width, imageData.height);
          
          if (bestFace) {
            // Update status
            updateStatusMessage(STATUS_MESSAGES.zh.face_detected, 'success');
            
            // Draw face bounding box
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(
              bestFace.boundingBox.x,
              bestFace.boundingBox.y,
              bestFace.boundingBox.width,
              bestFace.boundingBox.height
            );
            
            // Draw confidence
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            ctx.fillText(
              `置信度: ${(bestFace.confidence * 100).toFixed(0)}%`,
              bestFace.boundingBox.x,
              bestFace.boundingBox.y - 10
            );
          }
        } else {
          updateStatusMessage(STATUS_MESSAGES.zh.waiting_for_face, 'info');
        }
        
        // Update FPS
        const fps = frameProcessor!.getFPS();
        const fpsElement = document.getElementById('debug-fps');
        if (fpsElement) {
          fpsElement.textContent = fps.toFixed(1);
        }
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
    
    // Continue loop
    detectionLoop = requestAnimationFrame(detect);
  };
  
  detect();
}

// Initialize camera and display video stream
async function initializeCamera(): Promise<void> {
  try {
    setLoading(true, STATUS_MESSAGES.zh.initializing);
    updateStatusMessage(STATUS_MESSAGES.zh.initializing, 'info');

    // Create instances
    cameraManager = new CameraManager();
    faceDetector = new FaceDetector();
    frameProcessor = new FrameProcessor();

    // Set up error handlers
    cameraManager.onPermissionDenied((error) => {
      console.error('Camera permission denied:', error);
      updateStatusMessage(STATUS_MESSAGES.zh.permission_denied, 'error');
      setLoading(false);
    });

    cameraManager.onInitializationError((error) => {
      console.error('Camera initialization error:', error);
      let errorMessage = STATUS_MESSAGES.zh.error;
      
      if (error.name === 'NotFoundError') {
        errorMessage = STATUS_MESSAGES.zh.camera_not_found;
      } else if (error.name === 'NotReadableError') {
        errorMessage = STATUS_MESSAGES.zh.camera_in_use;
      }
      
      updateStatusMessage(errorMessage, 'error');
      setLoading(false);
    });

    // Initialize camera with default configuration
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: DEFAULT_CONFIG.camera.width },
        height: { ideal: DEFAULT_CONFIG.camera.height },
        facingMode: DEFAULT_CONFIG.camera.facingMode
      },
      audio: false
    };

    const stream = await cameraManager.initialize(constraints);

    // Load face detection model
    console.log('Loading face detection model...');
    await faceDetector.loadModel();
    console.log('Face detection model loaded');

    // Attach stream to video element
    const videoElement = document.getElementById('video') as HTMLVideoElement;
    const overlayCanvas = document.getElementById('overlay') as HTMLCanvasElement;
    
    if (videoElement && overlayCanvas) {
      cameraManager.attachToVideoElement(videoElement);
      
      // Wait for video to be ready
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        
        // Set overlay canvas size to match video
        overlayCanvas.width = videoElement.videoWidth;
        overlayCanvas.height = videoElement.videoHeight;
        
        setLoading(false);
        updateStatusMessage(STATUS_MESSAGES.zh.waiting_for_face, 'info');
        
        // Log resolution
        const resolution = cameraManager?.getResolution();
        if (resolution) {
          console.log(`Camera resolution: ${resolution.width}x${resolution.height}`);
        }
        
        // Start detection loop
        startDetectionLoop(videoElement, overlayCanvas);
      };
    }

    console.log('Camera initialized successfully');
  } catch (error) {
    console.error('Failed to initialize camera:', error);
    setLoading(false);
    updateStatusMessage('初始化失败: ' + (error as Error).message, 'error');
  }
}

// Cleanup on page unload
function cleanup(): void {
  if (detectionLoop !== null) {
    cancelAnimationFrame(detectionLoop);
    detectionLoop = null;
  }
  
  if (faceDetector) {
    faceDetector.dispose();
    faceDetector = null;
  }
  
  if (frameProcessor) {
    frameProcessor.dispose();
    frameProcessor = null;
  }
  
  if (cameraManager) {
    cameraManager.release();
    cameraManager = null;
  }
}

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, application ready');
  
  // Initialize camera
  initializeCamera();
  
  // Set up restart button
  const restartButton = document.getElementById('restart');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      cleanup();
      initializeCamera();
    });
  }
  
  // Set up debug toggle button
  const toggleDebugButton = document.getElementById('toggle-debug');
  const debugPanel = document.getElementById('debug-panel');
  if (toggleDebugButton && debugPanel) {
    toggleDebugButton.addEventListener('click', () => {
      debugPanel.classList.toggle('hidden');
    });
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
