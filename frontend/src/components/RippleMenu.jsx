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

            {/* 定义文字路径和圆弧段路径 */}
            <defs>
              {showButtons && intents.map((item, index) => {
                const { radius, angle } = getRelativePosition(index, intents.length, baseRippleRadius, rippleSpacing);
                const textPathId = `text-path-${item.id}`;
                const arcPathId = `arc-path-${item.id}`;
                
                // 创建完整的圆形路径用于文字排列
                const textPathD = `M ${center},${center - radius} A ${radius},${radius} 0 1,1 ${center},${center + radius} A ${radius},${radius} 0 1,1 ${center},${center - radius}`;
                
                // 创建圆弧段路径（填充的按钮区域）
                // 圆弧段的角度范围（约 60 度）
                const arcAngle = (Math.PI * 2) / intents.length; // 每个意图占的角度
                const arcStartAngle = angle - arcAngle / 2;
                const arcEndAngle = angle + arcAngle / 2;
                
                // 计算圆弧段的起点和终点
                const startX = center + Math.cos(arcStartAngle) * radius;
                const startY = center + Math.sin(arcStartAngle) * radius;
                const endX = center + Math.cos(arcEndAngle) * radius;
                const endY = center + Math.sin(arcEndAngle) * radius;
                
                // 圆弧段的宽度（径向）
                const arcWidth = 20; // 圆弧段的宽度
                const innerRadius = radius - arcWidth / 2;
                const outerRadius = radius + arcWidth / 2;
                
                // 创建圆弧段路径（内外两个圆弧组成一个填充区域）
                const innerStartX = center + Math.cos(arcStartAngle) * innerRadius;
                const innerStartY = center + Math.sin(arcStartAngle) * innerRadius;
                const innerEndX = center + Math.cos(arcEndAngle) * innerRadius;
                const innerEndY = center + Math.sin(arcEndAngle) * innerRadius;
                
                const outerStartX = center + Math.cos(arcStartAngle) * outerRadius;
                const outerStartY = center + Math.sin(arcStartAngle) * outerRadius;
                const outerEndX = center + Math.cos(arcEndAngle) * outerRadius;
                const outerEndY = center + Math.sin(arcEndAngle) * outerRadius;
                
                // 创建填充的圆弧段路径
                const arcPathD = `M ${innerStartX},${innerStartY} 
                                  A ${innerRadius},${innerRadius} 0 0,1 ${innerEndX},${innerEndY}
                                  L ${outerEndX},${outerEndY}
                                  A ${outerRadius},${outerRadius} 0 0,0 ${outerStartX},${outerStartY}
                                  Z`;
                
                return (
                  <g key={`paths-${item.id}`}>
                    <path
                      id={textPathId}
                      d={textPathD}
                      fill="none"
                    />
                    <path
                      id={arcPathId}
                      d={arcPathD}
                      fill="none"
                    />
                  </g>
                );
              })}
            </defs>

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
                  
                  {/* 圆弧段按钮和文字标签（仅在加载完成后显示） */}
                  {showButtons && !isLoading && (() => {
                    const { angle, radius: textRadius } = getRelativePosition(index, totalItems, baseRippleRadius, rippleSpacing);
                    // 计算文字在路径上的位置（从顶部开始，角度转换为路径百分比）
                    const normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI); // 转换为 0-1
                    const pathOffset = normalizedAngle * 100; // 转换为百分比
                    
                    // 圆弧段的参数
                    const arcWidth = 24; // 圆弧段的径向宽度
                    const arcAngleSpan = Math.PI / 3; // 圆弧段的角度范围（60度）
                    const innerRadius = textRadius - arcWidth / 2;
                    const outerRadius = textRadius + arcWidth / 2;
                    const startAngle = angle - arcAngleSpan / 2;
                    const endAngle = angle + arcAngleSpan / 2;
                    
                    // 计算圆弧段的四个角点
                    const innerStartX = center + Math.cos(startAngle) * innerRadius;
                    const innerStartY = center + Math.sin(startAngle) * innerRadius;
                    const innerEndX = center + Math.cos(endAngle) * innerRadius;
                    const innerEndY = center + Math.sin(endAngle) * innerRadius;
                    const outerStartX = center + Math.cos(startAngle) * outerRadius;
                    const outerStartY = center + Math.sin(startAngle) * outerRadius;
                    const outerEndX = center + Math.cos(endAngle) * outerRadius;
                    const outerEndY = center + Math.sin(endAngle) * outerRadius;
                    
                    // 创建填充的圆弧段路径
                    const arcPathD = `M ${innerStartX},${innerStartY} 
                                      A ${innerRadius},${innerRadius} 0 0,1 ${innerEndX},${innerEndY}
                                      L ${outerEndX},${outerEndY}
                                      A ${outerRadius},${outerRadius} 0 0,0 ${outerStartX},${outerStartY}
                                      Z`;
                    
                    return (
                      <g key={`button-${itemOrIndex.id}`}>
                        {/* 填充的圆弧段按钮（可点击） */}
                        <motion.path
                          d={arcPathD}
                          fill="rgba(255, 255, 255, 0.15)"
                          stroke="rgba(255, 255, 255, 0.3)"
                          strokeWidth="1"
                          className="cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            delay: index * 0.05 + 0.1,
                            duration: 0.3
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(itemOrIndex);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.setAttribute('fill', 'rgba(255, 255, 255, 0.25)');
                            e.currentTarget.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.setAttribute('fill', 'rgba(255, 255, 255, 0.15)');
                            e.currentTarget.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
                          }}
                        />
                        
                        {/* 文字标签 - 沿着圆弧路径排列 */}
                        <text
                          fontSize="12"
                          fill="white"
                          fontWeight="normal"
                          fontFamily="Ubuntu, sans-serif"
                          style={{ 
                            textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)',
                            pointerEvents: 'none'
                          }}
                        >
                          <textPath
                            href={`#text-path-${itemOrIndex.id}`}
                            startOffset={`${pathOffset}%`}
                            textAnchor="middle"
                          >
                            {itemOrIndex.label}
                          </textPath>
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </svg>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
