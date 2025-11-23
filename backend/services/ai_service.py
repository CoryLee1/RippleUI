import os
import json
import base64
from io import BytesIO
from dotenv import load_dotenv
from typing import List
from PIL import Image
from services.utils import clean_json_string
from services.serp_service import SerpService
from schemas import DetectedObject, RippleIntent

load_dotenv()

# 尝试使用新的 SDK，如果不可用则回退到旧的
try:
    from google import genai
    from google.genai import types
    USE_NEW_SDK = True
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    print("✅ Using new Google Genai SDK")
except ImportError:
    import google.generativeai as genai
    USE_NEW_SDK = False
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    print("⚠️ Using old google-generativeai SDK")

# 使用便宜快速的模型
MODEL_NAME = 'gemini-2.0-flash'
# 图像编辑模型（根据官方文档，需要使用专门的图像生成模型）
IMAGE_EDIT_MODEL = 'gemini-2.5-flash-image'  # 官方推荐的图像编辑模型

class AIService:
    def __init__(self, enable_web_search: bool = True):
        """
        初始化 AI 服务
        
        Args:
            enable_web_search: 是否启用网络搜索功能（默认 True）
        """
        if USE_NEW_SDK:
            self.model_name = MODEL_NAME
            self.image_edit_model_name = IMAGE_EDIT_MODEL
        else:
            self.model = genai.GenerativeModel(MODEL_NAME)
            self.image_edit_model = genai.GenerativeModel(IMAGE_EDIT_MODEL)
        
        # 初始化 SERP 服务（如果启用）
        self.enable_web_search = enable_web_search
        self.serp_service = SerpService() if enable_web_search else None

    async def analyze_scene(self, image) -> List[DetectedObject]:
        """
        Step 1: 全局扫描 (Pre-indexing)
        识别图中所有主要物体，返回坐标。
        """
        prompt = """
        Detect all significant interactable objects in this image.
        Return a JSON list. Each entry MUST follow this format:
        {
            "label": "Short object name (e.g. Vending Machine)",
            "box_2d": [ymin, xmin, ymax, xmax] (normalized 0-1000),
        }
        Focus on: furniture, appliances, people, signs, vehicles.
        Limit to top 10 most prominent objects.
        DO NOT return segmentation masks (to save tokens).
        """
        
        try:
            if USE_NEW_SDK:
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=[prompt, image],
                    config=types.GenerateContentConfig(
                        temperature=0.5,
                        thinking_config=types.ThinkingConfig(thinking_budget=0)
                    )
                )
                json_str = clean_json_string(response.text)
            else:
                response = self.model.generate_content([prompt, image])
                json_str = clean_json_string(response.text)
            data = json.loads(json_str)
            
            results = []
            width, height = image.size
            
            for i, item in enumerate(data):
                # 转换归一化坐标到像素坐标
                y0, x0, y1, x1 = item['box_2d']
                abs_box = [
                    int(y0 / 1000 * height),
                    int(x0 / 1000 * width),
                    int(y1 / 1000 * height),
                    int(x1 / 1000 * width)
                ]
                
                # 计算中心点
                center = ((abs_box[1] + abs_box[3]) // 2, (abs_box[0] + abs_box[2]) // 2)

                results.append(DetectedObject(
                    id=i,
                    label=item['label'],
                    box_2d=abs_box,
                    center=center
                ))
            return results
        except Exception as e:
            print(f"Analysis Error: {e}")
            return []

    async def infer_intent(self, image, clicked_label: str, nearby_labels: List[str]) -> List[RippleIntent]:
        """
        Step 2: 意图推理 (Cached Inference with Web Search)
        根据点击的物体，结合互联网资源，生成 Ripple Menu 选项。
        """
        # 构建基础 prompt
        base_prompt = f"""
        User clicked on a '{clicked_label}' in the image.
        Context objects nearby: {nearby_labels}.
        """
        
        # 检测是否为商品
        product_keywords = ['clothing', 'clothes', 'shirt', 'dress', 'jacket', 'shoe', 'bag', 
                          'accessory', 'product', 'item', '商品', '衣服', '鞋子', '包', '配饰']
        is_product = any(keyword.lower() in clicked_label.lower() for keyword in product_keywords)
        
        # 如果启用了网络搜索，先搜索相关信息
        web_context = ""
        web_results = []
        if self.enable_web_search and self.serp_service:
            print(f"🌐 Searching web for: {clicked_label} {'(product)' if is_product else ''}")
            web_context, web_results = await self.serp_service.search_related_actions(
                clicked_label, 
                nearby_labels,
                is_product=is_product
            )
        
        # 构建完整的 prompt - 从用户意图出发
        prompt = f"""
        {base_prompt}
        
        {web_context if web_context else ""}
        
        **Think from the user's perspective**: When a user clicks on '{clicked_label}' in an image, what are their most likely intentions?
        
        Step 1: Analyze user intentions
        Consider what a real person would want to do when they see and click on this object:
        - What questions might they have?
        - What actions would they naturally want to take?
        - What information would be useful to them?
        - What creative possibilities interest them?
        
        Step 2: Generate actions based on intentions
        For each identified user intention, provide the most appropriate action type and functionality.
        
        Action types available:
        1. **Image Edit** (action_type: "edit"): When user wants to modify the image
           - Change appearance (color, style, effects)
           - Remove or replace the object
           - Add elements or transform
           
        2. **Information** (action_type: "info"): When user wants to learn more
           - Get details, specifications, history
           - Understand usage or context
           
        3. **Navigate** (action_type: "navigate"): When user wants to visit related resources
           - Official websites, stores, services
           - Purchase or booking pages
           
        4. **Search** (action_type: "search"): When user wants to find related content
           - Similar items, reviews, tutorials
           - **For products**: Search on eBay or shopping platforms (use "site:ebay.com {clicked_label}" format)
        
        Step 3: Return 4-6 actions
        Return JSON list with actions that match real user intentions:
        [
            {{
                "id": 1,
                "label": "Short Button Text (user-friendly)",
                "emoji": "Icon",
                "description": "Clear description of what this action does",
                "color": "Hex Code (Green for Nav, Blue for Use, Orange for Edit, Purple for Info)",
                "probability": 0.8,
                "action_type": "edit|info|navigate|search",
                "editor_prompt": "Prompt for image generation AI (only if action_type='edit')",
                "action_data": {{
                    "url": "https://...",  // for navigate/search
                    "search_query": "...",  // for search (use "site:ebay.com {clicked_label}" for eBay)
                    "info_text": "...",  // for info
                    "search_engine": "ebay"  // optional: "ebay" for eBay searches
                }}
            }}
        ]
        
        Guidelines:
        - **User-first thinking**: Start with "What would a user want?" not "What features can I show?"
        - **Natural intentions**: Common user intentions include:
          * "I want to change how this looks" → edit action
          * "I want to know more about this" → info action
          * "I want to buy/find this" → search/navigate action (for products, naturally include eBay)
          * "I want to remove this" → edit action
          * "I want to see similar items" → search action
        - **Product context**: If '{clicked_label}' is a product (clothing, shoes, bags, accessories), 
          users naturally want to: find where to buy it, see prices, compare options → provide eBay search naturally
        - **Creative possibilities**: Users also enjoy creative exploration → include 1-2 creative editing options
        - **Balance**: Mix practical and creative intentions based on what real users would want
        - **Web context**: If search results are provided, use them to inform realistic user intentions
        """
        
        try:
            if USE_NEW_SDK:
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=[prompt, image],
                    config=types.GenerateContentConfig(
                        temperature=0.7,  # 稍微提高温度以利用网络搜索结果
                        thinking_config=types.ThinkingConfig(thinking_budget=0)
                    )
                )
            else:
                response = self.model.generate_content([prompt, image]) 
            
            json_str = clean_json_string(response.text)
            data = json.loads(json_str)
            
            intents = []
            for item in data:
                # 如果 AI 没有生成 action_type，根据 editor_prompt 推断
                if "action_type" not in item:
                    item["action_type"] = "edit" if item.get("editor_prompt") else "info"
                
                # 如果 action_type 是 navigate/search 但没有 action_data，尝试从 web_results 填充
                if item["action_type"] in ["navigate", "search"] and not item.get("action_data"):
                    if web_results:
                        # 对于商品，如果是搜索类型，优先使用 eBay 搜索格式
                        if is_product and item["action_type"] == "search":
                            item["action_data"] = {
                                "search_query": f"{clicked_label} site:ebay.com",
                                "search_engine": "ebay",
                                "title": f"Search {clicked_label} on eBay"
                            }
                        else:
                            # 使用第一个搜索结果作为默认链接
                            item["action_data"] = {
                                "url": web_results[0].get("link", ""),
                                "title": web_results[0].get("title", ""),
                                "search_query": f"{clicked_label} {item['label']}"
                            }
                
                # 如果 action_type 是 info 但没有 action_data，从 web_results 填充信息
                if item["action_type"] == "info" and not item.get("action_data"):
                    if web_results:
                        item["action_data"] = {
                            "info_text": web_results[0].get("snippet", ""),
                            "source_url": web_results[0].get("link", "")
                        }
                
                intents.append(RippleIntent(**item))
            return intents
        except Exception as e:
            print(f"Inference Error: {e}")
            return []

    async def execute_edit(self, image, prompt: str, box_2d: List[int], enable_image_edit: bool = True):
        """
        Step 3: 执行图像编辑 (Gemini Image Editing)
        使用 Gemini API 进行图像编辑，返回处理后的图片。
        
        Args:
            image: PIL Image 对象
            prompt: 编辑提示词
            box_2d: 目标区域 [y0, x0, y1, x1]
            enable_image_edit: 是否启用真实的图像编辑（False 时返回原图）
        """
        print(f"⚡️ Calling Gemini Image Edit with prompt: {prompt}")
        print(f"📍 Target Region: {box_2d}")
        print(f"🔄 Image Edit Enabled: {enable_image_edit}")
        
        if not enable_image_edit:
            # 如果禁用图像编辑，返回原图（用于测试或演示）
            print("⚠️ Image editing is disabled, returning original image")
            return image
        
        try:
            # 构建编辑提示词，包含区域信息
            width, height = image.size
            y0, x0, y1, x1 = box_2d
            
            # 将坐标转换为相对位置（0-1）
            x0_norm = x0 / width
            y0_norm = y0 / height
            x1_norm = x1 / width
            y1_norm = y1 / height
            
            # 构建包含区域信息的完整提示词
            full_prompt = f"""Using the provided image, edit only the region at coordinates ({x0_norm:.2f}, {y0_norm:.2f}) to ({x1_norm:.2f}, {y1_norm:.2f}). 
            
{prompt}

Keep the rest of the image unchanged. Return the edited image."""
            
            # 调用 Gemini 图像编辑 API
            # 根据官方文档，使用 gemini-2.5-flash-image 模型进行图像编辑
            # 官方示例使用 [text_input, image_input] 或 [image_input, text_input]
            # 使用 response_modalities=['Image'] 确保只返回图片，不返回文本
            if USE_NEW_SDK:
                response = client.models.generate_content(
                    model=self.image_edit_model_name,
                    contents=[full_prompt, image],  # 按照官方示例：文本在前，图片在后
                    config=types.GenerateContentConfig(
                        response_modalities=['Image'],  # 只返回图片，不返回文本
                        # image_config=types.ImageConfig(
                        #     aspect_ratio="16:9",  # 可选：控制输出图片的显示比例
                        # ),
                    )
                )
            else:
                # 旧 SDK 也尝试使用相同的顺序
                response = self.image_edit_model.generate_content([full_prompt, image])
            
            # 检查响应是否有效
            if not response:
                print("⚠️ Empty response from API")
                return image
            
            # 检查 candidates（响应可能被安全策略阻止）
            if hasattr(response, 'candidates'):
                if not response.candidates or len(response.candidates) == 0:
                    print("⚠️ No candidates in response (may be blocked by safety settings)")
                    # 检查是否有阻止原因
                    if hasattr(response, 'prompt_feedback'):
                        print(f"📋 Prompt feedback: {response.prompt_feedback}")
                    return image
            
            # 从响应中提取图片（按照官方文档的方式）
            try:
                # 官方文档示例：遍历 response.parts
                if hasattr(response, 'parts'):
                    for part in response.parts:
                        # 方法1: 检查文本响应
                        if hasattr(part, 'text') and part.text is not None:
                            print(f"📝 Response text: {part.text}")
                        
                        # 方法2: 检查 inline_data 并使用 as_image()（官方推荐方式）
                        # 根据官方文档：https://ai.google.dev/gemini-api/docs/image-generation
                        # part.as_image() 返回的对象可以直接调用 save() 方法
                        elif hasattr(part, 'inline_data') and part.inline_data is not None:
                            # 先打印 inline_data 的结构用于调试
                            print(f"📋 inline_data type: {type(part.inline_data)}")
                            print(f"📋 inline_data attributes: {[attr for attr in dir(part.inline_data) if not attr.startswith('_')]}")
                            
                            try:
                                # 方法1: 尝试直接使用 as_image()（官方推荐）
                                edited_image = part.as_image()
                                print(f"📋 as_image() returned type: {type(edited_image)}")
                                if edited_image:
                                    # 检查是否是 PIL Image
                                    if isinstance(edited_image, Image.Image):
                                        if edited_image.mode != 'RGB':
                                            edited_image = edited_image.convert('RGB')
                                        print("✅ Image editing successful (from part.as_image() - PIL Image)")
                                        return edited_image
                                    else:
                                        print(f"⚠️ as_image() returned non-PIL type: {type(edited_image)}")
                                        # 如果不是 PIL Image，尝试其他方法
                                        raise ValueError(f"as_image() returned non-PIL type: {type(edited_image)}")
                            except Exception as e:
                                print(f"⚠️ Error using as_image(): {e}")
                                
                            # 方法2: 尝试从 inline_data 手动解码
                            try:
                                # 检查不同的数据访问方式
                                image_data = None
                                
                                # 方式1: 直接访问 data 属性
                                if hasattr(part.inline_data, 'data'):
                                    data_attr = part.inline_data.data
                                    print(f"📋 inline_data.data type: {type(data_attr)}")
                                    if isinstance(data_attr, str):
                                        # 如果是字符串，尝试 base64 解码
                                        image_data = base64.b64decode(data_attr)
                                    elif isinstance(data_attr, bytes):
                                        # 如果已经是 bytes，直接使用
                                        image_data = data_attr
                                    else:
                                        # 尝试转换为字符串再解码
                                        data_str = str(data_attr)
                                        if data_str.startswith('data:'):
                                            # 处理 data URI 格式
                                            data_str = data_str.split('base64,')[1] if 'base64,' in data_str else data_str
                                        image_data = base64.b64decode(data_str)
                                
                                # 方式2: 尝试访问 bytes 属性
                                elif hasattr(part.inline_data, 'bytes'):
                                    image_data = part.inline_data.bytes
                                
                                # 方式3: 尝试访问 raw_data 属性
                                elif hasattr(part.inline_data, 'raw_data'):
                                    raw = part.inline_data.raw_data
                                    if isinstance(raw, bytes):
                                        image_data = raw
                                    elif isinstance(raw, str):
                                        image_data = base64.b64decode(raw)
                                
                                if image_data:
                                    # 尝试打开图片
                                    edited_image = Image.open(BytesIO(image_data))
                                    if edited_image.mode != 'RGB':
                                        edited_image = edited_image.convert('RGB')
                                    print("✅ Image editing successful (from inline_data manual decode)")
                                    return edited_image
                                else:
                                    raise ValueError("Could not extract image data from inline_data")
                                    
                            except Exception as e2:
                                print(f"⚠️ Error in manual decoding: {e2}")
                                import traceback as tb
                                tb.print_exc()
                
                # 新 SDK 可能还有其他方式访问图片
                # 注意：根据官方文档，应该使用 response.parts，而不是 response.images
                # 所以这里暂时注释掉，优先使用上面的 parts 遍历方式
                # if USE_NEW_SDK:
                #     if hasattr(response, 'images') and response.images:
                #         edited_image = response.images[0]
                #         print("✅ Image editing successful (from response.images)")
                #         return edited_image
                
                # 旧 SDK 的 candidates 方式（向后兼容）
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                try:
                                    # 优先手动解码 base64
                                    image_data = base64.b64decode(part.inline_data.data)
                                    edited_image = Image.open(BytesIO(image_data))
                                    if edited_image.mode != 'RGB':
                                        edited_image = edited_image.convert('RGB')
                                    print("✅ Image editing successful (from candidate inline_data)")
                                    return edited_image
                                except Exception as e:
                                    print(f"⚠️ Error decoding candidate inline_data: {e}")
                                    # 回退到 as_image()
                                    try:
                                        edited_image = part.as_image()
                                        if edited_image:
                                            # 如果是 google.genai.types.Image，需要转换
                                            if not isinstance(edited_image, Image.Image):
                                                # 尝试从 inline_data 获取数据
                                                if hasattr(part, 'inline_data') and part.inline_data:
                                                    image_data = base64.b64decode(part.inline_data.data)
                                                    edited_image = Image.open(BytesIO(image_data))
                                            if edited_image.mode != 'RGB':
                                                edited_image = edited_image.convert('RGB')
                                            print("✅ Image editing successful (from candidate.parts.as_image())")
                                            return edited_image
                                    except Exception as e2:
                                        print(f"⚠️ Error using candidate as_image(): {e2}")
                    
            except Exception as e:
                print(f"⚠️ Error parsing response: {e}")
                import traceback
                traceback.print_exc()
            
            # 如果没有返回图片，返回原图
            print("⚠️ No image data in response, returning original image")
            print(f"📋 Response type: {type(response)}")
            if hasattr(response, 'text'):
                print(f"📋 Response text (first 200 chars): {response.text[:200]}")
            if hasattr(response, 'parts'):
                print(f"📋 Response has {len(response.parts)} parts")
                for i, part in enumerate(response.parts):
                    print(f"📋 Part {i} attributes: {[attr for attr in dir(part) if not attr.startswith('_')]}")
            return image
            
        except Exception as e:
            print(f"❌ Image editing error: {e}")
            # 出错时返回原图
            return image

