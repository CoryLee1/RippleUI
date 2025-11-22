import re
import base64
from io import BytesIO
from PIL import Image

def clean_json_string(json_output: str) -> str:
    """
    从 LLM 的 Markdown 输出中提取纯 JSON 字符串。
    (逻辑源自 Jupyter Notebook Cell 2)
    """
    # 匹配 ```json ... ```
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', json_output)
    if json_match:
        json_text = json_match.group(1)
    else:
        json_text = json_output

    # 确保以 [ 或 { 开头
    json_text = json_text.strip()
    if not (json_text.startswith('[') or json_text.startswith('{')):
        # 尝试寻找列表
        array_match = re.search(r'\[(.*?)\]', json_text, re.DOTALL)
        if array_match:
            json_text = '[' + array_match.group(1) + ']'
            
    return json_text

def process_base64_image(base64_str: str) -> Image.Image:
    """将前端传来的 base64 字符串转为 PIL Image"""
    if "base64," in base64_str:
        base64_str = base64_str.split("base64,")[1]
    image_data = base64.b64decode(base64_str)
    return Image.open(BytesIO(image_data))

def image_to_base64(image) -> str:
    """将 PIL Image 转回 base64 发给前端"""
    # 处理各种可能的图片对象类型
    pil_image = None
    
    # 方法1: 如果已经是 PIL Image
    if isinstance(image, Image.Image):
        pil_image = image
    # 方法2: 如果是 google.genai.types.Image 类型（新 SDK）
    elif hasattr(image, '__class__') and 'google.genai.types.Image' in str(type(image)):
        try:
            # 尝试使用 to_pil() 方法（如果存在）
            if hasattr(image, 'to_pil'):
                pil_image = image.to_pil()
            # 尝试使用 as_pil() 方法（如果存在）
            elif hasattr(image, 'as_pil'):
                pil_image = image.as_pil()
            # 尝试使用 data 属性获取 base64 数据
            elif hasattr(image, 'data'):
                image_data = base64.b64decode(image.data)
                pil_image = Image.open(BytesIO(image_data))
            # 尝试使用 inline_data
            elif hasattr(image, 'inline_data') and hasattr(image.inline_data, 'data'):
                image_data = base64.b64decode(image.inline_data.data)
                pil_image = Image.open(BytesIO(image_data))
            else:
                raise ValueError(f"Unknown google.genai.types.Image structure: {dir(image)}")
        except Exception as e:
            print(f"⚠️ Error converting google.genai.types.Image: {e}")
            print(f"📋 Image object attributes: {[attr for attr in dir(image) if not attr.startswith('_')]}")
            raise ValueError(f"Cannot convert google.genai.types.Image: {e}")
    # 方法3: 如果有 read 方法（BytesIO 等）
    elif hasattr(image, 'read'):
        try:
            pil_image = Image.open(image)
        except Exception as e:
            print(f"⚠️ Error opening image from stream: {e}")
            raise ValueError(f"Cannot open image from stream: {type(image)}")
    # 方法4: 如果是 bytes
    elif isinstance(image, bytes):
        try:
            pil_image = Image.open(BytesIO(image))
        except Exception as e:
            print(f"⚠️ Error opening image from bytes: {e}")
            raise ValueError(f"Cannot open image from bytes")
    else:
        # 尝试直接转换
        try:
            pil_image = Image.open(image)
        except Exception as e:
            print(f"⚠️ Error converting image: {e}")
            print(f"📋 Image type: {type(image)}")
            print(f"📋 Image attributes: {[attr for attr in dir(image) if not attr.startswith('_')]}")
            raise ValueError(f"Invalid image type: {type(image)}")
    
    # 确保图片是 RGB 模式（如果不是，转换为 RGB）
    if hasattr(pil_image, 'mode') and pil_image.mode != 'RGB':
        pil_image = pil_image.convert('RGB')
    elif not hasattr(pil_image, 'mode'):
        # 如果没有 mode 属性，尝试强制转换为 RGB
        try:
            pil_image = pil_image.convert('RGB')
        except Exception as e:
            print(f"⚠️ Error converting to RGB: {e}")
            # 如果转换失败，尝试直接保存（某些格式可能不需要转换）
            pass
    
    buffered = BytesIO()
    # 使用 format 参数（PIL/Pillow 标准方式）
    pil_image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

