import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function FingerprintCursor({ isScanning }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };
    
    window.addEventListener('mousemove', updatePosition);
    return () => window.removeEventListener('mousemove', updatePosition);
  }, []);

  if (!isVisible) return null;

  // 计算 SVG 中心点偏移（基于 viewBox 尺寸，缩小到 1/2）
  const svgWidth = 77.915 / 2;
  const svgHeight = 79.3146 / 2;
  const offsetX = svgWidth / 2;
  const offsetY = svgHeight / 2;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-50 mix-blend-difference"
      animate={{ x: position.x - offsetX, y: position.y - offsetY }}
      transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
    >
      {/* 指纹 SVG 图标 - 使用您提供的 cursor.svg 路径，缩小到 1/2 */}
      <div className="relative text-white opacity-80" style={{ width: svgWidth, height: svgHeight }}>
        <svg 
          viewBox="0 0 77.915 79.3146" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* 路径 1 - 带描边动画 */}
          <motion.path 
            d="M314.4388,436.0774c-33.9894-16.9468-34.4151-47.54-16.9154-59.04,22.8285-15.0017,42,9,39,20.5m-8.5,29.9992c-10.1665-1.8332-30-11.2-28-34,0-1.5,1.8-8.7,11-9.5,11.5-1,13,9.5,13,9.5s0,14.8125,14.5,13c9.6-1.2,10.6667-10.1666,10-14.5-2.3513-12.4755-14.3105-37.1452-46.0005-30-19.8666,3.4775-41.5509,31.5768-16.4079,65.5" 
            transform="translate(-272.769 -358.7627)"
            strokeDasharray="200"
            animate={{ 
              strokeDashoffset: [0, -400]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* 路径 2 - 带描边动画（延迟启动） */}
          <motion.path 
            d="M312.1169,395.6115c0,8.5013,6.2928,25.868,30.5414,22.245" 
            transform="translate(-272.769 -358.7627)"
            strokeDasharray="100"
            animate={{ 
              strokeDashoffset: [0, -200]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </svg>
        
        {/* 扫描动效：点击时触发 */}
        {isScanning && (
          <motion.div 
            className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
            initial={{ top: 0, opacity: 0 }}
            animate={{ top: "100%", opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

