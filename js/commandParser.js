/**
 * VoiceDraw - 指令解析引擎
 * 两层架构：规则解析（快速）+ AI增强（兜底）
 */

// ===== 指令类型枚举 =====
const CMD_TYPE = {
  DRAW_SHAPE:    'draw_shape',     // 绘制形状
  DRAW_SCENE:    'draw_scene',     // 绘制场景（复合）
  DRAW_AI:       'draw_ai',        // AI 绘画（任意内容）
  DRAW_LINE:     'draw_line',      // 画线
  SET_COLOR:     'set_color',      // 设置颜色
  SET_SIZE:      'set_size',       // 设置大小
  SET_POSITION:  'set_position',   // 设置位置
  UNDO:          'undo',           // 撤销
  REDO:          'redo',           // 重做
  CLEAR:         'clear',          // 清空
  SAVE:          'save',           // 保存
  MOVE:          'move',           // 移动当前
  UNKNOWN:       'unknown',        // 未知
};

// ===== 形状关键词映射 =====
const SHAPE_KEYWORDS = {
  'circle': ['圆', '圆形', '圆圈', '球', '圆球', '椭圆'],
  'rect':   ['方形', '方块', '正方形', '矩形', '长方形', '四边形', '方'],
  'triangle': ['三角', '三角形', '三角形', '等边三角'],
  'star':   ['星星', '五角星', '星形', '星'],
  'line':   ['线', '直线', '横线', '竖线', '斜线', '线段'],
  'ellipse': ['椭圆', '鸡蛋形', '卵形'],
  'diamond': ['菱形', '钻石形', '菱'],
  'heart':  ['心形', '爱心', '心'],
  'arrow':  ['箭头', '箭'],
};

// ===== 场景关键词（复合图形）=====
const SCENE_KEYWORDS = {
  'sun':    ['太阳', '日出', '阳光'],
  'house':  ['房子', '房屋', '房', '小屋', '建筑'],
  'tree':   ['树', '大树', '小树', '树木'],
  'face':   ['笑脸', '人脸', '脸', '表情'],
  'cloud':  ['云', '云朵', '白云'],
  'flower': ['花', '花朵', '玫瑰'],
  'mountain': ['山', '山峰', '山脉'],
  'rainbow': ['彩虹'],
  'car':    ['汽车', '车子', '小车'],
};

// ===== 操作关键词 =====
const ACTION_KEYWORDS = {
  undo:  ['撤销', '取消', '退一步', '撤回', '回退', '上一步', '撤'],
  redo:  ['重做', '恢复', '还原', '前进一步'],
  clear: ['清空', '清除', '清屏', '重新开始', '全部删掉', '清空画布', '删掉所有'],
  save:  ['保存', '下载', '保存图片', '存一下', '下载图片'],
};

// ===== 位置关键词 =====
const POSITION_KEYWORDS = Object.keys(CONFIG.POSITIONS);

// ===== 方向移动关键词 =====
const MOVE_KEYWORDS = {
  left:  ['向左', '往左', '靠左', '左移'],
  right: ['向右', '往右', '靠右', '右移'],
  up:    ['向上', '往上', '靠上', '上移'],
  down:  ['向下', '往下', '靠下', '下移'],
};

/**
 * 主解析函数
 * @param {string} text - 识别的语音文本
 * @returns {Promise<ParseResult>}
 */
async function parseCommand(text) {
  if (!text || text.trim() === '') {
    return { type: CMD_TYPE.UNKNOWN, confidence: 0, raw: text };
  }

  const cleaned = text.trim().toLowerCase();
  const result = ruleBasedParse(cleaned);

  // 如果规则解析置信度高，直接返回
  if (result.confidence >= 0.7) {
    return result;
  }

  // 尝试 AI 增强解析（如果配置了 API Key）
  if (CONFIG.AI.enabled && CONFIG.AI.apiKey && result.confidence < CONFIG.AI.aiThreshold) {
    try {
      const aiResult = await aiEnhancedParse(text, result);
      if (aiResult && aiResult.confidence > result.confidence) {
        return aiResult;
      }
    } catch (e) {
      console.warn('[CommandParser] AI解析失败，回退到规则解析:', e.message);
    }
  }

  return result;
}

/**
 * 规则解析器（快速、无网络依赖）
 */
function ruleBasedParse(text) {
  // 1. 检测操作指令
  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return { type: CMD_TYPE[action.toUpperCase()] || CMD_TYPE.UNDO, confidence: 0.95, raw: text,
               action };
    }
  }

  // 2. 检测颜色设置（"把颜色改成XX" "换成XX色"）
  const colorSetPatterns = ['把颜色改', '改颜色', '换颜色', '换成', '改成'];
  const isColorSet = colorSetPatterns.some(p => text.includes(p));
  if (isColorSet) {
    const colorResult = parseColor(text);
    if (colorResult) {
      return {
        type: CMD_TYPE.SET_COLOR,
        color: colorResult.colorValue,
        colorName: colorResult.colorName,
        confidence: 0.90,
        raw: text,
      };
    }
  }

  // 3. 检测大小设置（"把大小改成100" "放大" "缩小"）
  if (text.includes('放大')) {
    return { type: CMD_TYPE.SET_SIZE, delta: '+', confidence: 0.90, raw: text };
  }
  if (text.includes('缩小')) {
    return { type: CMD_TYPE.SET_SIZE, delta: '-', confidence: 0.90, raw: text };
  }
  const sizeSetMatch = text.match(/(?:大小|尺寸|改为|改成|设为|设置为)(\d+)/);
  if (sizeSetMatch) {
    return { type: CMD_TYPE.SET_SIZE, size: parseInt(sizeSetMatch[1]), confidence: 0.90, raw: text };
  }

  // 4. 检测场景绘制（优先级高于单形状）
  for (const [scene, keywords] of Object.entries(SCENE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      const color = parseColor(text);
      const position = parsePosition(text);
      return {
        type: CMD_TYPE.DRAW_SCENE,
        scene,
        color: color ? color.colorValue : null,
        colorName: color ? color.colorName : null,
        position,
        confidence: 0.85,
        raw: text,
      };
    }
  }

  // 5. 检测形状绘制
  for (const [shape, keywords] of Object.entries(SHAPE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      const color = parseColor(text);
      const size = parseSize(text);
      const position = parsePosition(text);

      // 判断是否有明确的位置词
      const hasPositionWord = POSITION_KEYWORDS.some(kw => text.includes(kw))
        || Object.values(MOVE_KEYWORDS).flat().some(kw => text.includes(kw));

      return {
        type: CMD_TYPE.DRAW_SHAPE,
        shape,
        color: color ? color.colorValue : null,
        colorName: color ? color.colorName : null,
        size,
        position,
        hasPosition: hasPositionWord,
        confidence: 0.80,
        raw: text,
      };
    }
  }

  // 6. 检测移动指令
  for (const [dir, keywords] of Object.entries(MOVE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      const distMatch = text.match(/(\d+)/);
      return {
        type: CMD_TYPE.MOVE,
        direction: dir,
        distance: distMatch ? parseInt(distMatch[1]) : 30,
        confidence: 0.80,
        raw: text,
      };
    }
  }

  // 7. 纯颜色词（隐含设置颜色）
  const colorOnly = parseColor(text);
  if (colorOnly && text.length <= 6) {
    return {
      type: CMD_TYPE.SET_COLOR,
      color: colorOnly.colorValue,
      colorName: colorOnly.colorName,
      confidence: 0.70,
      raw: text,
    };
  }

  // 8. 不匹配任何已知指令 → AI 绘画
  const prompt = cleanPrompt(text);
  return {
    type: CMD_TYPE.DRAW_AI,
    prompt,
    confidence: 0.60,
    raw: text,
  };
}

/**
 * 清洗 prompt — 去掉"画一个""帮我画"等前缀，保留核心描述
 * "画一只水墨山水画" → "水墨山水画"
 * "帮我画个油画向日葵" → "油画向日葵"
 */
function cleanPrompt(text) {
  return text
    .replace(/^(画一个|画个|画一幅|画张|画|帮我画|给我画|来一个|来个|绘制|生成)/, '')
    .trim();
}

/**
 * 解析文本中的尺寸信息
 */
function parseSize(text) {
  // 优先匹配数字
  const numMatch = text.match(/(\d+)(?:像素|px|大小)?/);
  if (numMatch) {
    return Math.min(Math.max(parseInt(numMatch[1]), 5), 300);
  }
  // 按长度降序匹配尺寸词
  const sizeKeys = Object.keys(CONFIG.SIZES).sort((a, b) => b.length - a.length);
  for (const key of sizeKeys) {
    if (text.includes(key)) {
      return CONFIG.SIZES[key];
    }
  }
  return null; // 未指定则使用当前值
}

/**
 * 解析文本中的位置信息
 */
function parsePosition(text) {
  const posKeys = POSITION_KEYWORDS.sort((a, b) => b.length - a.length);
  for (const key of posKeys) {
    if (text.includes(key)) {
      return CONFIG.POSITIONS[key];
    }
  }
  return null;
}

/**
 * AI增强解析（调用LLM理解模糊指令）
 */
async function aiEnhancedParse(text, ruleResult) {
  const systemPrompt = `你是一个语音绘图工具的指令解析器。
用户说了一句话，请解析为JSON指令。

支持的形状: circle(圆形), rect(矩形), triangle(三角形), star(五角星), line(线), diamond(菱形), heart(心形)
支持的场景: sun(太阳), house(房子), tree(树), face(笑脸), cloud(云)
支持的操作: undo(撤销), clear(清空), save(保存)

返回格式（JSON）:
{
  "type": "draw_shape|draw_scene|set_color|set_size|undo|clear|save|unknown",
  "shape": "形状名(可选)",
  "scene": "场景名(可选)",
  "color": "CSS颜色值(可选, 如#ff0000)",
  "colorName": "颜色中文名(可选)",
  "size": 数字(可选, 10-200),
  "position": {"x": 0-1的小数, "y": 0-1的小数} 或null,
  "confidence": 0-1的置信度
}

只返回JSON，不要其他文字。`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.AI.timeout);

  const response = await fetch(CONFIG.AI.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.AI.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.AI.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `用户说: "${text}"` }
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) throw new Error(`AI API错误: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error('AI返回空结果');

  const parsed = JSON.parse(content);
  parsed.raw = text;
  parsed.aiEnhanced = true;
  return parsed;
}

/**
 * 格式化解析结果为可读文本（用于UI显示）
 */
function formatParseResult(result) {
  if (!result) return '解析失败';
  switch (result.type) {
    case CMD_TYPE.DRAW_SHAPE:
      return `绘制${result.colorName || ''}${shapeNameCN(result.shape)}\n尺寸: ${result.size || '默认'}\n位置: ${formatPosition(result.position)}`;
    case CMD_TYPE.DRAW_SCENE:
      return `绘制场景: ${sceneNameCN(result.scene)}\n颜色: ${result.colorName || '默认'}\n位置: ${formatPosition(result.position)}`;
    case CMD_TYPE.SET_COLOR:
      return `设置颜色: ${result.colorName}`;
    case CMD_TYPE.SET_SIZE:
      if (result.delta === '+') return '放大图形';
      if (result.delta === '-') return '缩小图形';
      return `设置大小: ${result.size}`;
    case CMD_TYPE.UNDO:   return '撤销上一步';
    case CMD_TYPE.REDO:   return '重做';
    case CMD_TYPE.CLEAR:  return '清空画布';
    case CMD_TYPE.SAVE:   return '保存图片';
    case CMD_TYPE.MOVE:   return `向${dirNameCN(result.direction)}移动 ${result.distance}px`;
    case CMD_TYPE.DRAW_AI: return `🤖 AI 绘画: "${result.prompt}"`;
    default:              return `未识别指令: "${result.raw}"`;
  }
}

function shapeNameCN(shape) {
  const names = { circle:'圆形', rect:'矩形', triangle:'三角形', star:'五角星',
                  line:'直线', diamond:'菱形', heart:'心形', ellipse:'椭圆', arrow:'箭头' };
  return names[shape] || shape;
}

function sceneNameCN(scene) {
  const names = { sun:'太阳', house:'房子', tree:'树', face:'笑脸',
                  cloud:'云', flower:'花', mountain:'山', rainbow:'彩虹', car:'汽车' };
  return names[scene] || scene;
}

function dirNameCN(dir) {
  const names = { left:'左', right:'右', up:'上', down:'下' };
  return names[dir] || dir;
}

function formatPosition(pos) {
  if (!pos) return '当前位置';
  const posNames = Object.entries(CONFIG.POSITIONS);
  for (const [name, p] of posNames) {
    if (Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01) return name;
  }
  return `(${Math.round(pos.x * 100)}%, ${Math.round(pos.y * 100)}%)`;
}
