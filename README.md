# 瞳距测量系统 (Pupillary Distance Measurement System)

基于浏览器的瞳距测量应用程序，使用计算机视觉技术实现实时瞳距测量。

## 功能特性

- 🎥 实时摄像头访问和视频流处理
- 👤 人脸检测和眼部关键点定位
- 📏 基于标准卡片的瞳距测量
- 📊 数据平滑和异常值过滤
- 🎨 直观的用户界面和实时反馈
- 🐛 调试模式支持

## 技术栈

- **前端**: TypeScript + HTML5 + CSS3
- **视频采集**: WebRTC MediaStream API
- **构建工具**: Webpack 5
- **测试框架**: Jest + fast-check

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 生产构建

```bash
npm run build
```

构建输出将在 `dist/` 目录。

### 运行测试

```bash
npm test
```

## 项目结构

```
pupillary-distance-measurement/
├── public/              # 静态资源
│   ├── index.html      # HTML 模板
│   └── styles.css      # 全局样式
├── src/                # 源代码
│   ├── core/           # 核心模块
│   ├── utils/          # 工具函数
│   ├── controllers/    # 控制器
│   ├── ui/             # UI 管理
│   ├── types/          # TypeScript 类型定义
│   ├── config/         # 配置文件
│   └── main.ts         # 应用入口
├── tests/              # 测试文件
│   ├── unit/           # 单元测试
│   ├── integration/    # 集成测试
│   └── e2e/            # 端到端测试
└── dist/               # 构建输出
```

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 使用说明

1. 允许浏览器访问摄像头
2. 正对摄像头，确保人脸清晰可见
3. 将标准卡片（如信用卡）放置在额头附近
4. 系统将自动计算并显示瞳距

## 注意事项

- 需要 HTTPS 环境（开发环境可使用 localhost）
- 测量结果为近似值，仅供参考
- 建议在光线充足的环境下使用

## 许可证

MIT
