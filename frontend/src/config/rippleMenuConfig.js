/**
 * RippleMenu 配置参数
 * 统一管理所有可调整的参数，方便快速调整
 */

export const rippleMenuConfig = {
  // ============================================
  // 📐 角度配置
  // ============================================
  angle: {
    // 起始角度偏移（第一个按钮从哪个方向开始）
    // - -Math.PI / 2 = -90度（12点钟方向，顶部）
    // - 0 = 0度（3点钟方向，右侧）
    // - Math.PI / 2 = 90度（6点钟方向，底部）
    // - -Math.PI = -180度（9点钟方向，左侧）
    startAngleOffset: -Math.PI / 2,
    
    // 按钮之间的角度间距（弧度）
    // - Math.PI / 6 = 30度（紧密）
    // - Math.PI / 4 = 45度（中等）
    // - Math.PI / 3 = 60度（较宽）
    // - Math.PI / 2 = 90度（很宽）
    spacing: Math.PI / 3,
  },

  // ============================================
  // 📏 尺寸配置
  // ============================================
  size: {
    // 内圈涟漪的基础半径
    baseRippleRadius: 30,
    
    // 涟漪圈层之间的间距
    rippleSpacing: 30,
    
    // 圆弧段按钮的径向宽度
    arcWidth: 24,
    
    // 圆弧段按钮的角度范围（弧度）
    // - Math.PI / 3 = 60度
    // - Math.PI / 4 = 45度（更窄）
    // - Math.PI / 2 = 90度（更宽）
    arcAngleSpan: Math.PI / 3,
    
    // 容器缓冲空间（用于容纳按钮和文字）
    containerBuffer: 150,
  },

  // ============================================
  // 🎨 颜色配置
  // ============================================
  color: {
    // 中央指纹图标的描边颜色
    centerFingerprintStroke: "	#FFFFFF",
    
    // 涟漪圆圈的描边颜色
    rippleStroke: "rgb(255, 255, 255)",
    
    // 按钮填充颜色（默认状态）
    buttonFill: "rgba(255, 255, 255, 0.56)",
    
    // 按钮描边颜色（默认状态）
    buttonStroke: "rgba(255, 255, 255, 0.9)",
    
    // 按钮填充颜色（悬停状态）
    buttonHoverFill: "rgba(255, 255, 255, 0.25)",
    
    // 按钮描边颜色（悬停状态）
    buttonHoverStroke: "rgba(255, 255, 255, 0.5)",
    
    // 文字颜色
    textColor: "white",
    
    // 文字阴影（用于提高可读性）
    textShadow: "0 0 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)",
  },

  // ============================================
  // ✍️ 文字配置
  // ============================================
  text: {
    // 字体大小
    fontSize: "12",
    
    // 字体粗细
    fontWeight: "normal",
    
    // 字体族
    fontFamily: "Ubuntu, sans-serif",
  },

  // ============================================
  // 🎬 动画配置
  // ============================================
  animation: {
    // 涟漪旋转动画的基础持续时间（秒）
    // 外层涟漪：baseDuration
    // 内层涟漪：baseDuration - (index * stepDuration)
    rippleRotationBaseDuration: 3.5,
    
    // 涟漪旋转动画的递减步长（秒）
    rippleRotationStepDuration: 0.5,
    
    // 涟漪圆弧显示的长度比例（0-1）
    // 0.25 = 显示周长的 25%（1/4 圆弧）
    rippleArcLengthRatio: 0.25,
    
    // 按钮出现的动画延迟（秒）
    buttonAppearDelay: 0.1,
    
    // 按钮之间的动画延迟间隔（秒）
    buttonAppearDelayStep: 0.05,
    
    // 按钮出现的动画持续时间（秒）
    buttonAppearDuration: 0.3,
    
    // 涟漪展开动画的弹簧参数
    rippleExpandSpring: {
      stiffness: 80,
      damping: 15,
    },
    
    // 涟漪发光动画配置
    rippleGlow: {
      // 是否启用发光动画
      enabled: true,
      // 发光动画持续时间（秒）
      duration: 2,
      // 最小透明度（发光最暗时）
      minOpacity: 0.4,
      // 最大透明度（发光最亮时）
      maxOpacity: 1.0,
      // 发光延迟（每个涟漪之间的延迟，秒）
      delayStep: 0.2,
      // 外发光效果配置
      outerGlow: {
        // 发光颜色（与涟漪颜色一致）
        color: "rgba(236, 253, 255, 0.83)",
        // 发光模糊半径（像素）
        blurRadius: 8,
        // 发光扩散距离（像素）
        spreadRadius: 5,
      },
    },
  },

  // ============================================
  // 🔧 其他配置
  // ============================================
  other: {
    // 加载时预估的意图数量（用于计算容器大小）
    estimatedIntents: 4,
    
    // 描边宽度
    strokeWidth: 2,
  },
};

