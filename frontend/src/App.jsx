import { useState, useRef } from 'react';
import axios from 'axios';
import FingerprintCursor from './components/FingerprintCursor';
import RippleMenu from './components/RippleMenu';
import { Scan, Upload, Loader2 } from 'lucide-react';
import visibleIcon from './assets/visable.png';
import invisibleIcon from './assets/invisable.png';

// 规范化 API URL：移除末尾斜杠，确保路径正确
const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  // 移除末尾斜杠，避免双斜杠问题
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_URL = getApiUrl();

function App() {
  const [image, setImage] = useState(null);
  const [objects, setObjects] = useState([]); // 缓存的物体框 (Pre-indexing)
  const [menuState, setMenuState] = useState({ isOpen: false, x: 0, y: 0 });
  const [intents, setIntents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Waiting for image...");
  const [clickedObj, setClickedObj] = useState(null); // 保存点击的物体
  const [clickAbsPosition, setClickAbsPosition] = useState(null); // 新增状态来存储点击的绝对屏幕坐标
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true); // 控制 bounding box 的显示/隐藏
  const [enableImageEdit, setEnableImageEdit] = useState(true); // 控制是否启用图像编辑
  
  const imageRef = useRef(null);

  // 1. 处理图片上传 & 预分析
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imgUrl = URL.createObjectURL(file);
    setImage(imgUrl);
    setStatus("Analyzing scene...");
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 调用后端 Level 2 便宜模型进行全图扫描
      const res = await axios.post(`${API_URL}/analyze`, formData);
      setObjects(res.data.objects);
      setStatus("Ready to interact. Click any object.");
    } catch (err) {
      console.error(err);
      setStatus("Error analyzing image.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 处理点击 (Intent Inference)
  const handleImageClick = async (e) => {
    if (!objects.length) return;

    // 关闭现有菜单
    setMenuState({ ...menuState, isOpen: false });

    // 记录点击的**绝对屏幕坐标**，用于 RippleMenu 的定位
    setClickAbsPosition({ x: e.clientX, y: e.clientY });

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 映射回图片的真实像素坐标 (因为图片可能被缩放显示)
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    const realX = x * scaleX;
    const realY = y * scaleY;

    // A. 前端快速碰撞检测 (零成本)
    const clickedObject = objects.find(obj => 
      realX >= obj.box_2d[1] && realX <= obj.box_2d[3] &&
      realY >= obj.box_2d[0] && realY <= obj.box_2d[2]
    );

    if (!clickedObject) {
      setStatus("Nothing interactable here.");
      return;
    }

    // B. 命中物体，调用后端推理
    setStatus(`Scanning: ${clickedObject.label}...`);
    setIsLoading(true); // 触发指纹扫描动画
    
    // 保存点击的物体
    setClickedObj(clickedObject);
    
    // 先打开菜单显示涟漪展开和 loading 动画
    setMenuState(prev => ({ ...prev, isOpen: true }));

    const formData = new FormData();
    formData.append('clicked_label', clickedObject.label);
    formData.append('click_x', Math.floor(realX));
    formData.append('click_y', Math.floor(realY));

    try {
      const res = await axios.post(`${API_URL}/infer`, formData);
      setIntents(res.data.intents);
      setStatus(`Suggestions ready for ${clickedObject.label}`);
    } catch (err) {
      console.error(err);
      setStatus("Error inferring intents.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 处理意图执行 (Execution) - 支持多种操作类型
  const handleIntentSelect = async (intent) => {
    setMenuState({ ...menuState, isOpen: false });
    setIsLoading(true);

    const actionType = intent.action_type || 'edit';
    let statusMessage = `Executing: ${intent.label}...`;
    
    if (actionType === 'edit') {
      statusMessage += enableImageEdit ? ' (Gemini Image Edit)' : ' (Preview Mode)';
    } else if (actionType === 'info') {
      statusMessage += ' (Information)';
    } else if (actionType === 'navigate') {
      statusMessage += ' (Opening link...)';
    } else if (actionType === 'search') {
      statusMessage += ' (Searching...)';
    }
    
    setStatus(statusMessage);

    const formData = new FormData();
    formData.append('intent_id', intent.id);
    formData.append('action_type', actionType);
    
    // 根据操作类型添加不同的数据
    if (actionType === 'edit') {
      const box = clickedObj ? clickedObj.box_2d : [0, 0, 100, 100];
      formData.append('prompt', intent.editor_prompt || '');
      formData.append('box_json', JSON.stringify(box));
      formData.append('enable_image_edit', enableImageEdit.toString());
    } else {
      // info, navigate, search 操作
      formData.append('action_data_json', JSON.stringify(intent.action_data || {}));
    }

    try {
      const res = await axios.post(`${API_URL}/execute`, formData);
      
      // 根据操作类型处理响应
      if (actionType === 'edit') {
        // 图像编辑：更新图片
        if (res.data.image_base64) {
          setImage(`data:image/png;base64,${res.data.image_base64}`);
        }
        setStatus(enableImageEdit ? "Image edited successfully." : "Preview mode (editing disabled).");
      } else if (actionType === 'info') {
        // 信息查询：显示信息
        const infoData = res.data.data;
        const infoText = infoData.info_text || 'No information available.';
        const sourceUrl = infoData.source_url || '';
        
        // 可以在这里显示一个模态框或通知
        alert(`${intent.label}\n\n${infoText}${sourceUrl ? `\n\nSource: ${sourceUrl}` : ''}`);
        setStatus("Information displayed.");
      } else if (actionType === 'navigate') {
        // 导航：打开链接
        const url = res.data.data.url;
        if (url) {
          window.open(url, '_blank');
          setStatus(`Opened: ${intent.label}`);
        } else {
          setStatus("No URL available.");
        }
      } else if (actionType === 'search') {
        // 搜索：显示搜索结果
        const searchData = res.data.data;
        const results = searchData.results || [];
        
        if (results.length > 0) {
          const resultsText = results.map((r, i) => 
            `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`
          ).join('\n\n');
          alert(`Search Results for: ${searchData.query}\n\n${resultsText}`);
          setStatus(`Found ${results.length} search results.`);
        } else {
          setStatus("No search results found.");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus(`Error executing ${actionType} action.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-neutral-900 overflow-hidden cursor-none text-white font-sans">
      <FingerprintCursor isScanning={isLoading} />

      {/* 顶部栏 */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <h1 className="text-xl font-bold tracking-wider">RIPPLE UI <span className="text-xs font-normal opacity-50">PROTOTYPE</span></h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm opacity-70 font-mono">{status}</span>
          
          {/* Bounding Box 显示/隐藏切换按钮 */}
          {objects.length > 0 && (
            <button
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              className="flex items-center justify-center bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition"
              title={showBoundingBoxes ? "Hide bounding boxes" : "Show bounding boxes"}
            >
              <img 
                src={showBoundingBoxes ? visibleIcon : invisibleIcon} 
                alt={showBoundingBoxes ? "Hide" : "Show"}
                className="w-5 h-5"
              />
            </button>
          )}
          
          {/* 图像编辑开关按钮 */}
          <button
            onClick={() => setEnableImageEdit(!enableImageEdit)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
              enableImageEdit 
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300' 
                : 'bg-white/10 hover:bg-white/20 text-white/70'
            }`}
            title={enableImageEdit ? "Disable image editing (Preview Mode)" : "Enable image editing (Gemini API)"}
          >
            <span className="text-sm font-medium">
              {enableImageEdit ? '✏️ Edit ON' : '👁️ Preview'}
            </span>
          </button>
          
          <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full cursor-pointer transition">
            <Upload size={16} />
            <span className="text-sm">Upload Image</span>
            <input type="file" hidden onChange={handleUpload} accept="image/*" />
          </label>
        </div>
      </div>

      {/* 主画布区 */}
      <div className="w-full h-full flex items-center justify-center relative">
        {!image && (
          <div className="text-center">
            <Scan size={64} className="mx-auto mb-6 opacity-30" />
            <p className="text-white/30 mb-8 text-lg">Drag & Drop or Upload an Image</p>
            
            {/* 3步操作说明 */}
            <div className="flex flex-col gap-3 items-center">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs font-medium">1</span>
                <span>Upload an image</span>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs font-medium">2</span>
                <span>Click on any object</span>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs font-medium">3</span>
                <span>Select an action from the menu</span>
              </div>
            </div>
          </div>
        )}
        
        {image && (
          <>
            <div className="relative shadow-2xl inline-block">
              <img 
                ref={imageRef}
                src={image} 
                alt="Workspace" 
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg block"
                onClick={handleImageClick}
              />
            
            {/* 可视化 Bounding Box - 蓝色科幻细线 */}
            {showBoundingBoxes && objects.length > 0 && imageRef.current && (() => {
              const rect = imageRef.current.getBoundingClientRect();
              const scaleX = rect.width / imageRef.current.naturalWidth;
              const scaleY = rect.height / imageRef.current.naturalHeight;
              
              return (
                <svg
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: rect.width,
                    height: rect.height,
                  }}
                  viewBox={`0 0 ${rect.width} ${rect.height}`}
                >
                  {objects.map((obj, index) => {
                    // box_2d 格式: [y0, x0, y1, x1] (像素坐标)
                    // 转换为显示坐标
                    const x = obj.box_2d[1] * scaleX;
                    const y = obj.box_2d[0] * scaleY;
                    const width = (obj.box_2d[3] - obj.box_2d[1]) * scaleX;
                    const height = (obj.box_2d[2] - obj.box_2d[0]) * scaleY;
                    
                    return (
                      <g key={obj.id || index}>
                        {/* 蓝色科幻细线边框 */}
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill="none"
                          stroke="#00D9FF"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          opacity="0.8"
                          style={{
                            filter: 'drop-shadow(0 0 4px rgba(0, 217, 255, 0.6))',
                          }}
                        />
                        {/* 标签文字 */}
                        <text
                          x={x + 4}
                          y={y - 4}
                          fill="#00D9FF"
                          fontSize="11"
                          fontWeight="500"
                          fontFamily="Ubuntu, sans-serif"
                          style={{
                            filter: 'drop-shadow(0 0 4px rgba(0, 217, 255, 0.8))',
                          }}
                        >
                          {obj.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
            </div>
            
            {/* 底部操作提示（小字） */}
            {objects.length === 0 && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-xs">
                <span className="text-white/40">1. Upload</span>
                <span className="text-blue-400/60">→</span>
                <span className="text-white/40">2. Click object</span>
                <span className="text-blue-400/60">→</span>
                <span className="text-white/40">3. Select action</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 涟漪菜单层 */}
      <RippleMenu 
        isOpen={menuState.isOpen} 
        position={clickAbsPosition}
        intents={intents}
        onSelect={handleIntentSelect}
        isLoading={isLoading}
      />

      {/* 版权信息 */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center items-center pb-4 z-0 pointer-events-none">
        <p className="text-white/30 text-xs font-light">
          Copyrights all rights reserved by Anngel LLC / Echuu
        </p>
      </div>
    </div>
  );
}

export default App;
