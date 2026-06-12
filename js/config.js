/**
 * VoiceDraw - 全局配置
 */
const CONFIG = {
  // ====== 语音识别配置 ======
  SPEECH: {
    lang: 'zh-CN',            // 识别语言
    continuous: false,         // 单次识别（按钮模式）
    interimResults: true,      // 显示中间结果
    maxAlternatives: 3,        // 备选结果数量
    restartDelay: 300,         // 识别结束后重启延迟(ms)
  },

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
    opacity: 1.0,
    lineWidth: 3,        // 画线时的线宽
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
};
