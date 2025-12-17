/**
 * Unit tests for CameraManager
 * Tests: Permission request flow, error handling logic, resource release
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import { CameraManager } from '../../src/core/CameraManager';

describe('CameraManager', () => {
  let cameraManager: CameraManager;
  let mockStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;

  beforeEach(() => {
    cameraManager = new CameraManager();

    // Create mock video track
    mockVideoTrack = {
      kind: 'video',
      id: 'mock-video-track',
      label: 'Mock Camera',
      enabled: true,
      muted: false,
      readyState: 'live',
      stop: jest.fn(),
      getSettings: jest.fn().mockReturnValue({
        width: 1280,
        height: 720,
        facingMode: 'user'
      }),
      getCapabilities: jest.fn(),
      getConstraints: jest.fn(),
      applyConstraints: jest.fn(),
      clone: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    } as unknown as MediaStreamTrack;

    // Create mock stream
    mockStream = {
      id: 'mock-stream',
      active: true,
      getTracks: jest.fn().mockReturnValue([mockVideoTrack]),
      getVideoTracks: jest.fn().mockReturnValue([mockVideoTrack]),
      getAudioTracks: jest.fn().mockReturnValue([]),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      getTrackById: jest.fn(),
      clone: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    } as unknown as MediaStream;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should successfully initialize camera with default constraints', async () => {
      // Mock getUserMedia
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const stream = await cameraManager.initialize();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      expect(stream).toBe(mockStream);
      expect(cameraManager.getStream()).toBe(mockStream);
    });

    it('should initialize camera with custom constraints', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const customConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: false
      };

      await cameraManager.initialize(customConstraints);

      expect(mockGetUserMedia).toHaveBeenCalledWith(customConstraints);
    });

    it('should throw error when getUserMedia is not supported', async () => {
      // Mock unsupported browser
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true
      });

      await expect(cameraManager.initialize()).rejects.toThrow('浏览器不支持摄像头访问');
    });

    it('should handle permission denied error (NotAllowedError)', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';

      const mockGetUserMedia = jest.fn().mockRejectedValue(permissionError);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const permissionDeniedCallback = jest.fn();
      cameraManager.onPermissionDenied(permissionDeniedCallback);

      await expect(cameraManager.initialize()).rejects.toThrow('Permission denied');
      expect(permissionDeniedCallback).toHaveBeenCalledWith(permissionError);
    });

    it('should handle permission denied error (PermissionDeniedError)', async () => {
      const permissionError = new Error('Permission denied by user');
      permissionError.name = 'PermissionDeniedError';

      const mockGetUserMedia = jest.fn().mockRejectedValue(permissionError);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const permissionDeniedCallback = jest.fn();
      cameraManager.onPermissionDenied(permissionDeniedCallback);

      await expect(cameraManager.initialize()).rejects.toThrow();
      expect(permissionDeniedCallback).toHaveBeenCalledWith(permissionError);
    });

    it('should handle device not found error', async () => {
      const notFoundError = new Error('No camera found');
      notFoundError.name = 'NotFoundError';

      const mockGetUserMedia = jest.fn().mockRejectedValue(notFoundError);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const initErrorCallback = jest.fn();
      cameraManager.onInitializationError(initErrorCallback);

      await expect(cameraManager.initialize()).rejects.toThrow('No camera found');
      expect(initErrorCallback).toHaveBeenCalledWith(notFoundError);
    });

    it('should handle camera in use error', async () => {
      const inUseError = new Error('Camera is in use');
      inUseError.name = 'NotReadableError';

      const mockGetUserMedia = jest.fn().mockRejectedValue(inUseError);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const initErrorCallback = jest.fn();
      cameraManager.onInitializationError(initErrorCallback);

      await expect(cameraManager.initialize()).rejects.toThrow('Camera is in use');
      expect(initErrorCallback).toHaveBeenCalledWith(inUseError);
    });
  });

  describe('getStream', () => {
    it('should return null when not initialized', () => {
      expect(cameraManager.getStream()).toBeNull();
    });

    it('should return stream after initialization', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      await cameraManager.initialize();
      expect(cameraManager.getStream()).toBe(mockStream);
    });
  });

  describe('release', () => {
    it('should stop all tracks when releasing', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      await cameraManager.initialize();
      cameraManager.release();

      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(cameraManager.getStream()).toBeNull();
    });

    it('should clear video element when releasing', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const mockVideoElement = document.createElement('video');
      
      await cameraManager.initialize();
      cameraManager.attachToVideoElement(mockVideoElement);
      cameraManager.release();

      expect(mockVideoElement.srcObject).toBeNull();
    });

    it('should handle release when not initialized', () => {
      expect(() => cameraManager.release()).not.toThrow();
    });
  });

  describe('getResolution', () => {
    it('should return null when stream is not available', () => {
      expect(cameraManager.getResolution()).toBeNull();
    });

    it('should return resolution from video track settings', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      await cameraManager.initialize();
      const resolution = cameraManager.getResolution();

      expect(resolution).toEqual({
        width: 1280,
        height: 720
      });
    });

    it('should return 0x0 when settings are not available', async () => {
      const trackWithoutSettings = {
        ...mockVideoTrack,
        getSettings: jest.fn().mockReturnValue({})
      } as unknown as MediaStreamTrack;

      const streamWithoutSettings = {
        ...mockStream,
        getVideoTracks: jest.fn().mockReturnValue([trackWithoutSettings])
      } as unknown as MediaStream;

      const mockGetUserMedia = jest.fn().mockResolvedValue(streamWithoutSettings);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      await cameraManager.initialize();
      const resolution = cameraManager.getResolution();

      expect(resolution).toEqual({
        width: 0,
        height: 0
      });
    });
  });

  describe('attachToVideoElement', () => {
    it('should attach stream to video element', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      const mockVideoElement = document.createElement('video');
      
      await cameraManager.initialize();
      cameraManager.attachToVideoElement(mockVideoElement);

      expect(mockVideoElement.srcObject).toBe(mockStream);
    });

    it('should throw error when attaching without initialization', () => {
      const mockVideoElement = document.createElement('video');
      
      expect(() => {
        cameraManager.attachToVideoElement(mockVideoElement);
      }).toThrow('No stream available. Call initialize() first.');
    });
  });

  describe('isActive', () => {
    it('should return false when not initialized', () => {
      expect(cameraManager.isActive()).toBe(false);
    });

    it('should return true when stream is active', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      await cameraManager.initialize();
      expect(cameraManager.isActive()).toBe(true);
    });

    it('should return false when track is not live', async () => {
      const inactiveTrack = {
        ...mockVideoTrack,
        readyState: 'ended'
      } as unknown as MediaStreamTrack;

      const inactiveStream = {
        ...mockStream,
        getVideoTracks: jest.fn().mockReturnValue([inactiveTrack])
      } as unknown as MediaStream;

      const mockGetUserMedia = jest.fn().mockResolvedValue(inactiveStream);
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true,
        configurable: true
      });

      await cameraManager.initialize();
      expect(cameraManager.isActive()).toBe(false);
    });
  });

  describe('error callbacks', () => {
    it('should allow registering permission denied callback', () => {
      const callback = jest.fn();
      expect(() => {
        cameraManager.onPermissionDenied(callback);
      }).not.toThrow();
    });

    it('should allow registering initialization error callback', () => {
      const callback = jest.fn();
      expect(() => {
        cameraManager.onInitializationError(callback);
      }).not.toThrow();
    });
  });
});
