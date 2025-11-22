import { useState, useRef } from 'react';
import axios from 'axios';
import FingerprintCursor from './components/FingerprintCursor';
import RippleMenu from './components/RippleMenu';
import { Scan, Upload, Loader2 } from 'lucide-react';
import visibleIcon from './assets/visable.png';
import invisibleIcon from './assets/invisable.png';

const API_URL = "http://localhost:8000/api";

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

  // 3. 处理意图执行 (Execution)
  const handleIntentSelect = async (intent) => {
    setMenuState({ ...menuState, isOpen: false });
    setStatus(`Executing: ${intent.label}... (Calling Nanobanana)`);
    setIsLoading(true);

    // 使用之前保存的点击物体框
    const box = clickedObj ? clickedObj.box_2d : [0, 0, 100, 100];

    const formData = new FormData();
    formData.append('prompt', intent.editor_prompt);
    formData.append('box_json', JSON.stringify(box));

    try {
      const res = await axios.post(`${API_URL}/execute`, formData);
      // 接收新图片 (Base64)
      if(res.data.image_base64) {
          setImage(`data:image/png;base64,${res.data.image_base64}`);
      }
      setStatus("World updated.");
    } catch (err) {
      console.error(err);
      setStatus("Error executing action.");
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
          <div className="text-center opacity-30">
            <Scan size={64} className="mx-auto mb-4" />
            <p>Drag & Drop or Upload an Image</p>
          </div>
        )}
        
        {image && (
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
    </div>
  );
}

export default App;
