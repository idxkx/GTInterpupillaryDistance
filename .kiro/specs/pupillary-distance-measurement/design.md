# 设计文档

## 概述

本系统是一个纯前端的瞳距测量 Web 应用，利用浏览器的 WebRTC API 访问摄像头，结合计算机视觉算法实现实时人脸检测、眼部关键点定位、标准卡片识别和瞳距计算。系统采用模块化架构，将视频采集、图像处理、测量计算和用户界面分离，确保代码的可维护性和可扩展性。

核心技术栈：
- **前端框架**：原生 JavaScript + HTML5 + CSS3（或可选 React/Vue）
- **视频采集**：WebRTC MediaStream API
- **人脸检测**：TensorFlow.js + MediaPipe Face Mesh 或 face-api.js
- **图像处理**：Canvas API + OpenCV.js（用于卡片检测）
- **数学计算**：原生 JavaScript Math API

## 架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │视频显示  │  │状态提示  │  │结果展示  │  │调试面板  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      应用控制层                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           MeasurementController                       │  │
│  │  - 协调各模块工作流程                                 │  │
│  │  - 管理测量状态机                                     │  │
│  │  - 处理用户交互                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │人脸检测  │  │眼部定位  │  │卡片识别  │  │瞳距计算  │   │
│  │模块      │  │模块      │  │模块      │  │模块      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                │
│  │数据平滑  │  │可视化    │                                │
│  │模块      │  │渲染模块  │                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      基础设施层                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  CameraManager   │  │  FrameProcessor  │               │
│  │  - 摄像头访问    │  │  - 帧提取        │               │
│  │  - 流管理        │  │  - 格式转换      │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
摄像头 → 视频流 → 帧提取 → 人脸检测 → 眼部定位 → 像素距离计算
                      ↓
                  卡片检测 → 像素宽度获取
                      ↓
              瞳距换算 → 数据平滑 → UI 展示
```

## 组件和接口

### 1. CameraManager（摄像头管理器）

**职责**：管理摄像头访问、视频流获取和释放

**接口**：
```typescript
interface CameraManager {
  // 请求摄像头权限并初始化视频流
  initialize(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  
  // 获取当前视频流
  getStream(): MediaStream | null;
  
  // 释放摄像头资源
  release(): void;
  
  // 获取视频流的实际分辨率
  getResolution(): { width: number; height: number };
  
  // 事件：权限被拒绝
  onPermissionDenied(callback: (error: Error) => void): void;
  
  // 事件：初始化失败
  onInitializationError(callback: (error: Error) => void): void;
}
```

**默认配置**：
```javascript
{
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  },
  audio: false
}
```

### 2. FrameProcessor（帧处理器）

**职责**：从视频流中提取帧并转换为可处理的图像格式

**接口**：
```typescript
interface FrameProcessor {
  // 从视频元素提取当前帧
  captureFrame(videoElement: HTMLVideoElement): ImageData;
  
  // 将 ImageData 转换为 Canvas
  toCanvas(imageData: ImageData): HTMLCanvasElement;
  
  // 将 ImageData 转换为 Tensor（用于 TensorFlow.js）
  toTensor(imageData: ImageData): tf.Tensor3D;
  
  // 获取当前帧率
  getFPS(): number;
}
```

### 3. FaceDetector（人脸检测器）

**职责**：检测视频帧中的人脸并返回人脸边界框

**接口**：
```typescript
interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

interface FaceDetector {
  // 加载模型
  loadModel(): Promise<void>;
  
  // 检测人脸
  detect(imageData: ImageData): Promise<FaceDetection[]>;
  
  // 检查模型是否已加载
  isReady(): boolean;
}
```

**实现方案**：使用 MediaPipe Face Mesh 或 face-api.js

### 4. EyeDetector（眼部检测器）

**职责**：在检测到的人脸中定位双眼瞳孔中心点

**接口**：
```typescript
interface EyePosition {
  left: { x: number; y: number };
  right: { x: number; y: number };
  confidence: number;
}

interface EyeDetector {
  // 加载模型
  loadModel(): Promise<void>;
  
  // 检测眼部关键点
  detectEyes(imageData: ImageData, faceBox: FaceDetection): Promise<EyePosition | null>;
  
  // 检查模型是否已加载
  isReady(): boolean;
}
```

**实现方案**：使用 MediaPipe Face Mesh 的 468 个关键点，提取眼部中心点

### 5. CardDetector（卡片检测器）

**职责**：识别视频帧中的标准卡片并计算其像素宽度

**接口**：
```typescript
interface CardDetection {
  corners: Array<{ x: number; y: number }>; // 4 个角点
  width: number;  // 像素宽度
  height: number; // 像素高度
  angle: number;  // 倾斜角度（度）
  confidence: number;
}

interface CardDetector {
  // 初始化 OpenCV.js
  initialize(): Promise<void>;
  
  // 检测卡片
  detectCard(imageData: ImageData): Promise<CardDetection | null>;
  
  // 验证卡片宽高比
  validateAspectRatio(detection: CardDetection): boolean;
  
  // 检查卡片姿态
  checkPose(detection: CardDetection): { isValid: boolean; message: string };
}
```

**检测算法**：
1. 图像预处理（灰度化、高斯模糊）
2. 边缘检测（Canny）
3. 轮廓查找
4. 筛选圆角矩形轮廓（宽高比 ≈ 1.586）
5. 透视变换校正
6. 计算像素宽度

### 6. DistanceCalculator（距离计算器）

**职责**：计算双眼像素距离和瞳距

**接口**：
```typescript
interface DistanceCalculator {
  // 计算两点间的欧几里得距离
  calculatePixelDistance(p1: Point, p2: Point): number;
  
  // 计算瞳距（毫米）
  calculateIPD(eyeDistance: number, cardWidth: number, cardRealWidth: number): number;
  
  // 验证计算结果的合理性（成人瞳距通常在 50-75mm）
  validateIPD(ipd: number): boolean;
}

interface Point {
  x: number;
  y: number;
}
```

**计算公式**：
```
像素距离 = sqrt((xR - xL)² + (yR - yL)²)
瞳距(mm) = (像素距离 / 卡片像素宽度) × 85.60
```

### 7. DataSmoother（数据平滑器）

**职责**：对连续帧的测量数据进行平滑处理，减少抖动

**接口**：
```typescript
interface DataSmoother {
  // 添加新数据点
  addValue(value: number, timestamp: number): void;
  
  // 获取平滑后的值
  getSmoothedValue(): number;
  
  // 重置平滑器
  reset(): void;
  
  // 检测异常值
  isOutlier(value: number): boolean;
}
```

**实现方案**：
- 使用滑动窗口平均（窗口大小：5-10 帧）
- 异常值检测：Z-score 方法（阈值：3σ）
- 可选：卡尔曼滤波器（更高级的平滑）

### 8. VisualizationRenderer（可视化渲染器）

**职责**：在视频流上叠加检测结果的可视化标记

**接口**：
```typescript
interface VisualizationRenderer {
  // 绘制人脸边界框
  drawFaceBox(ctx: CanvasRenderingContext2D, box: FaceDetection): void;
  
  // 绘制眼部中心点
  drawEyePoints(ctx: CanvasRenderingContext2D, eyes: EyePosition): void;
  
  // 绘制眼部连线
  drawEyeLine(ctx: CanvasRenderingContext2D, eyes: EyePosition): void;
  
  // 绘制卡片轮廓
  drawCardOutline(ctx: CanvasRenderingContext2D, card: CardDetection): void;
  
  // 清除所有标记
  clear(ctx: CanvasRenderingContext2D): void;
  
  // 设置调试模式
  setDebugMode(enabled: boolean): void;
}
```

### 9. MeasurementController（测量控制器）

**职责**：协调所有模块，管理测量流程和状态

**接口**：
```typescript
enum MeasurementState {
  INITIALIZING = 'initializing',
  WAITING_FOR_FACE = 'waiting_for_face',
  FACE_DETECTED = 'face_detected',
  WAITING_FOR_CARD = 'waiting_for_card',
  MEASURING = 'measuring',
  MEASUREMENT_COMPLETE = 'measurement_complete',
  ERROR = 'error'
}

interface MeasurementResult {
  ipd: number;
  confidence: number;
  timestamp: number;
}

interface MeasurementController {
  // 初始化系统
  initialize(): Promise<void>;
  
  // 开始测量
  startMeasurement(): void;
  
  // 停止测量
  stopMeasurement(): void;
  
  // 获取当前状态
  getState(): MeasurementState;
  
  // 获取最新测量结果
  getLatestResult(): MeasurementResult | null;
  
  // 状态变化回调
  onStateChange(callback: (state: MeasurementState) => void): void;
  
  // 测量结果回调
  onMeasurementUpdate(callback: (result: MeasurementResult) => void): void;
  
  // 错误回调
  onError(callback: (error: Error) => void): void;
}
```

**状态机**：
```
INITIALIZING → WAITING_FOR_FACE → FACE_DETECTED → WAITING_FOR_CARD → MEASURING → MEASUREMENT_COMPLETE
     ↓              ↓                   ↓                 ↓               ↓
   ERROR          ERROR               ERROR             ERROR           ERROR
```

### 10. UIManager（用户界面管理器）

**职责**：管理用户界面的更新和用户交互

**接口**：
```typescript
interface UIManager {
  // 更新视频显示
  updateVideoDisplay(stream: MediaStream): void;
  
  // 更新状态提示
  updateStatusMessage(message: string, type: 'info' | 'warning' | 'error' | 'success'): void;
  
  // 更新瞳距显示
  updateIPDDisplay(ipd: number): void;
  
  // 更新调试信息
  updateDebugInfo(info: DebugInfo): void;
  
  // 切换调试模式
  toggleDebugMode(): void;
  
  // 显示加载状态
  showLoading(message: string): void;
  
  // 隐藏加载状态
  hideLoading(): void;
}

interface DebugInfo {
  fps: number;
  faceDetected: boolean;
  eyePositions: EyePosition | null;
  cardDetected: boolean;
  pixelDistance: number;
  cardPixelWidth: number;
}
```

## 数据模型

### MeasurementData（测量数据）

```typescript
interface MeasurementData {
  // 时间戳
  timestamp: number;
  
  // 人脸检测结果
  face: FaceDetection | null;
  
  // 眼部位置
  eyes: EyePosition | null;
  
  // 卡片检测结果
  card: CardDetection | null;
  
  // 双眼像素距离
  eyePixelDistance: number | null;
  
  // 瞳距（毫米）
  ipd: number | null;
  
  // 置信度
  confidence: number;
  
  // 帧率
  fps: number;
}
```

### Configuration（配置）

```typescript
interface Configuration {
  // 摄像头配置
  camera: {
    width: number;
    height: number;
    facingMode: 'user' | 'environment';
  };
  
  // 检测配置
  detection: {
    faceConfidenceThreshold: number;  // 默认 0.7
    eyeConfidenceThreshold: number;   // 默认 0.7
    cardConfidenceThreshold: number;  // 默认 0.6
  };
  
  // 卡片配置
  card: {
    realWidth: number;  // 85.60 mm
    aspectRatioTolerance: number;  // 0.1 (10%)
    maxTiltAngle: number;  // 15 度
  };
  
  // 平滑配置
  smoothing: {
    windowSize: number;  // 5-10 帧
    outlierThreshold: number;  // 3σ
  };
  
  // 性能配置
  performance: {
    targetFPS: number;  // 30
    minFPS: number;  // 20
  };
  
  // UI 配置
  ui: {
    debugMode: boolean;
    showFPS: boolean;
    language: 'zh' | 'en';
  };
}
```


## 正确性属性

*属性是指在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：欧几里得距离计算正确性

*对于任意* 两个眼部中心点坐标 (xL, yL) 和 (xR, yR)，计算的像素距离应该等于 sqrt((xR - xL)² + (yR - yL)²)

**验证：需求 4.1**

### 属性 2：持续跟踪一致性

*对于任意* 包含人脸的连续视频帧序列，如果人脸保持在画面中，则每一帧都应该成功检测到人脸

**验证：需求 2.2**

### 属性 3：多人脸选择一致性

*对于任意* 包含多个人脸的视频帧，系统应该始终选择面积最大或最接近画面中心的人脸进行处理

**验证：需求 2.4**

### 属性 4：眼部坐标持续更新

*对于任意* 包含双眼的连续视频帧序列，如果双眼保持在画面中，则每一帧都应该更新瞳孔中心点坐标

**验证：需求 3.3**

### 属性 5：像素距离实时计算

*对于任意* 瞳孔中心点坐标的更新，系统应该立即重新计算像素距离

**验证：需求 4.2**

### 属性 6：数据平滑减少波动

*对于任意* 连续帧间波动的像素距离序列，应用平滑算法后的标准差应该小于原始数据的标准差

**验证：需求 4.3**

### 属性 7：卡片宽高比验证

*对于任意* 检测到的矩形轮廓，如果其宽高比在 1.586 ± 10% 范围内，则应该被识别为有效卡片候选

**验证：需求 5.2**

### 属性 8：卡片像素宽度计算

*对于任意* 成功识别的卡片，系统应该能够计算其像素宽度（基于四个角点坐标）

**验证：需求 5.3**

### 属性 9：瞳距换算公式正确性

*对于任意* 双眼像素距离 D_eye_px 和卡片像素宽度 W_card_px，计算的瞳距应该等于 (D_eye_px / W_card_px) × 85.60 毫米

**验证：需求 6.1**

### 属性 10：瞳距显示实时更新

*对于任意* 瞳距测量数据的更新，UI 应该立即更新显示的瞳距数值

**验证：需求 6.5**

### 属性 11：状态提示映射完整性

*对于任意* 测量系统状态变化，都应该存在对应的用户提示信息

**验证：需求 7.1**

### 属性 12：错误指导完整性

*对于任意* 检测到的用户操作错误（无人脸、无卡片、卡片倾斜），系统都应该提供明确的纠正指导

**验证：需求 7.4**

### 属性 13：平滑算法应用一致性

*对于任意* 连续帧间波动的检测数据，系统应该始终应用时间平滑算法

**验证：需求 10.1**

### 属性 14：异常值排除正确性

*对于任意* 数据序列，如果某个数据点偏离均值超过 3 个标准差，则该数据点应该被标记为异常值并排除

**验证：需求 10.3**

## 错误处理

### 错误类型和处理策略

#### 1. 摄像头访问错误

**错误场景**：
- 用户拒绝摄像头权限
- 摄像头被其他应用占用
- 设备无摄像头
- 浏览器不支持 WebRTC

**处理策略**：
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // 用户拒绝权限
    showError('请允许访问摄像头以使用测量功能');
  } else if (error.name === 'NotFoundError') {
    // 未找到摄像头
    showError('未检测到摄像头设备');
  } else if (error.name === 'NotReadableError') {
    // 摄像头被占用
    showError('摄像头正在被其他应用使用');
  } else {
    // 其他错误
    showError('摄像头初始化失败：' + error.message);
  }
}
```

#### 2. 模型加载错误

**错误场景**：
- 网络连接失败
- 模型文件损坏
- 浏览器内存不足

**处理策略**：
- 显示加载进度
- 提供重试机制
- 降级到备用模型（如果可用）
- 清晰的错误提示

#### 3. 检测失败错误

**错误场景**：
- 未检测到人脸
- 未检测到双眼
- 未检测到卡片
- 检测置信度过低

**处理策略**：
- 实时状态提示
- 提供操作指导
- 不中断测量流程
- 等待条件满足

#### 4. 计算错误

**错误场景**：
- 除零错误（卡片宽度为 0）
- 数值溢出
- NaN 或 Infinity 结果

**处理策略**：
```typescript
function calculateIPD(eyeDistance: number, cardWidth: number): number | null {
  // 输入验证
  if (!isFinite(eyeDistance) || !isFinite(cardWidth)) {
    console.error('Invalid input: non-finite values');
    return null;
  }
  
  if (cardWidth <= 0) {
    console.error('Invalid card width: must be positive');
    return null;
  }
  
  const ipd = (eyeDistance / cardWidth) * 85.60;
  
  // 结果验证（成人瞳距通常在 50-75mm）
  if (ipd < 40 || ipd > 85) {
    console.warn('Unusual IPD value:', ipd);
    // 仍然返回结果，但标记为可疑
  }
  
  return ipd;
}
```

#### 5. 性能错误

**错误场景**：
- 帧率过低
- 处理延迟过高
- 内存泄漏

**处理策略**：
- 监控性能指标
- 自动降低处理频率
- 释放不必要的资源
- 提示用户关闭其他标签页

### 错误恢复机制

1. **自动重试**：对于临时性错误（如网络波动），自动重试 3 次
2. **状态重置**：提供"重新开始"按钮，允许用户重置测量流程
3. **降级处理**：在性能不足时，降低处理频率或分辨率
4. **日志记录**：记录所有错误到控制台，便于调试

## 测试策略

### 单元测试

**测试框架**：Jest + Testing Library

**测试覆盖范围**：

1. **数学计算模块**
   - 欧几里得距离计算
   - 瞳距换算公式
   - 宽高比验证
   - 异常值检测

2. **数据平滑模块**
   - 滑动窗口平均
   - 异常值过滤
   - 边界条件处理

3. **状态管理模块**
   - 状态转换逻辑
   - 状态提示映射
   - 错误状态处理

4. **工具函数**
   - 坐标转换
   - 角度计算
   - 数据验证

**示例测试**：
```typescript
describe('DistanceCalculator', () => {
  test('should calculate correct Euclidean distance', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    const distance = calculatePixelDistance(p1, p2);
    expect(distance).toBe(5);
  });
  
  test('should calculate correct IPD', () => {
    const eyeDistance = 100; // pixels
    const cardWidth = 200; // pixels
    const ipd = calculateIPD(eyeDistance, cardWidth);
    expect(ipd).toBeCloseTo(42.8, 1); // (100/200) * 85.60 = 42.8mm
  });
  
  test('should return null for invalid card width', () => {
    const ipd = calculateIPD(100, 0);
    expect(ipd).toBeNull();
  });
});
```

### 基于属性的测试

**测试框架**：fast-check（JavaScript 的属性测试库）

**配置**：每个属性测试运行至少 100 次迭代

**测试标注格式**：每个属性测试必须使用注释明确引用设计文档中的正确性属性
- 格式：`// Feature: pupillary-distance-measurement, Property {number}: {property_text}`

**属性测试用例**：

1. **属性 1：欧几里得距离计算正确性**
```typescript
// Feature: pupillary-distance-measurement, Property 1: 欧几里得距离计算正确性
test('Property 1: Euclidean distance calculation correctness', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1920 }), // xL
      fc.integer({ min: 0, max: 1080 }), // yL
      fc.integer({ min: 0, max: 1920 }), // xR
      fc.integer({ min: 0, max: 1080 }), // yR
      (xL, yL, xR, yR) => {
        const p1 = { x: xL, y: yL };
        const p2 = { x: xR, y: yR };
        const distance = calculatePixelDistance(p1, p2);
        const expected = Math.sqrt((xR - xL) ** 2 + (yR - yL) ** 2);
        return Math.abs(distance - expected) < 0.001;
      }
    ),
    { numRuns: 100 }
  );
});
```

2. **属性 6：数据平滑减少波动**
```typescript
// Feature: pupillary-distance-measurement, Property 6: 数据平滑减少波动
test('Property 6: Data smoothing reduces fluctuation', () => {
  fc.assert(
    fc.property(
      fc.array(fc.float({ min: 50, max: 150 }), { minLength: 10, maxLength: 50 }),
      (values) => {
        const smoother = new DataSmoother(5);
        values.forEach(v => smoother.addValue(v, Date.now()));
        
        const originalStdDev = calculateStdDev(values);
        const smoothedValues = values.map(() => smoother.getSmoothedValue());
        const smoothedStdDev = calculateStdDev(smoothedValues);
        
        return smoothedStdDev <= originalStdDev;
      }
    ),
    { numRuns: 100 }
  );
});
```

3. **属性 7：卡片宽高比验证**
```typescript
// Feature: pupillary-distance-measurement, Property 7: 卡片宽高比验证
test('Property 7: Card aspect ratio validation', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 100, max: 500 }), // width
      fc.float({ min: 50, max: 300 }),  // height
      (width, height) => {
        const aspectRatio = width / height;
        const detection = { width, height, aspectRatio };
        const isValid = validateAspectRatio(detection);
        
        const expectedRatio = 1.586;
        const tolerance = 0.1;
        const shouldBeValid = Math.abs(aspectRatio - expectedRatio) / expectedRatio <= tolerance;
        
        return isValid === shouldBeValid;
      }
    ),
    { numRuns: 100 }
  );
});
```

4. **属性 9：瞳距换算公式正确性**
```typescript
// Feature: pupillary-distance-measurement, Property 9: 瞳距换算公式正确性
test('Property 9: IPD conversion formula correctness', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 50, max: 200 }),  // eyeDistance in pixels
      fc.float({ min: 100, max: 500 }), // cardWidth in pixels
      (eyeDistance, cardWidth) => {
        const ipd = calculateIPD(eyeDistance, cardWidth);
        const expected = (eyeDistance / cardWidth) * 85.60;
        
        if (ipd === null) return true; // Skip invalid inputs
        return Math.abs(ipd - expected) < 0.01;
      }
    ),
    { numRuns: 100 }
  );
});
```

5. **属性 14：异常值排除正确性**
```typescript
// Feature: pupillary-distance-measurement, Property 14: 异常值排除正确性
test('Property 14: Outlier exclusion correctness', () => {
  fc.assert(
    fc.property(
      fc.array(fc.float({ min: 50, max: 70 }), { minLength: 10, maxLength: 20 }),
      fc.float({ min: 100, max: 200 }), // outlier value
      (normalValues, outlierValue) => {
        const values = [...normalValues, outlierValue];
        const mean = values.reduce((a, b) => a + b) / values.length;
        const stdDev = calculateStdDev(values);
        
        const isOutlier = Math.abs(outlierValue - mean) > 3 * stdDev;
        const detectedAsOutlier = checkOutlier(outlierValue, values);
        
        return isOutlier === detectedAsOutlier;
      }
    ),
    { numRuns: 100 }
  );
});
```

### 集成测试

**测试场景**：

1. **完整测量流程**
   - 摄像头初始化 → 人脸检测 → 眼部定位 → 卡片识别 → 瞳距计算 → 结果显示

2. **错误恢复流程**
   - 权限拒绝 → 错误提示 → 重新请求
   - 检测失败 → 状态提示 → 等待条件满足

3. **状态转换流程**
   - 验证所有状态转换路径
   - 验证状态提示的正确性

### 端到端测试

**测试工具**：Playwright 或 Cypress

**测试场景**：

1. **使用测试图像进行测量**
   - 准备包含人脸和卡片的测试图像
   - 模拟摄像头输入
   - 验证测量结果

2. **用户交互测试**
   - 调试模式切换
   - 错误提示显示
   - 结果展示

### 性能测试

**测试指标**：

1. **帧率**：保持 ≥ 20 FPS
2. **检测延迟**：< 50ms
3. **初始化时间**：< 5s
4. **内存使用**：< 500MB

**测试方法**：
- 使用 Chrome DevTools Performance 分析
- 长时间运行测试（30 分钟）检测内存泄漏
- 不同设备和浏览器的性能对比

### 测试数据

**测试图像集**：
- 正面人脸图像（不同光照、角度、距离）
- 包含标准卡片的图像（不同位置、角度）
- 边缘情况图像（多人脸、无人脸、遮挡）

**测试视频**：
- 模拟真实测量流程的视频序列
- 包含各种错误场景的视频

## 实现注意事项

### 性能优化

1. **模型优化**
   - 使用轻量级模型（如 MediaPipe Face Mesh Lite）
   - 启用 WebGL 加速
   - 考虑使用 Web Worker 进行后台处理

2. **帧处理优化**
   - 降低处理频率（如每 2 帧处理一次）
   - 使用 requestAnimationFrame 同步渲染
   - 避免不必要的 Canvas 操作

3. **内存管理**
   - 及时释放 Tensor 对象
   - 复用 Canvas 和 ImageData 对象
   - 限制历史数据缓存大小

### 用户体验

1. **加载体验**
   - 显示模型加载进度
   - 提供加载动画
   - 预加载关键资源

2. **测量引导**
   - 清晰的步骤说明
   - 实时的视觉反馈
   - 友好的错误提示

3. **结果展示**
   - 大字号显示瞳距
   - 显示测量置信度
   - 提供测量历史记录

### 浏览器兼容性

**目标浏览器**：
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**兼容性处理**：
```typescript
// 检测浏览器支持
function checkBrowserSupport(): { supported: boolean; message: string } {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      message: '您的浏览器不支持摄像头访问'
    };
  }
  
  if (typeof OffscreenCanvas === 'undefined') {
    console.warn('OffscreenCanvas not supported, using fallback');
  }
  
  return { supported: true, message: '' };
}
```

### 安全性

1. **HTTPS 要求**
   - 摄像头访问必须在 HTTPS 环境
   - 开发环境可使用 localhost

2. **隐私保护**
   - 所有处理在本地完成
   - 不上传任何图像或视频数据
   - 明确的隐私声明

3. **数据安全**
   - 不存储敏感数据
   - 测量结果仅在内存中
   - 用户可随时清除数据

## 部署架构

### 静态网站部署

```
┌─────────────────────────────────────┐
│         CDN / Static Hosting        │
│  (Vercel, Netlify, GitHub Pages)    │
└─────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────┐
│          HTML + CSS + JS            │
│  ┌───────────────────────────────┐  │
│  │  index.html                   │  │
│  │  styles.css                   │  │
│  │  app.js (bundled)             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────┐
│      ML Models (CDN Hosted)         │
│  ┌───────────────────────────────┐  │
│  │  face-mesh-model/             │  │
│  │  face-detection-model/        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 文件结构

```
pupillary-distance-measurement/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── models/              # 可选：本地托管模型
├── src/
│   ├── core/
│   │   ├── CameraManager.ts
│   │   ├── FrameProcessor.ts
│   │   ├── FaceDetector.ts
│   │   ├── EyeDetector.ts
│   │   ├── CardDetector.ts
│   │   └── DistanceCalculator.ts
│   ├── utils/
│   │   ├── DataSmoother.ts
│   │   ├── VisualizationRenderer.ts
│   │   └── MathUtils.ts
│   ├── controllers/
│   │   └── MeasurementController.ts
│   ├── ui/
│   │   └── UIManager.ts
│   ├── types/
│   │   └── index.ts
│   ├── config/
│   │   └── constants.ts
│   └── main.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 未来扩展

### 短期扩展（1-3 个月）

1. **多帧融合**
   - 收集多次测量结果
   - 计算平均值和置信区间
   - 提供更准确的测量

2. **自动姿态评分**
   - 评估人脸和卡片的姿态质量
   - 提供实时的姿态反馈
   - 只在姿态良好时记录测量

3. **测量历史**
   - 保存历史测量记录
   - 显示测量趋势
   - 导出测量报告

### 中期扩展（3-6 个月）

1. **深度估计**
   - 使用双目视觉或深度学习估计深度
   - 校正透视畸变
   - 提高测量精度

2. **移动端优化**
   - 响应式设计
   - 触摸交互优化
   - 性能优化

3. **多语言支持**
   - 国际化框架
   - 多语言界面
   - 本地化文档

### 长期扩展（6-12 个月）

1. **AR 辅助测量**
   - 使用 WebXR API
   - 3D 空间定位
   - 虚拟标尺

2. **AI 辅助校准**
   - 自动检测和校正常见错误
   - 智能推荐最佳测量时机
   - 自适应算法优化

3. **医疗级精度**
   - 更精确的算法
   - 多传感器融合
   - 临床验证
