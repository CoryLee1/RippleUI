# 部署状态检查清单

## ✅ 当前部署信息

### 前端（Vercel）
- **URL**: `ripple-ui-beta.vercel.app`
- **状态**: ✅ 已部署
- **预览**: 显示操作说明界面

### 后端（Railway）
- **URL**: `rippleui-production.up.railway.app`
- **状态**: ✅ 已部署
- **端口**: 8000
- **私有网络**: `rippleui.railway.internal`

## 🔧 配置检查

### 1. 前端环境变量（Vercel）

在 Vercel Dashboard → Settings → Environment Variables 中确认：

```
VITE_API_URL = https://rippleui-production.up.railway.app/api
```

**重要**：
- ✅ 使用 HTTPS（不是 HTTP）
- ✅ 包含 `/api` 后缀
- ✅ 使用 Railway 的公共域名

### 2. 后端 CORS 配置（Railway）

在 Railway Dashboard → Settings → Variables 中添加（可选但推荐）：

```
CORS_ORIGINS = https://ripple-ui-beta.vercel.app
```

或者在 `backend/main.py` 中已配置为允许所有来源（开发阶段）。

### 3. 后端环境变量（Railway）

确认已设置：
```
GOOGLE_API_KEY = 你的_GEMINI_API_KEY
SERP_API_KEY = 你的_SERP_API_KEY（可选）
```

## 🧪 测试连接

### 测试后端

```bash
# 健康检查
curl https://rippleui-production.up.railway.app/

# 应该返回：
# {"status":"Ripple UI Backend is running"}
```

### 测试前端

1. 访问：`https://ripple-ui-beta.vercel.app`
2. 上传一张图片
3. 检查浏览器控制台（F12）：
   - 查看 Network 标签
   - 确认 API 请求是否成功
   - 检查是否有 CORS 错误

### 测试完整流程

1. ✅ 上传图片 → 应该识别物体
2. ✅ 点击物体 → 应该显示涟漪菜单
3. ✅ 选择意图 → 应该执行相应操作

## 🐛 常见问题排查

### 问题 1：前端无法连接后端

**症状**：上传图片后没有反应，或显示错误

**检查**：
- [ ] Vercel 环境变量 `VITE_API_URL` 是否正确
- [ ] 是否包含 `/api` 后缀
- [ ] 浏览器控制台是否有错误

**解决**：
1. 在 Vercel Dashboard → Settings → Environment Variables 检查
2. 确认后重新部署前端（或等待自动部署）

### 问题 2：CORS 错误

**症状**：浏览器控制台显示 CORS 错误

**检查**：
- [ ] Railway Variables 中是否有 `CORS_ORIGINS`
- [ ] 前端 URL 是否正确添加到 CORS 列表

**解决**：
1. 在 Railway → Settings → Variables 添加：
   ```
   CORS_ORIGINS = https://ripple-ui-beta.vercel.app
   ```
2. 重启 Railway 服务

### 问题 3：API 返回 404

**检查**：
- [ ] URL 是否包含 `/api` 前缀
- [ ] Railway 服务是否正常运行
- [ ] 查看 Railway 日志

### 问题 4：图片上传失败

**检查**：
- [ ] 后端服务是否正常运行
- [ ] 查看 Railway 日志
- [ ] 检查文件大小限制

## 📝 快速验证命令

```bash
# 1. 测试后端健康
curl https://rippleui-production.up.railway.app/

# 2. 测试 API 端点（需要先上传图片）
curl -X POST https://rippleui-production.up.railway.app/api/analyze \
  -F "file=@test-image.jpg"

# 3. 检查前端环境变量（在浏览器控制台）
console.log(import.meta.env.VITE_API_URL)
```

## 🎯 下一步

1. ✅ 验证前后端连接
2. ✅ 测试完整功能流程
3. ✅ 检查错误日志
4. ✅ 优化性能（如需要）

## 📞 需要帮助？

如果遇到问题：
1. 查看 Railway 日志：Railway Dashboard → Deployments → Logs
2. 查看 Vercel 日志：Vercel Dashboard → Deployments → Runtime Logs
3. 检查浏览器控制台错误信息

