# RippleUI SDK 设计文档

## 📋 概述

将 RippleUI 的核心功能封装为独立的 Python SDK，使其可以在任何 Python 项目中使用，而不仅限于 FastAPI 应用。

## 🎯 SDK 化目标

1. **独立性**：不依赖 FastAPI，可作为库使用
2. **灵活性**：支持同步和异步两种使用方式
3. **可扩展性**：易于添加新功能和自定义配置
4. **易用性**：提供简洁的 API 和清晰的文档

## 📦 包结构设计

```
rippleui-sdk/
├── rippleui/
│   ├── __init__.py           # 导出主要类和函数
│   ├── client.py              # 主客户端类（RippleClient）
│   ├── models.py              # 数据模型（从 schemas.py 迁移）
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py      # AI 服务（重构为独立类）
│   │   └── image_utils.py     # 图像处理工具（从 utils.py 迁移）
│   └── exceptions.py          # 自定义异常类
├── tests/                     # 单元测试
├── examples/                  # 使用示例
│   ├── basic_usage.py
│   ├── async_usage.py
│   └── custom_config.py
├── docs/                      # 文档
│   ├── README.md
│   ├── API.md
│   └── examples.md
├── pyproject.toml            # 项目配置（Poetry/Pip）
├── setup.py                   # 安装脚本
└── README.md                  # 主 README
```

## 🔧 核心 API 设计

### 1. 主客户端类

```python
from rippleui import RippleClient

# 同步使用
client = RippleClient(api_key="your-api-key")
objects = client.analyze_scene(image)
intents = client.infer_intent(image, clicked_label="Window", click_x=100, click_y=200)
edited_image = client.execute_edit(image, prompt="Change color to red", box_2d=[0,0,100,100])

# 异步使用
async with RippleClient(api_key="your-api-key") as client:
    objects = await client.analyze_scene(image)
    intents = await client.infer_intent(image, clicked_label="Window", click_x=100, click_y=200)
    edited_image = await client.execute_edit(image, prompt="Change color to red", box_2d=[0,0,100,100])
```

### 2. 配置选项

```python
from rippleui import RippleClient, RippleConfig

config = RippleConfig(
    api_key="your-api-key",
    model_name="gemini-2.0-flash",           # 可选：自定义模型
    image_edit_model="gemini-2.5-flash-image", # 可选：自定义图像编辑模型
    timeout=30,                                # 可选：请求超时时间
    max_retries=3,                            # 可选：重试次数
    enable_logging=True                       # 可选：启用日志
)

client = RippleClient(config=config)
```

### 3. 数据模型

```python
from rippleui import DetectedObject, RippleIntent

# 类型提示和验证
objects: List[DetectedObject] = client.analyze_scene(image)
intents: List[RippleIntent] = client.infer_intent(...)
```

## 📊 依赖管理策略

### 核心依赖（必需）
```toml
[project]
dependencies = [
    "google-genai>=1.16.0",  # Gemini API
    "pillow>=10.0.0",        # 图像处理
    "pydantic>=2.0.0",       # 数据验证
]
```

### 可选依赖
```toml
[project.optional-dependencies]
async = ["aiohttp>=3.8.0"]  # 异步支持（如果需要）
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "black>=23.0.0",
    "mypy>=1.0.0",
]
```

## 🔄 迁移路径

### 阶段 1：提取核心逻辑（当前阶段）
- ✅ `AIService` 类已独立
- ✅ `schemas.py` 数据模型已定义
- ✅ `utils.py` 工具函数已分离

### 阶段 2：创建 SDK 包结构
1. 创建新的 `rippleui-sdk/` 目录
2. 将核心代码迁移到 SDK 包
3. 重构 `AIService` 为 `RippleClient`
4. 添加配置管理类

### 阶段 3：API 统一
1. 统一同步/异步接口
2. 添加错误处理和重试机制
3. 添加日志系统

### 阶段 4：文档和测试
1. 编写完整的 API 文档
2. 添加使用示例
3. 编写单元测试
4. 准备 PyPI 发布

## 💡 设计决策

### 1. 同步 vs 异步
**建议**：同时支持两种方式
- 默认提供同步接口（更简单）
- 可选异步接口（性能更好）
- 使用 `asyncio` 和 `aiohttp` 实现异步

### 2. 配置管理
**建议**：使用配置类
- 支持环境变量（`GOOGLE_API_KEY`）
- 支持配置文件
- 支持代码中直接传入

### 3. 错误处理
**建议**：自定义异常类
```python
class RippleError(Exception):
    """基础异常类"""
    pass

class RippleAPIError(RippleError):
    """API 调用错误"""
    pass

class RippleImageError(RippleError):
    """图像处理错误"""
    pass
```

### 4. 日志系统
**建议**：使用 Python `logging` 模块
- 可配置日志级别
- 支持输出到文件
- 默认只输出警告和错误

## 📈 使用场景

### 场景 1：独立脚本
```python
from rippleui import RippleClient
from PIL import Image

client = RippleClient(api_key="your-key")
image = Image.open("photo.jpg")
objects = client.analyze_scene(image)
print(f"Found {len(objects)} objects")
```

### 场景 2：Web 应用（FastAPI）
```python
from fastapi import FastAPI
from rippleui import RippleClient

app = FastAPI()
client = RippleClient(api_key=os.getenv("GOOGLE_API_KEY"))

@app.post("/analyze")
async def analyze(image: UploadFile):
    pil_image = Image.open(io.BytesIO(await image.read()))
    objects = await client.analyze_scene(pil_image)
    return {"objects": objects}
```

### 场景 3：Jupyter Notebook
```python
from rippleui import RippleClient
import matplotlib.pyplot as plt

client = RippleClient(api_key="your-key")
image = Image.open("photo.jpg")
objects = client.analyze_scene(image)

# 可视化结果
plt.imshow(image)
for obj in objects:
    # 绘制边界框
    ...
```

## 🚀 实施建议

### 优先级 1（MVP）
- [x] 提取核心逻辑到独立类
- [ ] 创建 SDK 包结构
- [ ] 实现 `RippleClient` 主类
- [ ] 添加基本配置管理
- [ ] 编写基础文档

### 优先级 2（完善）
- [ ] 添加异步支持
- [ ] 实现错误处理和重试
- [ ] 添加日志系统
- [ ] 编写单元测试
- [ ] 添加使用示例

### 优先级 3（发布）
- [ ] 准备 PyPI 发布
- [ ] 编写完整 API 文档
- [ ] 添加 CI/CD 流程
- [ ] 版本管理

## ❓ 待讨论问题

1. **包名**：`rippleui` vs `ripple-ui` vs `rippleui-sdk`？
2. **版本号**：从 `0.1.0` 还是 `1.0.0` 开始？
3. **许可证**：MIT、Apache 2.0 还是其他？
4. **发布平台**：PyPI、GitHub Packages 还是两者都支持？
5. **向后兼容**：是否保持与当前 FastAPI 版本的兼容？

## 📝 总结

**SDK 化可行性：✅ 高度可行**

当前代码结构已经非常适合 SDK 化：
- ✅ 核心逻辑已模块化
- ✅ 数据模型已定义
- ✅ 工具函数已分离
- ✅ 错误处理已完善

**建议**：采用渐进式迁移策略，先创建独立的 SDK 包，然后逐步完善功能和文档，最后发布到 PyPI。

