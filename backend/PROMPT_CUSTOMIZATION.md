# Prompt 自定义指南

## 📍 Prompt 位置

意图推理的 Prompt 位于：**`backend/services/ai_service.py`** 的 `infer_intent()` 方法中（约第 138-204 行）

## 🎯 设计理念

**从用户意图出发**：Prompt 的设计遵循"用户优先"原则，先思考"用户点击这个物体时想要什么"，再提供相应的功能，而不是先预设功能类型。

## 🎯 主要 Prompt 区域

### 1. 基础 Prompt（第 117-120 行）

```python
base_prompt = f"""
User clicked on a '{clicked_label}' in the image.
Context objects nearby: {nearby_labels}.
"""
```

### 2. 完整 Prompt（第 138-204 行）

这是主要的 Prompt，采用**用户意图优先**的设计：

**核心流程**：
1. **Step 1: 分析用户意图** - 思考用户点击时的真实想法
2. **Step 2: 基于意图生成功能** - 为每个意图提供最合适的操作
3. **Step 3: 返回动作列表** - 4-6 个符合用户意图的动作

**关键设计**：
- 从"用户想要什么"出发，而不是"我能提供什么功能"
- 自然识别用户意图（想改变外观、想了解更多、想购买等）
- 对于商品，自然地提供 eBay 搜索（因为用户有购买意图）
- 保持创意探索的可能性

## 🔧 如何调整 Prompt

### 修改商品检测关键词

在第 121-123 行：

```python
product_keywords = ['clothing', 'clothes', 'shirt', 'dress', 'jacket', 'shoe', 'bag', 
                  'accessory', 'product', 'item', '商品', '衣服', '鞋子', '包', '配饰']
```

**添加更多关键词**：
```python
product_keywords = ['clothing', 'clothes', 'shirt', 'dress', 'jacket', 'shoe', 'bag', 
                  'accessory', 'product', 'item', '商品', '衣服', '鞋子', '包', '配饰',
                  'watch', 'jewelry', 'sunglasses', 'hat', '手表', '珠宝', '太阳镜', '帽子']
```

### 调整 eBay 搜索格式

在第 156-157 行（Search 部分）：

```python
4. **Search** (action_type: "search"): Search for related content
   - **For products: Include eBay search** (search_query should be formatted for eBay: "{clicked_label} site:ebay.com" or "{clicked_label} ebay")
```

**修改搜索格式**：
```python
- **For products: Include eBay search** (search_query: "{clicked_label} site:ebay.com" or "ebay {clicked_label}")
```

### 调整创意使用保证

在第 141-144 行（Image Edit 部分）：

```python
1. **Image Edit** (action_type: "edit"): Modify the image itself
   - Creative: Recolor, Change Style, Enhance, Apply filters
   - Destructive: Remove, Replace
   - Transform: Resize, Rotate, Add elements
   - **Always include at least 1-2 creative editing options** to maintain creative usage
```

**修改创意选项数量**：
```python
- **Always include at least 2-3 creative editing options** to maintain creative usage
```

### 调整用户意图分析

在第 144-150 行（Step 1: Analyze user intentions 部分）：

```python
Step 1: Analyze user intentions
Consider what a real person would want to do when they see and click on this object:
- What questions might they have?
- What actions would they naturally want to take?
- What information would be useful to them?
- What creative possibilities interest them?
```

**添加更多意图类型**：
```python
Step 1: Analyze user intentions
Consider what a real person would want to do:
- What questions might they have? (curiosity, learning)
- What actions would they naturally want to take? (practical needs)
- What information would be useful? (decision making)
- What creative possibilities interest them? (exploration, fun)
- What problems might they want to solve? (removal, replacement)
- What comparisons might they want? (similar items, alternatives)
```

### 调整商品处理规则

在第 175-180 行（Guidelines 部分）：

```python
- **Product context**: If '{clicked_label}' is a product (clothing, shoes, bags, accessories), 
  users naturally want to: find where to buy it, see prices, compare options → provide eBay search naturally
```

**修改商品处理规则**：
```python
- **Product context**: If '{clicked_label}' is a product, users naturally want to:
  * Find where to buy it → eBay search
  * See prices and compare → Multiple search options
  * Learn about the product → Information action
  * See how it looks in different styles → Creative editing options
```

## 📝 完整 Prompt 结构

```
1. 基础信息（点击的物体、上下文）
   ↓
2. 网络搜索结果（如果启用）
   ↓
3. 用户意图分析（核心）
   - Step 1: 分析用户真实意图
     * 用户可能想要什么？
     * 用户会问什么问题？
     * 用户会采取什么行动？
   ↓
4. 基于意图生成功能
   - Image Edit（当用户想修改图像时）
   - Information（当用户想了解更多时）
   - Navigate（当用户想访问资源时）
   - Search（当用户想查找内容时，商品自然包含 eBay）
   ↓
5. 返回格式定义
   ↓
6. 指导原则
   - 用户优先思考
   - 自然意图识别
   - 商品场景自然处理（购买意图 → eBay 搜索）
   - 创意可能性探索
```

## 🎨 自定义示例

### 示例 1：增强创意选项

在 Image Edit 部分添加：

```python
- Creative: Recolor, Change Style, Enhance, Apply filters, Add artistic effects, Create variations
```

### 示例 2：添加更多搜索平台

在 Search 部分添加：

```python
4. **Search** (action_type: "search"): Search for related content
   - **For products: Include multiple platforms**
     * eBay: "{clicked_label} site:ebay.com"
     * Amazon: "{clicked_label} site:amazon.com"
     * Google Shopping: "{clicked_label} shopping"
```

### 示例 3：调整意图数量

在开头部分修改：

```python
predict 6-8 distinct user intents (actions) for this object.
```

## ⚠️ 注意事项

1. **保持 JSON 格式**：确保 Prompt 中的 JSON 示例格式正确
2. **平衡创意和实用**：不要完全移除创意选项
3. **测试修改**：每次修改后测试生成的结果
4. **温度设置**：当前设置为 0.7，可以根据需要调整（第 194 行）

## 🔍 调试技巧

1. **查看日志**：检查控制台输出的搜索和推理结果
2. **测试不同物体**：测试商品和非商品物体
3. **验证 JSON**：确保 AI 返回的 JSON 格式正确
4. **检查 action_data**：验证 eBay 搜索查询格式是否正确

## 📚 相关文件

- **Prompt 定义**：`backend/services/ai_service.py` (第 111-220 行)
- **SERP 服务**：`backend/services/serp_service.py`
- **数据模型**：`backend/schemas.py` (RippleIntent)
- **API 端点**：`backend/main.py` (execute_action)

