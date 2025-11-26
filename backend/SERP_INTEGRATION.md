# SERP API 集成文档

## 📋 概述

RippleUI 已集成 SERP (Search Engine Results Page) API，在意图推理阶段自动搜索互联网资源，生成更准确和相关的功能按钮。

## 🔧 配置

### 1. 获取 SERP API Key

访问 [SerpAPI](https://serpapi.com/) 注册账号并获取 API Key。

### 2. 配置环境变量

在 `backend/.env` 文件中添加：

```env
GOOGLE_API_KEY=你的_GEMINI_API_KEY
SERP_API_KEY=你的_SERP_API_KEY
```

### 3. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

新增依赖：`httpx`（用于异步 HTTP 请求）

## 🚀 使用方法

### 启用/禁用网络搜索

在 `backend/main.py` 中：

```python
# 启用网络搜索（默认）
ai_service = AIService(enable_web_search=True)

# 禁用网络搜索
ai_service = AIService(enable_web_search=False)
```

### 工作流程

1. **用户点击物体** → 触发意图推理
2. **自动搜索** → SERP API 搜索相关功能和操作
3. **整合结果** → 将搜索结果作为上下文传递给 AI 模型
4. **生成意图** → AI 基于图像、上下文和网络资源生成功能按钮

## 📊 集成架构

```
用户点击物体
    ↓
infer_intent()
    ↓
SerpService.search_related_actions()
    ↓
搜索查询: "{object_label} 功能 操作 使用方法 {context}"
    ↓
获取搜索结果（标题、摘要、链接）
    ↓
格式化搜索结果并添加到 Prompt
    ↓
AI 模型生成意图（考虑网络资源）
    ↓
返回功能按钮列表
```

## 🎯 功能特性

### 1. 智能搜索查询

- 基于点击的对象标签生成搜索查询
- 自动包含上下文对象信息
- 支持中文搜索（`hl=zh-cn`）

### 2. 结果解析

- 提取标题、摘要、链接
- 限制结果数量（默认 3 条）
- 格式化输出供 AI 使用

### 3. 错误处理

- 如果 API Key 未配置，自动跳过搜索
- 网络错误时优雅降级
- 不影响核心功能

## 💡 使用示例

### 示例 1：点击 "Window"（窗户）

**搜索查询**：`Window 功能 操作 使用方法`

**可能的结果**：
- 窗户清洁方法
- 窗户维修指南
- 智能窗户系统

**生成的意图**：
- 🧹 清洁窗户
- 🔧 维修窗户
- 🌐 查看智能窗户信息
- 🎨 更换窗户样式

### 示例 2：点击 "Phone booth"（电话亭）

**搜索查询**：`Phone booth 功能 操作 使用方法`

**可能的结果**：
- 电话亭历史
- 电话亭改造案例
- 电话亭设计灵感

**生成的意图**：
- 📞 拨打电话
- 🎨 改造设计
- 📚 了解更多
- 🗑️ 移除

## 🔍 技术细节

### SerpService 类

```python
class SerpService:
    async def search(query: str, num_results: int = 5) -> List[Dict]
    async def search_related_actions(object_label: str, context: List[str]) -> str
```

### 集成点

在 `AIService.infer_intent()` 方法中：

```python
# 搜索相关信息
if self.enable_web_search and self.serp_service:
    web_context = await self.serp_service.search_related_actions(
        clicked_label, 
        nearby_labels
    )

# 将搜索结果添加到 Prompt
prompt = f"""
{base_prompt}
{web_context}
...
"""
```

## ⚙️ 配置选项

### 搜索参数

在 `backend/services/serp_service.py` 中可调整：

- `num_results`: 返回结果数量（默认 5）
- `engine`: 搜索引擎（默认 "google"）
- `hl`: 语言设置（默认 "zh-cn"）
- `timeout`: 请求超时时间（默认 10 秒）

## 🐛 故障排除

### 问题 1：搜索未执行

**原因**：`SERP_API_KEY` 未配置

**解决**：在 `.env` 文件中添加 `SERP_API_KEY=你的密钥`

### 问题 2：搜索结果为空

**原因**：网络错误或 API 限制

**解决**：检查网络连接和 API 配额

### 问题 3：搜索速度慢

**原因**：网络延迟或 API 响应慢

**解决**：调整 `timeout` 参数，或考虑缓存搜索结果

## 📈 未来改进

- [ ] 缓存搜索结果（避免重复搜索）
- [ ] 支持多个搜索引擎（Bing、DuckDuckGo）
- [ ] 图像搜索集成（搜索相似图像）
- [ ] 搜索结果排序和过滤
- [ ] 支持自定义搜索查询模板

## 📝 注意事项

1. **API 配额**：SerpAPI 有免费和付费计划，注意使用限制
2. **隐私**：搜索查询可能包含用户上下文信息
3. **性能**：网络搜索会增加响应时间，建议异步处理
4. **降级策略**：如果搜索失败，系统会自动降级到纯图像推理


