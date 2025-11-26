# 快速部署指南

## 🚀 使用 Railway 后端 + Vercel 前端

### 步骤 1：部署后端到 Railway

1. **访问 [Railway](https://railway.app)**
   - 使用 GitHub 登录
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择 RippleUI 仓库

2. **配置服务**
   - Root Directory: `backend`
   - Railway 会自动检测 Python 项目

3. **设置环境变量**
   - Settings → Variables → 添加：
     ```
     GOOGLE_API_KEY=你的_GEMINI_API_KEY
     SERP_API_KEY=你的_SERP_API_KEY（可选）
     ```

4. **获取公共 URL**
   - Settings → Networking → 查看公共域名
   - 示例：`https://rippleui-production.up.railway.app`
   - 复制这个 URL，稍后用于前端配置

### 步骤 2：部署前端到 Vercel

1. **访问 [Vercel](https://vercel.com)**
   - 使用 GitHub 登录
   - 点击 "Add New Project"
   - 导入 RippleUI 仓库

2. **配置项目**
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **设置环境变量**
   - Settings → Environment Variables → 添加：
     ```
     VITE_API_URL = https://rippleui-production.up.railway.app/api
     ```
   - **重要**：替换为你的实际 Railway URL，并确保包含 `/api` 后缀

4. **部署**
   - 点击 "Deploy"
   - 等待构建完成
   - 获取前端 URL，例如：`https://rippleui.vercel.app`

### 步骤 3：配置 CORS（可选但推荐）

在 Railway → Settings → Variables 添加：
```
CORS_ORIGINS = https://rippleui.vercel.app
```

### 步骤 4：验证部署

1. **测试后端**
   ```bash
   curl https://rippleui-production.up.railway.app/
   # 应该返回: {"status":"Ripple UI Backend is running"}
   ```

2. **测试前端**
   - 访问 Vercel 提供的前端 URL
   - 上传一张图片
   - 点击物体，查看是否正常生成意图菜单

## 🔧 常见问题

### 问题 1：前端无法连接后端

**检查**：
- [ ] `VITE_API_URL` 是否正确（包含 `/api` 后缀）
- [ ] Railway 公共域名是否已生成
- [ ] CORS 是否配置正确

**解决**：
```bash
# 在 Vercel 环境变量中检查
VITE_API_URL=https://rippleui-production.up.railway.app/api
```

### 问题 2：CORS 错误

**解决**：
1. 在 Railway Variables 中添加：
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
2. 重启 Railway 服务

### 问题 3：API 调用 404

**检查**：
- [ ] URL 是否包含 `/api` 前缀
- [ ] Railway 服务是否正常运行
- [ ] 查看 Railway 日志确认服务已启动

## 📝 部署检查清单

### 后端（Railway）
- [ ] 服务已部署并运行
- [ ] 公共域名已生成
- [ ] 环境变量已配置（`GOOGLE_API_KEY`, `SERP_API_KEY`）
- [ ] 健康检查通过（访问 `/` 端点）

### 前端（Vercel）
- [ ] 项目已部署
- [ ] 环境变量 `VITE_API_URL` 已设置
- [ ] URL 包含 `/api` 后缀
- [ ] 使用 HTTPS

### 连接
- [ ] CORS 已配置（可选）
- [ ] 前端可以访问后端 API
- [ ] 测试上传图片功能
- [ ] 测试点击物体生成意图功能

## 🎉 完成！

部署完成后，你的应用应该可以：
- ✅ 上传图片并识别物体
- ✅ 点击物体生成意图菜单
- ✅ 执行图像编辑
- ✅ 查询信息、导航、搜索（如果配置了 SERP API）

访问你的 Vercel URL 开始使用！


