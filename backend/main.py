from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.ai_service import AIService
from services.utils import image_to_base64
from schemas import AnalysisResponse, InferenceResponse
import uvicorn
from PIL import Image
import io

app = FastAPI(title="Ripple UI Backend")

# 允许跨域 (供 Vite 前端调用)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 AI 服务
ai_service = AIService()

# 内存缓存 (MVP 简化版，生产环境应用 Redis)
# 格式: { "image_id": { "image_data": PIL.Image, "objects": [...] } }
GLOBAL_CACHE = {}

@app.get("/")
def read_root():
    return {"status": "Ripple UI Backend is running"}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    阶段 1: 上传并预分析图片
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # 1. AI 分析全图物体
        detected_objects = await ai_service.analyze_scene(image)
        
        # 2. 缓存图片和结果 (简单的 session 机制)
        # 实际项目中应该返回一个 session_id
        GLOBAL_CACHE["current_image"] = image
        GLOBAL_CACHE["objects"] = detected_objects
        
        return AnalysisResponse(
            objects=detected_objects,
            image_width=image.width,
            image_height=image.height
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/infer", response_model=InferenceResponse)
async def infer_intent(
    clicked_label: str = Form(...),
    click_x: int = Form(...),
    click_y: int = Form(...)
):
    """
    阶段 2: 点击触发意图推理
    """
    try:
        image = GLOBAL_CACHE.get("current_image")
        if not image:
            print("❌ Error: No image in cache")
            raise HTTPException(status_code=400, detail="No image uploaded. Please upload an image first.")
        
        # 简单的上下文获取 (获取周围物体)
        nearby_labels = [obj.label for obj in GLOBAL_CACHE.get("objects", [])][:5]
        
        print(f"🔍 Inferring intent for: {clicked_label} at ({click_x}, {click_y})")
        
        # AI 推理
        intents = await ai_service.infer_intent(image, clicked_label, nearby_labels)
        
        print(f"✅ Found {len(intents)} intents")
        return InferenceResponse(intents=intents)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/api/execute")
async def execute_action(
    prompt: str = Form(...),
    box_json: str = Form(...), # 接收 JSON 字符串格式的 box
    enable_image_edit: str = Form("true") # 接收字符串，然后转换为布尔值
):
    """
    阶段 3: 执行编辑 (Gemini Image Editing)
    """
    import json
    try:
        # 将字符串转换为布尔值
        enable_edit = enable_image_edit.lower() in ("true", "1", "yes", "on")
        
        box_2d = json.loads(box_json)
        image = GLOBAL_CACHE.get("current_image")
        
        if not image:
            print("❌ Error: No image in cache")
            raise HTTPException(status_code=400, detail="No image context. Please upload an image first.")
        
        print(f"🎨 Executing edit: {prompt}")
        print(f"📦 Box: {box_2d}")
        print(f"🔄 Enable edit: {enable_edit}")

        # 调用图像编辑模型执行
        new_image = await ai_service.execute_edit(image.copy(), prompt, box_2d, enable_edit)
        
        # 更新缓存
        GLOBAL_CACHE["current_image"] = new_image
        
        print("✅ Edit completed successfully")
        return {"status": "success", "image_base64": image_to_base64(new_image)}
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid box_json format: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Execute error: {e}")
        raise HTTPException(status_code=500, detail=f"Execute error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

