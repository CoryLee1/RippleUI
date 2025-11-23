# Railway 后端部署详细指南

## 🚂 Railway 部署步骤

### 1. 初始设置

#### 方法 A：通过 Railway Dashboard（推荐）

1. **访问 [Railway](https://railway.app)**
   - 使用 GitHub 账号登录
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 RippleUI 仓库

2. **配置服务**
   - Railway 会自动检测到 `backend/` 目录
   - 或手动选择根目录并设置：
     - **Root Directory**: `backend`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### 方法 B：通过 Railway CLI

```bash
# 1. 安装 CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
cd backend
railway init

# 4. 链接到现有项目或创建新项目
railway link
```

### 2. 配置环境变量

在 Railway Dashboard → Settings → Variables：

```env
GOOGLE_API_KEY=你的_GEMINI_API_KEY
SERP_API_KEY=你的_SERP_API_KEY（可选）
CORS_ORIGINS=https://your-frontend.vercel.app（可选）
```

或使用 CLI：

```bash
railway variables set GOOGLE_API_KEY=你的密钥
railway variables set SERP_API_KEY=你的密钥
```

### 3. 配置网络访问

#### 公共网络（用于前端调用）

1. **生成公共域名**
   - 进入 Settings → Networking
   - 点击 "Generate Domain"
   - Railway 会自动生成一个域名，例如：
     ```
     https://rippleui-production.up.railway.app
     ```

2. **自定义域名（可选）**
   - 点击 "Custom Domain"
   - 输入你的域名（如 `api.yourdomain.com`）
   - 按照提示配置 DNS 记录

#### 私有网络（用于内部服务）

- Railway 自动提供私有网络地址
- 格式：`http://rippleui.railway.internal`
- 仅在同一 Railway 项目内的服务间可用
- 无需额外配置

### 4. 获取后端 URL

**公共 URL**（用于前端）：
```
https://rippleui-production.up.railway.app
```

**API 端点**：
```
https://rippleui-production.up.railway.app/api/analyze
https://rippleui-production.up.railway.app/api/infer
https://rippleui-production.up.railway.app/api/execute
```

**注意**：Railway 的公共域名格式为 `{service-name}-{environment}.up.railway.app`，端口会自动映射到 8000。

### 5. 验证部署

```bash
# 测试健康检查
curl https://rippleui-production.up.railway.app/

# 应该返回：
# {"status":"Ripple UI Backend is running"}
```

## 🔧 配置说明

### Procfile

Railway 会自动识别 `backend/Procfile`：

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 端口配置

Railway 会自动设置 `$PORT` 环境变量，代码中无需硬编码端口。

### CORS 配置

如果前端部署在 Vercel，更新 `backend/main.py` 的 CORS 配置：

```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
```

在 Railway Variables 中设置：
```
CORS_ORIGINS=https://your-app.vercel.app
```

## 📊 监控和日志

### 查看日志

**Dashboard**：
- 进入服务 → Deployments → 选择部署 → 查看日志

**CLI**：
```bash
railway logs
```

### 查看指标

- 进入服务 → Metrics
- 查看 CPU、内存、网络使用情况

## 🔄 更新部署

### 自动部署（推荐）

- 连接 GitHub 仓库后，每次 push 到主分支会自动部署
- 在 Settings → Source → 配置分支和自动部署

### 手动部署

```bash
railway up
```

## 🐛 故障排除

### 服务无法启动

1. **检查日志**
   ```bash
   railway logs
   ```

2. **检查环境变量**
   - 确认 `GOOGLE_API_KEY` 已设置
   - 确认所有必需变量都存在

3. **检查端口**
   - 确保使用 `$PORT` 而不是硬编码端口
   - 确保使用 `0.0.0.0` 作为 host

### CORS 错误

1. **检查 CORS 配置**
   - 确认前端 URL 在 `CORS_ORIGINS` 中
   - 或临时设置为 `*` 进行测试

2. **检查前端 API URL**
   - 确认使用 HTTPS（不是 HTTP）
   - 确认 URL 包含 `/api` 后缀

### 依赖安装失败

1. **检查 requirements.txt**
   - 确保所有依赖都列出
   - 检查 Python 版本兼容性

2. **查看构建日志**
   - 在 Deployments 中查看构建过程
   - 检查是否有依赖冲突

## 📝 最佳实践

1. **使用环境变量**
   - 不要硬编码 API keys
   - 使用 Railway Variables 管理敏感信息

2. **监控资源使用**
   - 定期查看 Metrics
   - 根据使用情况调整资源限制

3. **设置健康检查**
   - Railway 会自动检查服务状态
   - 确保 `/` 端点返回成功响应

4. **配置自动部署**
   - 连接 GitHub 实现 CI/CD
   - 使用分支保护确保稳定性

## 🔗 相关链接

- [Railway 文档](https://docs.railway.app/)
- [Railway 定价](https://railway.app/pricing)
- [FastAPI 部署指南](https://fastapi.tiangolo.com/deployment/)

