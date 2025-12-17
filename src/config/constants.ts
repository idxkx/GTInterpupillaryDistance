import { Configuration } from '../types';

// Default configuration for the measurement system
export const DEFAULT_CONFIG: Configuration = {
  camera: {
    width: 1280,
    height: 720,
    facingMode: 'user'
  },
  detection: {
    faceConfidenceThreshold: 0.7,
    eyeConfidenceThreshold: 0.7,
    cardConfidenceThreshold: 0.6
  },
  card: {
    realWidth: 85.60, // ISO/IEC 7810 ID-1 standard card width in mm
    aspectRatioTolerance: 0.1, // 10% tolerance
    maxTiltAngle: 15 // degrees
  },
  smoothing: {
    windowSize: 5,
    outlierThreshold: 3 // 3 standard deviations
  },
  performance: {
    targetFPS: 30,
    minFPS: 20
  },
  ui: {
    debugMode: false,
    showFPS: true,
    language: 'zh'
  }
};

// Standard card aspect ratio (85.60mm / 53.98mm)
export const STANDARD_CARD_ASPECT_RATIO = 1.586;

// Valid IPD range for adults (in mm)
export const IPD_MIN = 40;
export const IPD_MAX = 85;

// Status messages
export const STATUS_MESSAGES = {
  zh: {
    initializing: '正在初始化系统...',
    waiting_for_face: '请正对摄像头',
    face_detected: '人脸已检测到',
    waiting_for_card: '请放置标准卡片',
    measuring: '测量中...',
    measurement_complete: '测量完成',
    error: '发生错误',
    permission_denied: '请允许访问摄像头',
    camera_not_found: '未检测到摄像头设备',
    camera_in_use: '摄像头正在被其他应用使用',
    card_tilted: '请保持卡片与脸部平行'
  },
  en: {
    initializing: 'Initializing system...',
    waiting_for_face: 'Please face the camera',
    face_detected: 'Face detected',
    waiting_for_card: 'Please place standard card',
    measuring: 'Measuring...',
    measurement_complete: 'Measurement complete',
    error: 'An error occurred',
    permission_denied: 'Please allow camera access',
    camera_not_found: 'No camera device detected',
    camera_in_use: 'Camera is being used by another application',
    card_tilted: 'Please keep card parallel to face'
  }
};
