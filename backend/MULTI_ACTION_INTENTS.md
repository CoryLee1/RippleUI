# 多类型意图系统文档

## 📋 概述

RippleUI 现在支持多种操作类型的功能按钮，不仅限于图像编辑，还包括信息查询、网页导航和搜索功能。系统会自动利用互联网资源（SERP API）来生成更丰富和实用的功能建议。

## 🎯 支持的操作类型

### 1. **图像编辑** (`action_type: "edit"`)
- **功能**：修改图像本身
- **示例**：
  - 🎨 改变颜色
  - 🗑️ 移除物体
  - ✨ 添加元素
  - 🔄 替换样式

### 2. **信息查询** (`action_type: "info"`)
- **功能**：获取关于物体的信息
- **示例**：
  - 📚 了解更多
  - 📖 查看规格
  - 📝 使用说明
  - 🏛️ 历史背景

### 3. **网页导航** (`action_type: "navigate"`)
- **功能**：打开相关的网页链接
- **示例**：
  - 🛒 购买链接
  - 🌐 官方网站
  - 📦 相关产品
  - 🏪 商店页面

### 4. **搜索功能** (`action_type: "search"`)
- **功能**：搜索相关内容
- **示例**：
  - 🔍 搜索相似产品
  - ⭐ 查看评价
  - 📹 教程视频
  - 💬 用户评论

## 🔧 技术实现

### 数据模型

```python
class RippleIntent(BaseModel):
    id: int
    label: str
    emoji: str
    description: str
    color: str
    probability: float
    action_type: str  # "edit" | "info" | "navigate" | "search"
    editor_prompt: str = ""  # 仅用于 action_type="edit"
    action_data: dict = {}  # 其他操作的数据
```

### API 端点

**POST `/api/execute`**

根据 `action_type` 执行不同的操作：

```python
# 图像编辑
{
    "intent_id": 1,
    "action_type": "edit",
    "prompt": "Change color to red",
    "box_json": "[0, 0, 100, 100]",
    "enable_image_edit": "true"
}

# 信息查询
{
    "intent_id": 2,
    "action_type": "info",
    "action_data_json": '{"info_text": "...", "source_url": "..."}'
}

# 网页导航
{
    "intent_id": 3,
    "action_type": "navigate",
    "action_data_json": '{"url": "https://...", "title": "..."}'
}

# 搜索
{
    "intent_id": 4,
    "action_type": "search",
    "action_data_json": '{"search_query": "..."}'
}
```

## 🚀 工作流程

```
用户点击物体
    ↓
SERP API 搜索相关信息
    ↓
AI 生成混合意图（edit + info + navigate + search）
    ↓
用户选择意图
    ↓
根据 action_type 执行相应操作
    ├─ edit → 图像编辑
    ├─ info → 显示信息
    ├─ navigate → 打开链接
    └─ search → 显示搜索结果
```

## 💡 使用示例

### 示例 1：点击 "Window"（窗户）

**生成的意图**：
1. 🎨 **改变颜色** (`edit`) - 修改窗户颜色
2. 📚 **了解更多** (`info`) - 窗户的历史和类型
3. 🛒 **购买窗户** (`navigate`) - 打开购买链接
4. 🔍 **搜索教程** (`search`) - 搜索安装教程

### 示例 2：点击 "Phone booth"（电话亭）

**生成的意图**：
1. 🗑️ **移除** (`edit`) - 从图像中移除
2. 📖 **历史背景** (`info`) - 电话亭的历史
3. 🌐 **查看设计** (`navigate`) - 设计灵感网站
4. ⭐ **查看评价** (`search`) - 搜索相关评价

## 🎨 前端处理

前端会根据 `action_type` 执行不同的操作：

```javascript
if (actionType === 'edit') {
  // 更新图像
  setImage(newImageBase64);
} else if (actionType === 'info') {
  // 显示信息模态框
  showInfoModal(data.info_text);
} else if (actionType === 'navigate') {
  // 打开新标签页
  window.open(data.url, '_blank');
} else if (actionType === 'search') {
  // 显示搜索结果
  showSearchResults(data.results);
}
```

## ⚙️ 配置

### 启用/禁用网络搜索

在 `backend/main.py` 中：

```python
# 启用（默认）
ai_service = AIService(enable_web_search=True)

# 禁用
ai_service = AIService(enable_web_search=False)
```

### 环境变量

```env
GOOGLE_API_KEY=你的_GEMINI_API_KEY
SERP_API_KEY=你的_SERP_API_KEY  # 可选，但推荐
```

## 📊 优势

1. **功能丰富**：不仅限于图像编辑，提供全方位的信息服务
2. **智能推荐**：基于互联网资源生成相关建议
3. **用户体验**：一键访问相关信息、购买链接、教程等
4. **灵活扩展**：易于添加新的操作类型

## 🔮 未来改进

- [ ] 添加操作历史记录
- [ ] 支持自定义操作类型
- [ ] 添加操作预览功能
- [ ] 支持批量操作
- [ ] 添加操作撤销/重做

## 📝 注意事项

1. **API 配额**：SERP API 有使用限制，注意控制搜索频率
2. **性能**：网络搜索会增加响应时间，建议异步处理
3. **隐私**：搜索查询可能包含用户上下文信息
4. **降级策略**：如果搜索失败，系统会自动降级到纯图像推理


