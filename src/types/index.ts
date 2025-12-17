// Core type definitions for the pupillary distance measurement system

export interface Point {
  x: number;
  y: number;
}

export interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface EyePosition {
  left: Point;
  right: Point;
  confidence: number;
}

export interface CardDetection {
  corners: Point[];
  width: number;
  height: number;
  angle: number;
  confidence: number;
}

export interface MeasurementData {
  timestamp: number;
  face: FaceDetection | null;
  eyes: EyePosition | null;
  card: CardDetection | null;
  eyePixelDistance: number | null;
  ipd: number | null;
  confidence: number;
  fps: number;
}

export interface MeasurementResult {
  ipd: number;
  confidence: number;
  timestamp: number;
}

export interface DebugInfo {
  fps: number;
  faceDetected: boolean;
  eyePositions: EyePosition | null;
  cardDetected: boolean;
  pixelDistance: number;
  cardPixelWidth: number;
}

export enum MeasurementState {
  INITIALIZING = 'initializing',
  WAITING_FOR_FACE = 'waiting_for_face',
  FACE_DETECTED = 'face_detected',
  WAITING_FOR_CARD = 'waiting_for_card',
  MEASURING = 'measuring',
  MEASUREMENT_COMPLETE = 'measurement_complete',
  ERROR = 'error'
}

export interface Configuration {
  camera: {
    width: number;
    height: number;
    facingMode: 'user' | 'environment';
  };
  detection: {
    faceConfidenceThreshold: number;
    eyeConfidenceThreshold: number;
    cardConfidenceThreshold: number;
  };
  card: {
    realWidth: number;
    aspectRatioTolerance: number;
    maxTiltAngle: number;
  };
  smoothing: {
    windowSize: number;
    outlierThreshold: number;
  };
  performance: {
    targetFPS: number;
    minFPS: number;
  };
  ui: {
    debugMode: boolean;
    showFPS: boolean;
    language: 'zh' | 'en';
  };
}
