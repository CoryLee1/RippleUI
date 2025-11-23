from pydantic import BaseModel
from typing import List, Tuple

# ----------------------
# 响应模型 (Response)
# ----------------------

class BoundingBox(BaseModel):
    y0: int
    x0: int
    y1: int
    x1: int

class DetectedObject(BaseModel):
    id: int
    label: str
    box_2d: List[int]  # [y0, x0, y1, x1]
    center: Tuple[int, int]
    confidence: float = 1.0

class AnalysisResponse(BaseModel):
    objects: List[DetectedObject]
    image_width: int
    image_height: int

class RippleIntent(BaseModel):
    id: int
    label: str
    emoji: str
    description: str
    color: str
    probability: float
    action_type: str  # "edit" | "info" | "navigate" | "search"
    editor_prompt: str = ""  # 用于图像编辑的提示词（action_type="edit" 时使用）
    action_data: dict = {}  # 其他操作的数据（链接、搜索结果等）

class InferenceResponse(BaseModel):
    intents: List[RippleIntent]

# ----------------------
# 请求模型 (Request)
# ----------------------

class InferRequest(BaseModel):
    # 我们不需要传整个图片，因为图片状态由前端或 SessionID 管理
    # 这里简化：假设前端传回点击物体的上下文
    clicked_label: str
    nearby_objects: List[str]
    click_x: int
    click_y: int

class ExecuteRequest(BaseModel):
    action_id: int
    editor_prompt: str
    box_2d: List[int]

