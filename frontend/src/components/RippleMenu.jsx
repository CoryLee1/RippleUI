import { motion, AnimatePresence } from 'framer-motion';

// 辅助函数：计算每个意图的"相对"位置（相对于中心点 0,0）
const getRelativePosition = (index, totalIntents, baseRadius, spacing) => {
  const radius = baseRadius + index * spacing; // 半径随索引递增
  // 角度计算：从 -90度 (12点钟方向) 开始
  const angle = (index / totalIntents) * 2 * Math.PI - Math.PI / 2; 

  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return { x, y, radius, angle };
};

export default function RippleMenu({ isOpen, position, intents, onSelect, isLoading = false }) {
  // 1. 基础检查
  if (!isOpen || !position) return null;
  
  // 如果正在加载，显示 loading 状态（涟漪展开但无按钮）
  // 如果加载完成，显示完整的菜单
  const showButtons = !isLoading && intents && intents.length > 0;

  // 2. 尺寸配置
  const baseRippleRadius = 30; // 内圈半径
  const rippleSpacing = 30;    // 圈层间距
  
  // 计算容器需要的总大小 (最大半径 * 2 + 缓冲空间)
  // 缓冲空间是为了容纳最外层按钮的自身大小和文字标签
  // 如果正在加载，使用预估的意图数量（比如 4 个）来计算容器大小
  const estimatedIntents = isLoading ? 4 : (intents?.length || 0);
  const maxRadius = baseRippleRadius + (estimatedIntents - 1) * rippleSpacing;
  const containerSize = maxRadius * 2 + 150; 
  const center = containerSize / 2; // 容器的中心坐标

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed z-40 pointer-events-none" // 容器本身不阻挡点击，内部按钮开启 pointer-events-auto
          style={{
            left: position.x,
            top: position.y,
            width: containerSize,
            height: containerSize,
            // ⭐️ 核心：利用 CSS 变换，将容器的【中心点】强制对齐到 left/top (即点击位置)
            transform: 'translate(-50%, -50%)', 
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* --- 层级 1: SVG 涟漪动画 (背景) --- */}
          <svg
            className="absolute top-0 left-0 w-full h-full overflow-visible"
            viewBox={`0 0 ${containerSize} ${containerSize}`}
          >
            {/* 视觉中心点 (使用与光标相同的 SVG 路径，缩小到 1/2) */}
            <g 
              transform={`translate(${center - 19.5}, ${center - 19.8}) scale(0.5)`}
              fill="none" 
              stroke="#939598" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path 
                d="M314.4388,436.0774c-33.9894-16.9468-34.4151-47.54-16.9154-59.04,22.8285-15.0017,42,9,39,20.5m-8.5,29.9992c-10.1665-1.8332-30-11.2-28-34,0-1.5,1.8-8.7,11-9.5,11.5-1,13,9.5,13,9.5s0,14.8125,14.5,13c9.6-1.2,10.6667-10.1666,10-14.5-2.3513-12.4755-14.3105-37.1452-46.0005-30-19.8666,3.4775-41.5509,31.5768-16.4079,65.5" 
                transform="translate(-272.769 -358.7627)"
              />
              <path 
                d="M312.1169,395.6115c0,8.5013,6.2928,25.868,30.5414,22.245" 
                transform="translate(-272.769 -358.7627)"
              />
            </g>

            {/* 涟漪圆圈 - 如果正在加载，显示预估数量的涟漪，带旋转和描边动画 */}
            {(isLoading ? Array.from({ length: estimatedIntents }, (_, i) => i) : intents).map((itemOrIndex, index) => {
              const totalItems = isLoading ? estimatedIntents : intents.length;
              const { radius } = getRelativePosition(index, totalItems, baseRippleRadius, rippleSpacing);
              
              // 参考 CSS keyframes：每一层速度错开
              // 外层 3.5s，内层 2s，中间层速度在两者之间
              const animationDuration = isLoading ? (3.5 - index * 0.5) : 0;
              
              // 计算圆的周长，用于描边动画
              const circumference = 2 * Math.PI * radius;
              // 圆弧长度（显示的部分），约为周长的 1/4
              const arcLength = circumference * 0.25;
              // 空白长度
              const gapLength = circumference - arcLength;
              
              return (
                <g key={isLoading ? `loading-ripple-${index}` : `ripple-${itemOrIndex.id}`}>
                  <motion.g
                    animate={isLoading ? { 
                      rotate: 360,
                    } : { rotate: 0 }}
                    transition={{
                      rotate: {
                        duration: animationDuration,
                        repeat: isLoading ? Infinity : 0,
                        ease: "linear"
                      }
                    }}
                    style={{ 
                      transformOrigin: `${center}px ${center}px`,
                    }}
                  >
                    <motion.circle
                      cx={center}
                      cy={center}
                      r={0} // 初始半径 0
                      animate={isLoading ? {
                        r: radius,
                        // 描边偏移，让圆弧沿着圆环移动
                        strokeDashoffset: [0, -circumference]
                      } : { r: radius }}
                      transition={isLoading ? {
                        r: {
                          type: "spring",
                          stiffness: 80,
                          damping: 15,
                          delay: index * 0.05
                        },
                        // 描边偏移动画，与旋转同步
                        strokeDashoffset: {
                          duration: animationDuration,
                          repeat: Infinity,
                          ease: "linear"
                        }
                      } : {
                        type: "spring",
                        stiffness: 80,
                        damping: 15,
                        delay: index * 0.05
                      }}
                      stroke="rgba(255, 255, 255, 0.8)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      // 使用 strokeDasharray 创建圆弧效果（显示一部分，隐藏一部分）
                      strokeDasharray={isLoading ? `${arcLength} ${gapLength}` : "none"}
                    />
                  </motion.g>
                </g>
              );
            })}
          </svg>

          {/* --- 层级 2: 功能按钮 (前景，加载完成后显示) --- */}
          {showButtons && (
            <div className="absolute top-0 left-0 w-full h-full">
              {intents.map((item, index) => {
              const { x, y } = getRelativePosition(index, intents.length, baseRippleRadius, rippleSpacing);
              
              // 按钮在容器内的绝对坐标
              const btnLeft = center + x;
              const btnTop = center + y;

              return (
                <motion.button
                  key={`btn-${item.id}`}
                  className="absolute flex flex-col items-center justify-center group pointer-events-auto cursor-pointer"
                  style={{
                    left: btnLeft,
                    top: btnTop,
                    width: 48,
                    height: 48,
                    // ⭐️ 核心：将按钮自身的中心点对齐到计算出的坐标上
                    transform: 'translate(-50%, -50%)' 
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    delay: index * 0.05 + 0.1, // 比涟漪稍晚一点出现
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // 防止点击按钮时触发背景点击
                    onSelect(item);
                  }}
                  whileHover={{ scale: 1.15, zIndex: 10 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* 图标圆形容器 */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-2xl border-2 border-white/20 backdrop-blur-sm transition-colors"
                    style={{ 
                      backgroundColor: item.color || '#333',
                      boxShadow: `0 0 15px ${item.color}40` // 淡淡的光晕
                    }}
                  >
                    {item.emoji}
                  </div>

                  {/* 文字标签 (根据位置智能偏移，防止遮挡) */}
                  <span 
                    className="absolute whitespace-nowrap text-xs font-bold text-white bg-black/80 px-2 py-1 rounded-md backdrop-blur-md pointer-events-none"
                    style={{
                      // 简单的智能布局：如果按钮在上方(y<0)，文字在上方；反之在下方
                      top: y < 0 ? -28 : 52,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
