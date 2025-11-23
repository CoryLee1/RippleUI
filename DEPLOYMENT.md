# RippleUI 部署指南

## 📋 部署概览

RippleUI 包含前端（React + Vite）和后端（FastAPI），可以分别部署或使用容器化部署。

## 🚀 部署方案

### 方案 1：分离部署（推荐）

- **前端**：Vercel / Netlify（免费，自动 HTTPS）
- **后端**：Railway / Render / Fly.io（支持 Python）

### 方案 2：容器化部署

- **Docker Compose**：本地或云服务器
- **Kubernetes**：大规模部署

### 方案 3：全栈平台

- **Vercel**：前端 + Serverless Functions（需要改造）
- **Railway**：前后端一起部署

---

## 🎯 方案 1：分离部署（推荐）

### 后端部署（Railway / Render）

#### 使用 Railway（推荐）

1. **准备部署文件**

创建 `backend/Procfile`（Railway 会自动识别）：
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

2. **部署步骤**

```bash
# 1. 安装 Railway CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
cd backend
railway init

# 4. 添加环境变量
railway variables set GOOGLE_API_KEY=你的密钥
railway variables set SERP_API_KEY=你的密钥（可选）

# 5. 部署
railway up
```

3. **配置网络访问**

部署完成后，在 Railway Dashboard：

**选项 A：使用公共域名（推荐用于前端调用）**
- 进入服务设置 → Networking
- 点击 "Generate Domain" 生成公共域名
- 或点击 "Custom Domain" 添加自定义域名
- 获取的 URL 格式：`https://rippleui-production.up.railway.app`

**选项 B：使用私有网络（用于内部服务通信）**
- Railway 自动提供私有网络地址：`rippleui.railway.internal`
- 仅在同一 Railway 项目内的服务间可用
- 格式：`http://rippleui.railway.internal:8000`

4. **获取后端 URL**

- **公共 URL**：在 Railway Dashboard → Settings → Networking → Public Networking 中查看
- **私有 URL**：`http://rippleui.railway.internal:8000`（仅内部服务可用）

**示例公共 URL**：
```
https://rippleui-production.up.railway.app
```

#### 使用 Render

1. **创建 `render.yaml`**（在项目根目录）：

```yaml
services:
  - type: web
    name: rippleui-backend
    env: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
      - key: SERP_API_KEY
        sync: false
```

2. **在 Render 控制台**：
   - 连接 GitHub 仓库
   - 选择 "New Web Service"
   - 选择仓库和 `render.yaml`
   - 添加环境变量
   - 部署

### 前端部署（Vercel / Netlify）

#### 使用 Vercel（推荐）

1. **修改前端 API URL**

创建 `frontend/.env.production`：
```env
VITE_API_URL=https://rippleui-production.up.railway.app/
```

修改 `frontend/src/App.jsx`：
```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
```

2. **部署步骤**

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd frontend
vercel

# 4. 添加环境变量（如果需要）
vercel env add VITE_API_URL
```

或者直接在 [Vercel Dashboard](https://vercel.com)：
- 导入 GitHub 仓库
- 根目录设置为 `frontend`
- 构建命令：`npm run build`
- 输出目录：`dist`
- 添加环境变量：`VITE_API_URL`

#### 使用 Netlify

1. **创建 `netlify.toml`**（在 `frontend/` 目录）：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **部署步骤**

```bash
# 1. 安装 Netlify CLI
npm i -g netlify-cli

# 2. 登录
netlify login

# 3. 部署
cd frontend
netlify deploy --prod
```

---

## 🐳 方案 2：Docker 部署

### 创建 Dockerfile

#### 后端 Dockerfile（`backend/Dockerfile`）

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 前端 Dockerfile（`frontend/Dockerfile`）

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 构建
COPY . .
RUN npm run build

# 生产环境
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 前端 Nginx 配置（`frontend/nginx.conf`）

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（可选）
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Docker Compose（`docker-compose.yml`）

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - SERP_API_KEY=${SERP_API_KEY}
    volumes:
      - ./backend:/app
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

### 部署步骤

```bash
# 1. 创建 .env 文件
cp .env.example .env
# 编辑 .env 添加 API keys

# 2. 构建和启动
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 停止
docker-compose down
```

---

## 🔧 生产环境优化

### 后端优化

#### 1. 更新 `backend/main.py`

```python
import uvicorn

if __name__ == "__main__":
    # 开发环境
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
else:
    # 生产环境（通过 gunicorn）
    # gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
    pass
```

#### 2. 添加 Gunicorn（可选，用于多进程）

更新 `backend/requirements.txt`：
```
gunicorn
uvicorn[standard]
```

创建 `backend/gunicorn_config.py`：
```python
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
```

#### 3. CORS 配置（生产环境）

更新 `backend/main.py`：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.vercel.app",
        "https://your-frontend-domain.netlify.app",
    ],  # 替换为实际的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 前端优化

#### 1. 环境变量配置

创建 `frontend/.env.production`：
```env
VITE_API_URL=https://your-backend-url.railway.app
```

创建 `frontend/.env.development`：
```env
VITE_API_URL=http://localhost:8000/api
```

#### 2. 更新 API URL

修改 `frontend/src/App.jsx`：
```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
```

#### 3. 构建优化

`frontend/vite.config.js`：
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
```

---

## 📝 部署检查清单

### 后端

- [ ] 环境变量已配置（`GOOGLE_API_KEY`, `SERP_API_KEY`）
- [ ] CORS 已配置允许前端域名
- [ ] 端口配置正确（使用 `$PORT` 环境变量）
- [ ] 依赖已安装（`requirements.txt`）
- [ ] 日志输出正常

### 前端

- [ ] API URL 已更新为后端地址
- [ ] 环境变量已配置（`VITE_API_URL`）
- [ ] 构建成功（`npm run build`）
- [ ] 静态文件正确部署
- [ ] SPA 路由配置正确（所有路由指向 `index.html`）

### 通用

- [ ] HTTPS 已启用
- [ ] 域名已配置（可选）
- [ ] 监控和日志已设置
- [ ] 错误处理已完善

---

## 🌐 平台对比

| 平台 | 前端 | 后端 | 免费额度 | 推荐度 |
|------|------|------|----------|--------|
| **Vercel** | ✅ 优秀 | ⚠️ Serverless | 100GB 带宽 | ⭐⭐⭐⭐⭐ |
| **Netlify** | ✅ 优秀 | ⚠️ Serverless | 100GB 带宽 | ⭐⭐⭐⭐ |
| **Railway** | ⚠️ 可部署 | ✅ 优秀 | $5 免费额度 | ⭐⭐⭐⭐⭐ |
| **Render** | ⚠️ 可部署 | ✅ 优秀 | 免费（有休眠） | ⭐⭐⭐⭐ |
| **Fly.io** | ⚠️ 可部署 | ✅ 优秀 | 3 个免费实例 | ⭐⭐⭐⭐ |
| **Docker** | ✅ 灵活 | ✅ 灵活 | 自托管 | ⭐⭐⭐ |

---

## 🚀 快速部署（推荐组合）

### 最简单：Vercel + Railway

1. **后端（Railway）**
   ```bash
   cd backend
   railway init
   railway up
   ```
   
   在 Railway Dashboard：
   - Settings → Networking → 点击 "Generate Domain" 获取公共 URL
   - Settings → Variables → 添加 `GOOGLE_API_KEY` 和 `SERP_API_KEY`

2. **前端（Vercel）**
   ```bash
   cd frontend
   vercel
   ```

3. **配置环境变量**

   **Railway（后端）**：
   - 进入 Settings → Variables
   - 添加以下变量：
     ```
     GOOGLE_API_KEY = 你的_GEMINI_API_KEY
     SERP_API_KEY = 你的_SERP_API_KEY（可选）
     CORS_ORIGINS = https://your-frontend.vercel.app（可选，用于限制 CORS）
     ```
   
   **Vercel（前端）**：
   - 进入项目设置 → Environment Variables
   - 添加：
     ```
     VITE_API_URL = https://rippleui-production.up.railway.app/api
     ```
   - **重要**：
     * 使用 Railway 提供的公共域名（在 Networking 页面查看）
     * 确保 URL 包含 `/api` 后缀
     * 使用 HTTPS（不是 HTTP）
   
   **示例配置**：
   - Railway 公共域名：`https://rippleui-production.up.railway.app`
   - Vercel 环境变量：`VITE_API_URL=https://rippleui-production.up.railway.app/api`

---

## 🔍 故障排除

### 后端无法访问

- 检查端口配置（使用 `$PORT` 或 `0.0.0.0`）
- 检查防火墙设置
- 查看日志：`railway logs` 或平台日志

### 前端 API 调用失败

- 检查 CORS 配置
- 确认 `VITE_API_URL` 正确
- 检查浏览器控制台错误

### 环境变量未生效

- 确认变量名正确
- 重启服务
- 检查 `.env` 文件格式

---

## 📚 参考资源

- [Railway 文档](https://docs.railway.app/)
- [Vercel 文档](https://vercel.com/docs)
- [FastAPI 部署](https://fastapi.tiangolo.com/deployment/)
- [Vite 部署](https://vitejs.dev/guide/static-deploy.html)

