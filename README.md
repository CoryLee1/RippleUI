# RippleUI

**AI Native UI** - 一个基于 AI 的交互式图像编辑界面原型

RippleUI 是一个创新的用户界面系统，通过点击图像中的物体，智能生成可操作的意图菜单，实现直观的图像编辑和交互体验。

## ✨ 核心特性

### 🎯 智能物体识别
- **预索引扫描**：上传图片后自动识别所有可交互物体
- **零成本碰撞检测**：前端快速判断点击位置是否命中物体
- **上下文感知**：基于周围物体生成相关操作建议

### 🎨 独特的交互体验
- **指纹光标**：自定义 SVG 光标，带有路径描边动画
- **涟漪菜单**：点击后从中心扩散的同心圆菜单
- **流畅动画**：使用 Framer Motion 实现丝滑的动画效果
- **加载状态**：等待时显示旋转的涟漪动画

### 🚀 三阶段工作流
1. **分析阶段**：上传图片，AI 识别所有物体
2. **推理阶段**：点击物体，AI 生成操作意图
3. **执行阶段**：选择意图，执行图像编辑

## 🛠️ 技术栈

### 后端
- **FastAPI** - 现代 Python Web 框架
- **Google Gemini API** - AI 模型（使用 `gemini-2.0-flash-exp`）
- **Pydantic** - 数据验证和序列化
- **Pillow** - 图像处理

### 前端
- **React 19** - UI 框架
- **Vite** - 构建工具
- **Framer Motion** - 动画库
- **Tailwind CSS** - 样式框架
- **Axios** - HTTP 客户端

## 📁 项目结构

```
RippleUI/
├── backend/                 # FastAPI 后端
│   ├── main.py             # API 入口，定义三个核心端点
│   ├── schemas.py          # Pydantic 数据模型
│   ├── requirements.txt    # Python 依赖
│   ├── .env                # 环境变量（需手动创建）
│   └── services/
│       ├── ai_service.py   # Gemini API 调用逻辑
│       └── utils.py        # JSON 解析与图片处理工具
│
└── frontend/                # React 前端
    ├── src/
    │   ├── App.jsx         # 主应用逻辑
    │   ├── components/
    │   │   ├── FingerprintCursor.jsx  # 指纹光标组件
    │   │   └── RippleMenu.jsx         # 涟漪菜单组件
    │   └── assets/
    │       └── cursor.svg  # 自定义光标 SVG
    └── package.json
```

## 🚀 快速开始

### 环境要求
- Python 3.10+
- Node.js 20.9+ (推荐 20.19+)
- Google Gemini API Key

### 后端设置

1. **安装依赖**
```bash
cd backend
pip install -r requirements.txt
```

2. **配置环境变量**
创建 `backend/.env` 文件：
```env
GOOGLE_API_KEY=你的_GEMINI_API_KEY
```

3. **启动后端服务**
```bash
python main.py
# 或
uvicorn main:app --reload
```

后端将在 `http://localhost:8000` 启动

### 前端设置

1. **安装依赖**
```bash
cd frontend
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动

## 📡 API 文档

### 1. 图片分析 - `POST /api/analyze`

上传图片并识别所有可交互物体。

**请求**：
- `file`: 图片文件（multipart/form-data）

**响应**：
```json
{
  "objects": [
    {
      "id": 0,
      "label": "Vending Machine",
      "box_2d": [y0, x0, y1, x1],
      "center": [x, y],
      "confidence": 1.0
    }
  ],
  "image_width": 1920,
  "image_height": 1080
}
```

### 2. 意图推理 - `POST /api/infer`

根据点击的物体生成操作意图。

**请求**：
- `clicked_label`: 点击的物体标签
- `click_x`: 点击的 X 坐标
- `click_y`: 点击的 Y 坐标

**响应**：
```json
{
  "intents": [
    {
      "id": 1,
      "label": "Open",
      "emoji": "🚪",
      "description": "Open the door",
      "color": "#3B82F6",
      "probability": 0.8,
      "editor_prompt": "Open the door and show the interior"
    }
  ]
}
```

### 3. 执行编辑 - `POST /api/execute`

执行选定的意图，编辑图片。

**请求**：
- `prompt`: 编辑提示词
- `box_json`: 目标区域的边界框（JSON 字符串）

**响应**：
```json
{
  "status": "success",
  "image_base64": "data:image/png;base64,..."
}
```

## 🎨 核心组件

### FingerprintCursor
自定义指纹光标，带有：
- SVG 路径描边动画
- 鼠标跟随（使用 Framer Motion 弹簧动画）
- 扫描动效（点击时触发）

### RippleMenu
涟漪菜单组件，特性：
- **同心圆布局**：意图分布在不同的半径上
- **旋转动画**：加载时每层以不同速度旋转
- **描边动画**：圆弧沿着圆环路径移动
- **智能定位**：使用 `transform: translate(-50%, -50%)` 精确居中

## 💡 设计理念

### 降本策略
- **预索引**：使用便宜的 Flash 模型进行全图扫描
- **缓存机制**：前端缓存物体框，减少 API 调用
- **快速模型**：推理阶段使用 `gemini-2.0-flash-exp`

### 用户体验
- **即时反馈**：点击后立即显示涟漪展开动画
- **视觉引导**：指纹光标提供清晰的交互提示
- **流畅动画**：所有交互都有平滑的过渡效果

## 🔧 开发说明

### 后端开发
- 使用 Pydantic 进行数据验证
- 模块化设计：AI 服务、工具函数分离
- 支持热重载（`uvicorn --reload`）

### 前端开发
- 使用 Tailwind CSS 进行样式管理
- Framer Motion 处理所有动画
- 组件化设计，易于维护和扩展

## 📝 待实现功能

- [ ] 接入真实的 Google Vertex AI Imagen API 进行图像编辑
- [ ] 使用 Redis 替代内存缓存
- [ ] 添加 Session 管理
- [ ] 支持多图片上传
- [ ] 添加撤销/重做功能

## 📄 许可证

查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：这是一个 MVP 原型，部分功能（如图像编辑）目前为模拟实现。
