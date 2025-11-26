# Vercel 环境变量配置指南

## 🔧 正确配置 VITE_API_URL

### 问题诊断

如果看到 404 错误，URL 中有双斜杠 `//analyze`，说明环境变量配置不正确。

### ✅ 正确配置

在 Vercel Dashboard → Settings → Environment Variables：

**Key**: `VITE_API_URL`

**Value**（选择一种）：
```
https://rippleui-production.up.railway.app/api
```

**重要**：
- ✅ 包含 `/api` 后缀
- ✅ 使用 HTTPS
- ✅ **不要**末尾斜杠（`/`）
- ✅ **不要**只写域名（会缺少 `/api`）

### ❌ 错误配置示例

```
❌ https://rippleui-production.up.railway.app/api/  (末尾有斜杠，会导致双斜杠)
❌ https://rippleui-production.up.railway.app/      (缺少 /api)
❌ https://rippleui-production.up.railway.app       (缺少 /api)
❌ http://rippleui-production.up.railway.app/api    (使用 HTTP 而不是 HTTPS)
```

## 📝 配置步骤

### 1. 访问 Vercel Dashboard

1. 登录 [Vercel](https://vercel.com)
2. 选择项目 `ripple-ui`
3. 进入 **Settings** → **Environment Variables**

### 2. 添加环境变量

1. 点击 **"Add New"** 按钮
2. **Key**: `VITE_API_URL`
3. **Value**: `https://rippleui-production.up.railway.app/api`
4. **Environment**: 选择所有环境（Production, Preview, Development）
5. 点击 **"Save"**

### 3. 重新部署

环境变量更新后，需要重新部署：

1. 进入 **Deployments** 标签
2. 点击最新部署右侧的 **"..."** 菜单
3. 选择 **"Redeploy"**
4. 或直接 push 新代码触发自动部署

## 🔍 验证配置

### 方法 1：检查构建日志

在 Vercel Dashboard → Deployments → 查看构建日志，确认环境变量已加载。

### 方法 2：浏览器控制台

部署后，在浏览器控制台运行：

```javascript
console.log('API URL:', import.meta.env.VITE_API_URL)
```

应该显示：
```
API URL: https://rippleui-production.up.railway.app/api
```

### 方法 3：网络请求检查

1. 打开浏览器开发者工具（F12）
2. 进入 **Network** 标签
3. 上传一张图片
4. 查看请求 URL：
   - ✅ 正确：`https://rippleui-production.up.railway.app/api/analyze`
   - ❌ 错误：`https://rippleui-production.up.railway.app//analyze`（双斜杠）

## 🐛 故障排除

### 问题 1：仍然显示 404

**检查**：
1. 确认环境变量已保存
2. 确认已重新部署
3. 清除浏览器缓存（Ctrl+Shift+R）

### 问题 2：双斜杠问题

**原因**：环境变量末尾有斜杠，或配置不正确

**解决**：
1. 检查 Vercel 环境变量，确保值为：`https://rippleui-production.up.railway.app/api`（无末尾斜杠）
2. 重新部署

### 问题 3：环境变量未生效

**解决**：
1. 确认变量名是 `VITE_API_URL`（大小写敏感）
2. 确认选择了正确的环境（Production）
3. 重新部署项目

## 📋 完整环境变量列表

在 Vercel 中需要设置：

```
VITE_API_URL = https://rippleui-production.up.railway.app/api
```

**注意**：前端只需要这一个环境变量，其他配置在后端（Railway）。

## 🔄 更新后的代码

前端代码已更新，会自动处理 URL 末尾斜杠问题，但最好还是正确配置环境变量。


