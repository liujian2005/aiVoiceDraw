/**
 * VoiceDraw - 配置模板
 * 复制此文件为 config.js 并填入你的 API Key
 *   cp js/config.example.js js/config.js
 */
const CONFIG = {
  // ====== 语音识别配置 ======
  SPEECH: {
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    restartDelay: 200,
  },

  // ====== 唤醒词 / 停止词 ======
  WAKE_WORDS:  ['你好', '嗨', '开始', '嘿', '画画', '启动', '听着'],
  STOP_WORDS:  ['停下', '暂停', '结束', '休息', '停止', '别画了'],

  // ====== AI 增强配置 ======
  AI: {
    enabled: true,
    apiKey: '',                 // ← 填入你的 DeepSeek API Key
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    aiThreshold: 0.4,
    timeout: 5000,
  },

  // ====== 画布默认配置 ======
  CANVAS: {
    width: 800,
    height: 600,
    bgColor: '#ffffff',
  },

  // ====== 默认画笔状态 ======
  DEFAULT_BRUSH: {
    color: '#e74c3c',
    size: 50,
    shape: 'circle',
    style: 'default',
    opacity: 1.0,
    lineWidth: 3,
  },

  // ====== 位置映射 ======
  POSITIONS: {
    '左上角':  { x: 0.15, y: 0.15 },
    '左边':    { x: 0.15, y: 0.50 },
    '左下角':  { x: 0.15, y: 0.85 },
    '上边':    { x: 0.50, y: 0.15 },
    '中央':    { x: 0.50, y: 0.50 },
    '中间':    { x: 0.50, y: 0.50 },
    '下边':    { x: 0.50, y: 0.85 },
    '右上角':  { x: 0.85, y: 0.15 },
    '右边':    { x: 0.85, y: 0.50 },
    '右下角':  { x: 0.85, y: 0.85 },
    '左':     { x: 0.15, y: 0.50 },
    '右':     { x: 0.85, y: 0.50 },
    '上':     { x: 0.50, y: 0.15 },
    '下':     { x: 0.50, y: 0.85 },
  },

  // ====== 尺寸映射 ======
  SIZES: {
    '微小': 15, '极小': 15,
    '很小': 25, '较小': 30, '小': 30,
    '中': 50, '中等': 50, '普通': 50,
    '大': 80, '较大': 80,
    '很大': 110, '巨大': 130, '超大': 150,
  },

  MAX_HISTORY: 30,
  MAX_UNDO_STACK: 20,

  // ====== 绘画风格 ======
  STYLES: {
    ink: {
      name: '水墨', icon: '🖌️',
      strokeWidth: 3, strokeColor: '#1a1a1a', fillOpacity: 0.6,
      shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.35)',
      gradientFill: true, inkBleed: true, mutedColor: true,
      lineCap: 'round', lineJoin: 'round',
    },
    anime: {
      name: '动漫', icon: '✨',
      strokeWidth: 3.5, strokeColor: '#2d3436', fillOpacity: 1.0,
      shadowBlur: 0, gradientFill: false, cellShade: true, brightColor: true,
      lineCap: 'round', lineJoin: 'round',
    },
    sketch: {
      name: '素描', icon: '✏️',
      strokeWidth: 1.2, strokeColor: '#555555', fillOpacity: 0.12,
      shadowBlur: 0, grayScale: true, hatching: true, roughLine: true,
      lineCap: 'round', lineJoin: 'round',
    },
    default: {
      name: '默认', icon: '🎨',
      strokeWidth: 2, fillOpacity: 1.0, shadowBlur: 8,
      gradientFill: false, lineCap: 'round', lineJoin: 'round',
    },
  },

  STYLE_LIST: ['default', 'ink', 'anime', 'sketch'],

  // ====== AI 绘画 API 配置 ======
  AI_DRAW: {
    enabled: true,
    apiUrl: 'https://api.apiyi.com/v1/images/generations',
    apiKey: '',                 // ← 填入你的 api易 API Key
    model: 'seedream-5-0-260128',
    imageSize: '1920x1920',
    timeout: 30000,
  },
};
