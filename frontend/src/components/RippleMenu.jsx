import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { rippleMenuConfig } from '../config/rippleMenuConfig';

// 辅助函数：计算每个意图的"相对"位置（相对于中心点 0,0）
const getRelativePosition = (index, totalIntents, baseRadius, spacing) => {
  const radius = baseRadius + index * spacing; // 半径随索引递增
  
  // 从配置中读取角度参数
  const { startAngleOffset, spacing: angleSpacing } = rippleMenuConfig.angle;
  
  // 计算每个按钮的角度（使用固定间距，而不是按比例分布）
  const angle = startAngleOffset + index * angleSpacing; 

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

  // 2. 从配置中读取尺寸参数
  const { baseRippleRadius, rippleSpacing, containerBuffer } = rippleMenuConfig.size;
  const { estimatedIntents: defaultEstimatedIntents } = rippleMenuConfig.other;
  
  // 计算容器需要的总大小 (最大半径 * 2 + 缓冲空间)
  // 缓冲空间是为了容纳最外层按钮的自身大小和文字标签
  // 如果正在加载，使用预估的意图数量（比如 4 个）来计算容器大小
  const estimatedIntents = isLoading ? defaultEstimatedIntents : (intents?.length || 0);
  const maxRadius = baseRippleRadius + (estimatedIntents - 1) * rippleSpacing;
  const containerSize = maxRadius * 2 + containerBuffer; 
  const center = containerSize / 2; // 容器的中心坐标

  // 3. 鼠标跟随：存储每个按钮的目标角度
  const [buttonAngles, setButtonAngles] = useState({});
  const containerRef = useRef(null);

  // 初始化按钮角度（使用默认角度）
  useEffect(() => {
    if (showButtons && intents) {
      const initialAngles = {};
      intents.forEach((item, index) => {
        const { angle } = getRelativePosition(index, intents.length, baseRippleRadius, rippleSpacing);
        initialAngles[item.id] = angle;
      });
      setButtonAngles(initialAngles);
    }
  }, [showButtons, intents, baseRippleRadius, rippleSpacing]);

  // 4. 监听鼠标移动，计算目标角度
  useEffect(() => {
    if (!showButtons || !containerRef.current) return;

    const handleMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - center;
      const mouseY = e.clientY - rect.top - center;
      
      // 计算鼠标相对于中心的角度
      const mouseAngle = Math.atan2(mouseY, mouseX);
      
      // 计算鼠标距离中心的距离
      const mouseDistance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
      
      // 找到最接近的涟漪圆环（根据距离）
      intents.forEach((item, index) => {
        const { radius } = getRelativePosition(index, intents.length, baseRippleRadius, rippleSpacing);
        const distanceDiff = Math.abs(mouseDistance - radius);
        
        // 如果鼠标在这个涟漪圆环附近（容差范围内），让按钮跟随鼠标
        const tolerance = rippleSpacing * 0.4; // 容差范围
        if (distanceDiff < tolerance) {
          setButtonAngles(prev => ({
            ...prev,
            [item.id]: mouseAngle
          }));
        }
      });
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);
    
    // 鼠标离开时，恢复默认角度
    const handleMouseLeave = () => {
      if (intents) {
        const defaultAngles = {};
        intents.forEach((item, index) => {
          const { angle } = getRelativePosition(index, intents.length, baseRippleRadius, rippleSpacing);
          defaultAngles[item.id] = angle;
        });
        setButtonAngles(defaultAngles);
      }
    };
    
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [showButtons, intents, baseRippleRadius, rippleSpacing, center]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="fixed z-40" // 需要 pointer-events 来监听鼠标移动
          style={{
            left: position.x,
            top: position.y,
            width: containerSize,
            height: containerSize,
            // ⭐️ 核心：利用 CSS 变换，将容器的【中心点】强制对齐到 left/top (即点击位置)
            transform: 'translate(-50%, -50%)', 
            pointerEvents: showButtons ? 'auto' : 'none', // 有按钮时启用鼠标事件
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
              stroke={rippleMenuConfig.color.centerFingerprintStroke}
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

            {/* 定义文字路径 */}
            <defs>
              {showButtons && intents.map((item, index) => {
                const { radius } = getRelativePosition(index, intents.length, baseRippleRadius, rippleSpacing);
                const textPathId = `text-path-${item.id}`;
                
                // 创建完整的圆形路径用于文字排列
                // 从顶部（12点钟方向，-90度）开始，顺时针画一个完整的圆
                // SVG arc 参数：A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                // large-arc-flag: 0=小弧(<180度), 1=大弧(>180度)
                // sweep-flag: 0=逆时针, 1=顺时针
                
                const topX = center;
                const topY = center - radius;
                const rightX = center + radius;
                const rightY = center;
                const bottomX = center;
                const bottomY = center + radius;
                const leftX = center - radius;
                const leftY = center;
                
                // 使用四个象限的弧，确保覆盖完整的 360 度
                // 从顶部开始，顺时针：顶部->右侧->底部->左侧->顶部
                const textPathD = `M ${topX},${topY} 
                                   A ${radius},${radius} 0 0,1 ${rightX},${rightY} 
                                   A ${radius},${radius} 0 0,1 ${bottomX},${bottomY} 
                                   A ${radius},${radius} 0 0,1 ${leftX},${leftY} 
                                   A ${radius},${radius} 0 0,1 ${topX},${topY} Z`;
                
                return (
                  <path
                    key={textPathId}
                    id={textPathId}
                    d={textPathD}
                    fill="none"
                  />
                );
              })}
            </defs>

            {/* 涟漪圆圈 - 如果正在加载，显示预估数量的涟漪，带旋转和描边动画 */}
            {(isLoading ? Array.from({ length: estimatedIntents }, (_, i) => i) : intents).map((itemOrIndex, index) => {
              const totalItems = isLoading ? estimatedIntents : intents.length;
              const { radius } = getRelativePosition(index, totalItems, baseRippleRadius, rippleSpacing);
              
              // 从配置中读取动画参数
              const { 
                rippleRotationBaseDuration, 
                rippleRotationStepDuration,
                rippleArcLengthRatio 
              } = rippleMenuConfig.animation;
              
              // 参考 CSS keyframes：每一层速度错开
              // 外层使用 baseDuration，内层递减
              const animationDuration = isLoading 
                ? (rippleRotationBaseDuration - index * rippleRotationStepDuration) 
                : 0;
              
              // 计算圆的周长，用于描边动画
              const circumference = 2 * Math.PI * radius;
              // 圆弧长度（显示的部分），从配置中读取比例
              const arcLength = circumference * rippleArcLengthRatio;
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
                      } : {
                        r: radius,
                        // 发光动画：循环改变透明度
                        ...(rippleMenuConfig.animation.rippleGlow.enabled ? {
                          opacity: [
                            rippleMenuConfig.animation.rippleGlow.minOpacity,
                            rippleMenuConfig.animation.rippleGlow.maxOpacity,
                            rippleMenuConfig.animation.rippleGlow.minOpacity
                          ]
                        } : {})
                      }}
                      transition={isLoading ? {
                        r: {
                          type: "spring",
                          ...rippleMenuConfig.animation.rippleExpandSpring,
                          delay: index * 0.05
                        },
                        // 描边偏移动画，与旋转同步
                        strokeDashoffset: {
                          duration: animationDuration,
                          repeat: Infinity,
                          ease: "linear"
                        }
                      } : {
                        r: {
                          type: "spring",
                          ...rippleMenuConfig.animation.rippleExpandSpring,
                          delay: index * 0.05
                        },
                        // 发光动画配置
                        ...(rippleMenuConfig.animation.rippleGlow.enabled ? {
                          opacity: {
                            duration: rippleMenuConfig.animation.rippleGlow.duration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: index * rippleMenuConfig.animation.rippleGlow.delayStep
                          }
                        } : {})
                      }}
                      stroke={rippleMenuConfig.color.rippleStroke}
                      strokeWidth={rippleMenuConfig.other.strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      // 使用 strokeDasharray 创建圆弧效果（显示一部分，隐藏一部分）
                      strokeDasharray={isLoading ? `${arcLength} ${gapLength}` : "none"}
                      // 添加外发光效果（轻微发光）
                      style={{
                        filter: rippleMenuConfig.animation.rippleGlow.enabled 
                          ? `drop-shadow(0 0 ${rippleMenuConfig.animation.rippleGlow.outerGlow.blurRadius}px ${rippleMenuConfig.animation.rippleGlow.outerGlow.color}) drop-shadow(0 0 ${rippleMenuConfig.animation.rippleGlow.outerGlow.blurRadius * 0.5}px ${rippleMenuConfig.animation.rippleGlow.outerGlow.color})`
                          : 'none'
                      }}
                    />
                  </motion.g>
                  
                  {/* 圆弧段按钮和文字标签（仅在加载完成后显示） */}
                  {showButtons && !isLoading && (() => {
                    // 获取默认角度和目标角度
                    const defaultAngle = getRelativePosition(index, totalItems, baseRippleRadius, rippleSpacing).angle;
                    const targetAngle = buttonAngles[itemOrIndex.id] !== undefined 
                      ? buttonAngles[itemOrIndex.id] 
                      : defaultAngle;
                    
                    // 使用目标角度来计算按钮位置（沿着涟漪圆环移动）
                    const currentAngle = targetAngle;
                    
                    const { radius: textRadius } = getRelativePosition(index, totalItems, baseRippleRadius, rippleSpacing);
                    
                    // 文字路径基于当前角度计算
                    // currentAngle 范围可能是 -Math.PI/2 到 Math.PI/2 或更大
                    // 需要转换为 0 到 2*Math.PI 的范围，然后归一化到 0-1
                    let normalizedAngle = currentAngle;
                    
                    // 确保角度在 0 到 2*Math.PI 范围内
                    if (normalizedAngle < 0) {
                      normalizedAngle = normalizedAngle + 2 * Math.PI;
                    }
                    if (normalizedAngle >= 2 * Math.PI) {
                      normalizedAngle = normalizedAngle - 2 * Math.PI;
                    }
                    
                    // 路径从顶部（-Math.PI/2 或 3*Math.PI/2）开始，顺时针
                    // 所以需要加上 Math.PI/2 来对齐到路径起点
                    normalizedAngle = (normalizedAngle + Math.PI / 2) / (2 * Math.PI);
                    
                    // 确保在 0-1 范围内
                    if (normalizedAngle < 0) normalizedAngle = 0;
                    if (normalizedAngle > 1) normalizedAngle = 1;
                    
                    const pathOffset = normalizedAngle * 100; // 转换为百分比
                    
                    // 从配置中读取圆弧段参数
                    const { arcWidth, arcAngleSpan } = rippleMenuConfig.size;
                    const innerRadius = textRadius - arcWidth / 2;
                    const outerRadius = textRadius + arcWidth / 2;
                    // 路径基于当前角度计算（沿着涟漪圆环）
                    const startAngle = currentAngle - arcAngleSpan / 2;
                    const endAngle = currentAngle + arcAngleSpan / 2;
                    
                    // 计算圆弧段的四个角点（基于当前角度）
                    const innerStartX = center + Math.cos(startAngle) * innerRadius;
                    const innerStartY = center + Math.sin(startAngle) * innerRadius;
                    const innerEndX = center + Math.cos(endAngle) * innerRadius;
                    const innerEndY = center + Math.sin(endAngle) * innerRadius;
                    const outerStartX = center + Math.cos(startAngle) * outerRadius;
                    const outerStartY = center + Math.sin(startAngle) * outerRadius;
                    const outerEndX = center + Math.cos(endAngle) * outerRadius;
                    const outerEndY = center + Math.sin(endAngle) * outerRadius;
                    
                    // 创建填充的圆弧段路径（使用 strokeLinejoin="round" 实现圆角效果）
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
                          fill={rippleMenuConfig.color.buttonFill}
                          stroke={rippleMenuConfig.color.buttonStroke}
                          strokeWidth={rippleMenuConfig.other.strokeWidth}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: 1,
                            d: arcPathD // 路径会平滑过渡到新位置
                          }}
                          transition={{
                            opacity: {
                              delay: index * rippleMenuConfig.animation.buttonAppearDelayStep + rippleMenuConfig.animation.buttonAppearDelay,
                              duration: rippleMenuConfig.animation.buttonAppearDuration
                            },
                            d: {
                              type: "spring",
                              stiffness: 300,
                              damping: 25,
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(itemOrIndex);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.setAttribute('fill', rippleMenuConfig.color.buttonHoverFill);
                            e.currentTarget.setAttribute('stroke', rippleMenuConfig.color.buttonHoverStroke);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.setAttribute('fill', rippleMenuConfig.color.buttonFill);
                            e.currentTarget.setAttribute('stroke', rippleMenuConfig.color.buttonStroke);
                          }}
                        />
                        
                        {/* 文字标签 - 沿着圆弧路径排列 */}
                        <text
                          fontSize={rippleMenuConfig.text.fontSize}
                          fill={rippleMenuConfig.color.textColor}
                          fontWeight={rippleMenuConfig.text.fontWeight}
                          fontFamily={rippleMenuConfig.text.fontFamily}
                          style={{ 
                            textShadow: rippleMenuConfig.color.textShadow,
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
