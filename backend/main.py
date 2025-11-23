from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.ai_service import AIService
from services.utils import image_to_base64
from schemas import AnalysisResponse, InferenceResponse
import uvicorn
from PIL import Image
import io
import os

app = FastAPI(title="Ripple UI Backend")

# 允许跨域 (供 Vite 前端调用)
# 生产环境：替换为实际的前端域名
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 AI 服务（启用网络搜索）
ai_service = AIService(enable_web_search=True)

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
    intent_id: int = Form(...),
    action_type: str = Form(...),
    prompt: str = Form(None),  # 可选：图像编辑提示词
    box_json: str = Form(None),  # 可选：边界框
    action_data_json: str = Form(None),  # 可选：其他操作数据
    enable_image_edit: str = Form("true")
):
    """
    阶段 3: 执行操作（支持多种操作类型）
    - edit: 图像编辑
    - info: 返回信息
    - navigate: 返回导航链接
    - search: 返回搜索结果
    """
    import json
    try:
        enable_edit = enable_image_edit.lower() in ("true", "1", "yes", "on")
        
        print(f"🎯 Executing action: {action_type} (intent_id: {intent_id})")
        
        # 根据操作类型执行不同的逻辑
        if action_type == "edit":
            # 图像编辑操作
            if not prompt or not box_json:
                raise HTTPException(status_code=400, detail="Missing prompt or box_json for edit action")
            
            box_2d = json.loads(box_json)
            image = GLOBAL_CACHE.get("current_image")
            
            if not image:
                raise HTTPException(status_code=400, detail="No image context. Please upload an image first.")
            
            print(f"🎨 Editing image: {prompt}")
            print(f"📦 Box: {box_2d}")
            
            new_image = await ai_service.execute_edit(image.copy(), prompt, box_2d, enable_edit)
            GLOBAL_CACHE["current_image"] = new_image
            
            return {
                "status": "success",
                "action_type": "edit",
                "image_base64": image_to_base64(new_image)
            }
        
        elif action_type == "info":
            # 信息查询操作
            action_data = json.loads(action_data_json) if action_data_json else {}
            return {
                "status": "success",
                "action_type": "info",
                "data": {
                    "info_text": action_data.get("info_text", ""),
                    "source_url": action_data.get("source_url", "")
                }
            }
        
        elif action_type == "navigate":
            # 导航操作
            action_data = json.loads(action_data_json) if action_data_json else {}
            url = action_data.get("url", "")
            if not url:
                raise HTTPException(status_code=400, detail="Missing URL for navigate action")
            
            return {
                "status": "success",
                "action_type": "navigate",
                "data": {
                    "url": url,
                    "title": action_data.get("title", "")
                }
            }
        
        elif action_type == "search":
            # 搜索操作
            action_data = json.loads(action_data_json) if action_data_json else {}
            search_query = action_data.get("search_query", "")
            
            # 可以在这里调用 SERP API 进行搜索
            if ai_service.serp_service:
                results = await ai_service.serp_service.search(search_query, num_results=5)
                return {
                    "status": "success",
                    "action_type": "search",
                    "data": {
                        "query": search_query,
                        "results": results
                    }
                }
            else:
                return {
                    "status": "success",
                    "action_type": "search",
                    "data": {
                        "query": search_query,
                        "results": []
                    }
                }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action_type: {action_type}")
            
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Execute error: {e}")
        raise HTTPException(status_code=500, detail=f"Execute error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

