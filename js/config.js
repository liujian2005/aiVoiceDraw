/**
 * VoiceDraw - 全局配置
 */
const CONFIG = {
  // ====== 语音识别配置 ======
  SPEECH: {
    lang: 'zh-CN',
    continuous: true,          // 持续监听（唤醒词模式）
    interimResults: true,
    maxAlternatives: 3,
    restartDelay: 200,         // 重连延迟(ms)
  },

  // ====== 唤醒词 / 停止词 ======
  WAKE_WORDS:  ['你好', '嗨', '开始', '嘿', '画画', '启动', '听着'],
  STOP_WORDS:  ['停下', '暂停', '结束', '休息', '停止', '别画了'],

  // ====== AI 增强配置（可选，不填则纯规则解析）======
  AI: {
    enabled: true,             // 是否启用AI辅助理解
    // 替换为你的 API Key（支持 DeepSeek / 通义 / OpenAI 兼容接口）
    apiKey: '',
    // 使用 DeepSeek 免费额度作为示例
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    // 仅当规则解析置信度低于此值时才调用AI
    aiThreshold: 0.4,
    timeout: 5000,             // API超时时间(ms)
  },

  // ====== 画布默认配置 ======
  CANVAS: {
    width: 800,
    height: 600,
    bgColor: '#ffffff',
  },

  // ====== 默认画笔状态 ======
  DEFAULT_BRUSH: {
    color: '#e74c3c',    // 默认颜色：红色
    size: 50,            // 默认尺寸
    shape: 'circle',     // 默认形状
    style: 'default',    // 默认风格
    opacity: 1.0,
    lineWidth: 3,
  },

  // ====== 位置映射（相对于画布的百分比）======
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
    // 英文别名
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

  // ====== 历史记录最大条数 ======
  MAX_HISTORY: 30,
  MAX_UNDO_STACK: 20,

  // ====== 绘画风格 ======
  STYLES: {
    ink: {
      name: '水墨',
      icon: '🖌️',
      strokeWidth: 3,
      strokeColor: '#1a1a1a',
      fillOpacity: 0.6,
      shadowBlur: 12,
      shadowColor: 'rgba(0,0,0,0.35)',
      gradientFill: true,
      inkBleed: true,
      mutedColor: true,        // 降低饱和度模拟水墨
      lineCap: 'round',
      lineJoin: 'round',
    },
    anime: {
      name: '动漫',
      icon: '✨',
      strokeWidth: 3.5,
      strokeColor: '#2d3436',
      fillOpacity: 1.0,
      shadowBlur: 0,
      gradientFill: false,
      cellShade: true,
      brightColor: true,       // 鲜艳色彩
      lineCap: 'round',
      lineJoin: 'round',
    },
    sketch: {
      name: '素描',
      icon: '✏️',
      strokeWidth: 1.2,
      strokeColor: '#555555',
      fillOpacity: 0.12,
      shadowBlur: 0,
      grayScale: true,
      hatching: true,
      roughLine: true,
      lineCap: 'round',
      lineJoin: 'round',
    },
    default: {
      name: '默认',
      icon: '🎨',
      strokeWidth: 2,
      fillOpacity: 1.0,
      shadowBlur: 8,
      gradientFill: false,
      lineCap: 'round',
      lineJoin: 'round',
    },
  },

  // 风格列表（UI 遍历用）
  STYLE_LIST: ['default', 'ink', 'anime', 'sketch'],

  // ====== AI 绘画 API 配置 ======
  // 推荐：Seedream 4.5（字节跳动），中文理解强，$0.035/张
  // 接入方式：apyi.com（支付宝/微信）或 deepinfra.com
  AI_DRAW: {
    enabled: false,              // 填入 API Key 后改为 true
    apiUrl: 'https://api.apiyi.com/v1/images/generations',
    apiKey: '',                  // 🔑 apyi.com 注册后在控制台获取
    model: 'seedream-5-0-260128', // Seedream 5.0 最新版，$0.035
    imageSize: '1024x1024',      // 生成图片尺寸
    timeout: 30000,              // 超时(ms)
  },
};
