# Railway CORS 配置指南

## 🔧 如何设置 CORS_ORIGINS

### 方法 1：通过 Railway Dashboard（推荐）

1. **访问 Railway Dashboard**
   - 登录 [Railway](https://railway.app)
   - 选择你的项目（RippleUI）
   - 选择服务（backend）

2. **进入设置页面**
   - 点击服务名称进入详情页
   - 点击顶部导航栏的 **"Variables"** 标签

3. **添加环境变量**
   - 点击 **"+ New Variable"** 按钮
   - 在 **Key** 字段输入：`CORS_ORIGINS`
   - 在 **Value** 字段输入：`https://ripple-ui-beta.vercel.app`
   - 点击 **"Add"** 保存

4. **多个域名（可选）**
   如果需要允许多个前端域名，用逗号分隔：
   ```
   https://ripple-ui-beta.vercel.app,https://ripple-ui.vercel.app
   ```

5. **重启服务**
   - 添加环境变量后，Railway 会自动重新部署
   - 或手动点击 **"Redeploy"** 按钮

### 方法 2：通过 Railway CLI

```bash
# 1. 登录 Railway
railway login

# 2. 链接到项目
cd backend
railway link

# 3. 设置环境变量
railway variables set CORS_ORIGINS=https://ripple-ui-beta.vercel.app

# 4. 验证设置
railway variables
```

### 方法 3：通过 railway.json（不推荐，已废弃）

Railway 现在主要使用 Dashboard 或 CLI 来管理环境变量。

## 📝 当前配置

根据你的部署信息：

**前端 URL**：`https://ripple-ui-beta.vercel.app`

**CORS_ORIGINS 应该设置为**：
```
https://ripple-ui-beta.vercel.app
```

## 🔍 验证配置

### 1. 检查环境变量

在 Railway Dashboard → Variables 中确认：
- ✅ `CORS_ORIGINS` 已添加
- ✅ 值正确（包含 `https://`）
- ✅ 没有多余的空格

### 2. 测试 CORS

在浏览器控制台（访问前端页面时）：
```javascript
fetch('https://rippleui-production.up.railway.app/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => console.log('CORS OK:', r))
.catch(e => console.error('CORS Error:', e))
```

### 3. 查看后端日志

在 Railway Dashboard → Deployments → Logs 中：
- 查看是否有 CORS 相关的错误
- 确认服务已重启并加载新配置

## ⚠️ 注意事项

1. **URL 格式**
   - ✅ 正确：`https://ripple-ui-beta.vercel.app`
   - ❌ 错误：`http://ripple-ui-beta.vercel.app`（缺少 s）
   - ❌ 错误：`ripple-ui-beta.vercel.app`（缺少协议）
   - ❌ 错误：`https://ripple-ui-beta.vercel.app/`（末尾不要斜杠）

2. **多个域名**
   - 用逗号分隔，不要有空格：
   ```
   https://domain1.com,https://domain2.com
   ```

3. **通配符**
   - Railway 的 CORS 配置不支持通配符（如 `*.vercel.app`）
   - 需要列出所有具体域名

4. **开发环境**
   - 如果需要本地开发，可以添加：
   ```
   https://ripple-ui-beta.vercel.app,http://localhost:5173
   ```

## 🔄 当前后端代码

后端代码（`backend/main.py`）已支持 CORS_ORIGINS：

```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    ...
)
```

**说明**：
- 如果设置了 `CORS_ORIGINS`，只允许列表中的域名
- 如果没有设置，默认允许所有来源（`*`）

## 🎯 推荐配置

### 生产环境

```
CORS_ORIGINS = https://ripple-ui-beta.vercel.app
```

### 开发环境（如果需要）

```
CORS_ORIGINS = https://ripple-ui-beta.vercel.app,http://localhost:5173
```

## 🐛 故障排除

### 问题：CORS 仍然报错

1. **确认服务已重启**
   - 添加环境变量后，Railway 会自动重新部署
   - 等待部署完成（通常 1-2 分钟）

2. **检查 URL 格式**
   - 确保使用 HTTPS
   - 确保没有多余的空格或斜杠

3. **清除浏览器缓存**
   - 硬刷新：`Ctrl+Shift+R` (Windows) 或 `Cmd+Shift+R` (Mac)

4. **查看 Railway 日志**
   - 确认环境变量已加载
   - 查看是否有其他错误

### 问题：环境变量未生效

1. **确认变量名**
   - 必须是 `CORS_ORIGINS`（全大写，下划线）

2. **重启服务**
   - 在 Railway Dashboard → Deployments → 点击 "Redeploy"

3. **检查代码**
   - 确认 `backend/main.py` 中使用了 `os.getenv("CORS_ORIGINS")`

## 📚 相关文档

- [Railway 环境变量文档](https://docs.railway.app/develop/variables)
- [FastAPI CORS 文档](https://fastapi.tiangolo.com/tutorial/cors/)

