/**
 * VoiceDraw - 主应用入口
 * 协调语音引擎、指令解析、绘图引擎和UI
 */

// ===== 全局状态 =====
let drawEngine = null;
let voiceEngine = null;
let historyItems = [];

// UI 元素引用
const $ = id => document.getElementById(id);

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initVoiceEngine();
  initUI();
  showToast('🎙️ VoiceDraw 已就绪，按住麦克风按钮开始说话', 'success', 3000);
});

function initCanvas() {
  drawEngine = new DrawEngine('main-canvas');
  // 自适应画布大小
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const area = document.querySelector('.canvas-area');
  const areaW = area.clientWidth - 40;
  const areaH = area.clientHeight - 40;
  const aspectRatio = CONFIG.CANVAS.width / CONFIG.CANVAS.height;

  let displayW = Math.min(areaW, CONFIG.CANVAS.width);
  let displayH = displayW / aspectRatio;

  if (displayH > areaH) {
    displayH = areaH;
    displayW = displayH * aspectRatio;
  }

  const canvas = $('main-canvas');
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
}

function initVoiceEngine() {
  voiceEngine = new VoiceEngine({
    onInterim: (text) => {
      $('interim-text').textContent = text + '...';
      setStatus('listening', `正在识别: ${text}`);
    },
    onFinal: async (text) => {
      $('interim-text').textContent = '';
      $('final-text').textContent = `"${text}"`;
      setStatus('processing', '正在解析指令...');
      await processVoiceInput(text);
    },
    onStart: () => {
      $('mic-btn').classList.add('active');
      $('mic-btn').querySelector('.mic-label').textContent = '正在听...';
      setStatus('listening', '🎙️ 正在聆听...');
    },
    onStop: () => {
      $('mic-btn').classList.remove('active');
      $('mic-btn').querySelector('.mic-label').textContent = '按住说话';
      if (getStatusType() === 'listening') {
        setStatus('idle', '等待语音指令...');
      }
    },
    onError: (msg) => {
      setStatus('error', msg);
      showToast('⚠️ ' + msg, 'error');
      setTimeout(() => setStatus('idle', '等待语音指令...'), 3000);
    },
  });

  if (!voiceEngine.isSupported()) {
    setStatus('error', '浏览器不支持语音识别');
    showToast('⚠️ 请使用 Chrome 或 Edge 浏览器以启用语音识别', 'error', 6000);
  }
}

function initUI() {
  const micBtn = $('mic-btn');

  // 麦克风按钮 - 按住说话
  micBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    voiceEngine.pressStart();
  });
  micBtn.addEventListener('mouseup', () => voiceEngine.pressEnd());
  micBtn.addEventListener('mouseleave', () => {
    if (voiceEngine.isListening && voiceEngine.isHoldMode) {
      voiceEngine.pressEnd();
    }
  });
  // 触摸支持
  micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); voiceEngine.pressStart(); });
  micBtn.addEventListener('touchend', (e) => { e.preventDefault(); voiceEngine.pressEnd(); });

  // 空格键激活语音
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !voiceEngine.isListening) {
      e.preventDefault();
      voiceEngine.pressStart();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      voiceEngine.pressEnd();
    }
  });

  // 帮助弹窗
  $('btn-help').style.pointerEvents = 'all';
  $('btn-help').style.cursor = 'pointer';
  $('btn-help').addEventListener('click', () => $('help-modal').classList.remove('hidden'));
  $('close-help').addEventListener('click', () => $('help-modal').classList.add('hidden'));
  $('help-modal').addEventListener('click', (e) => {
    if (e.target === $('help-modal')) $('help-modal').classList.add('hidden');
  });

  // 工具栏按钮
  $('btn-undo').addEventListener('click', () => {
    const ok = drawEngine.undo();
    if (ok) { updateVoiceCursor(); addHistory('↩️', '撤销'); showToast('↩️ 已撤销', 'success'); }
    else showToast('⚠️ 没有可撤销的操作', 'warning');
  });
  $('btn-clear').addEventListener('click', () => {
    drawEngine.clear();
    historyItems = [];
    $('history-list').innerHTML = '';
    addHistory('🗑️', '清空画布');
    showToast('🗑️ 画布已清空', 'success');
  });
  $('btn-save').addEventListener('click', () => {
    drawEngine.save();
    addHistory('💾', '保存图片');
    showToast('💾 图片已保存', 'success');
  });

  // 全局暴露，方便控制台调试
  window.draw = drawEngine;
  window.$$ = drawEngine;

  // 更新UI状态显示
  updateBrushStateUI();
  updateVoiceCursor();
}

// ===== 核心：处理语音输入 =====
async function processVoiceInput(text) {
  let result;
  try {
    result = await parseCommand(text);
  } catch (e) {
    setStatus('error', '指令解析异常');
    showToast('❌ 解析失败: ' + e.message, 'error');
    return;
  }

  // 显示解析结果
  const displayEl = $('command-display');
  const formatted = formatParseResult(result);

  // 执行指令
  let success = false;
  let statusMsg = '';
  let toastMsg = '';

  setStatus('drawing', '执行中...');

  try {
    switch (result.type) {
      case CMD_TYPE.DRAW_SHAPE: {
        if (result.confidence < 0.3) {
          handleUnknown(text, displayEl);
          return;
        }
        // 应用颜色/大小
        if (result.color) drawEngine.setColor(result.color);
        if (result.size)  drawEngine.setSize(result.size);
        if (result.position) drawEngine.setCursor(result.position);

        const drawn = drawEngine.drawShape(result);
        updateBrushStateUI();
        updateVoiceCursor();
        addHistory('🎨', `画了${result.colorName || ''}${shapeNameCN(result.shape)}`);
        toastMsg = `✅ 已绘制${result.colorName || ''}${shapeNameCN(result.shape)}`;
        success = true;
        break;
      }
      case CMD_TYPE.DRAW_SCENE: {
        if (result.color) drawEngine.setColor(result.color);
        if (result.position) drawEngine.setCursor(result.position);
        drawEngine.drawScene(result);
        updateVoiceCursor();
        addHistory('🖼️', `绘制场景: ${sceneNameCN(result.scene)}`);
        toastMsg = `✅ 已绘制${sceneNameCN(result.scene)}`;
        success = true;
        break;
      }
      case CMD_TYPE.SET_COLOR: {
        drawEngine.setColor(result.color);
        updateBrushStateUI();
        addHistory('🎨', `颜色→${result.colorName}`);
        toastMsg = `🎨 颜色已设置为${result.colorName}`;
        success = true;
        break;
      }
      case CMD_TYPE.SET_SIZE: {
        drawEngine.setSize(result.size || result.delta);
        updateBrushStateUI();
        const s = drawEngine.getBrushState().size;
        addHistory('📏', `大小→${s}`);
        toastMsg = `📏 大小已设置为 ${s}`;
        success = true;
        break;
      }
      case CMD_TYPE.UNDO: {
        const ok = drawEngine.undo();
        addHistory('↩️', '撤销');
        toastMsg = ok ? '↩️ 已撤销' : '⚠️ 没有可撤销的操作';
        success = ok;
        break;
      }
      case CMD_TYPE.REDO: {
        const ok = drawEngine.redo();
        addHistory('↪️', '重做');
        toastMsg = ok ? '↪️ 已重做' : '⚠️ 没有可重做的操作';
        success = ok;
        break;
      }
      case CMD_TYPE.CLEAR: {
        drawEngine.clear();
        historyItems = [];
        $('history-list').innerHTML = '';
        addHistory('🗑️', '清空画布');
        toastMsg = '🗑️ 画布已清空';
        success = true;
        break;
      }
      case CMD_TYPE.SAVE: {
        drawEngine.save();
        addHistory('💾', '保存图片');
        toastMsg = '💾 图片已保存';
        success = true;
        break;
      }
      case CMD_TYPE.MOVE: {
        const newPos = drawEngine.moveCursor(result.direction, result.distance);
        updateVoiceCursor();
        addHistory('↕️', `移动光标→${dirNameCN(result.direction)}`);
        toastMsg = `移动到 (${Math.round(newPos.x*100)}%, ${Math.round(newPos.y*100)}%)`;
        success = true;
        break;
      }
      case CMD_TYPE.DRAW_AI: {
        if (!CONFIG.AI_DRAW.enabled || !CONFIG.AI_DRAW.apiKey) {
          setStatus('idle', '⚠️ AI绘画未配置，请在 config.js 设置 API Key');
          showToast('⚠️ AI绘画未配置，请点击❓查看说明', 'warning', 5000);
          displayEl.className = 'command-display warning';
          displayEl.textContent = `AI绘画未配置\n\n语音内容: "${result.prompt}"\n\n请在 js/config.js → AI_DRAW 中配置:\n1. 填入 apiKey\n2. 设置 enabled: true`;
          return;
        }
        setStatus('drawing', `🤖 AI 正在生成: ${result.prompt}`);
        showToast(`🤖 AI 绘画中: "${result.prompt}"`, '', 2000);
        displayEl.className = 'command-display';
        displayEl.textContent = `🤖 AI 绘画中...\n"${result.prompt}"`;

        const aiResult = await drawEngine.drawAI(result.prompt);
        if (aiResult) {
          updateVoiceCursor();
          addHistory('🤖', `AI绘画: ${result.prompt}`);
          toastMsg = `✅ AI 已绘制: ${result.prompt}`;
          success = true;
        } else {
          toastMsg = '❌ AI 绘画失败';
          success = false;
        }
        break;
      }
      default:
        handleUnknown(text, displayEl);
        return;
    }

    // 更新UI
    displayEl.className = 'command-display ' + (success ? 'success' : 'warning');
    displayEl.textContent = formatted;
    setStatus('idle', success ? `✅ ${toastMsg}` : `⚠️ ${toastMsg}`);
    if (toastMsg) showToast(toastMsg, success ? 'success' : 'warning');

    // 恢复idle状态
    setTimeout(() => setStatus('idle', '等待语音指令...'), 3000);

  } catch (e) {
    console.error('[App] 执行指令失败:', e);
    setStatus('error', '执行失败');
    showToast('❌ 执行失败: ' + e.message, 'error');
    setTimeout(() => setStatus('idle', '等待语音指令...'), 3000);
  }
}

function handleUnknown(text, displayEl) {
  displayEl.className = 'command-display error';
  displayEl.textContent = `未能识别指令: "${text}"\n\n试试说：\n• "画一个红色圆形"\n• "画太阳"\n• "撤销"\n（点击 ❓ 查看完整指令）`;
  setStatus('idle', '⚠️ 未识别，请重试');
  showToast(`💬 没听懂 "${text}"，点击❓查看指令`, 'warning', 4000);
}

// ===== UI 辅助函数 =====
let currentStatusType = 'idle';

function setStatus(type, text) {
  currentStatusType = type;
  const dot = $('status-dot');
  const txt = $('status-text');
  dot.className = `status-dot ${type}`;
  txt.textContent = text;
}

function getStatusType() { return currentStatusType; }

function addHistory(icon, text) {
  const list = $('history-list');
  const now = new Date().toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const li = document.createElement('li');
  li.className = 'history-item';
  li.innerHTML = `<span class="hi-icon">${icon}</span><span class="hi-text">${text}</span><span class="hi-time">${now}</span>`;
  list.insertBefore(li, list.firstChild);
  // 最多显示20条
  while (list.children.length > 20) list.removeChild(list.lastChild);
  historyItems.unshift({ icon, text, time: now });
}

function updateBrushStateUI() {
  const state = drawEngine.getBrushState();
  // 颜色
  const colorName = getColorName(state.color);
  $('color-preview').style.background = state.color;
  $('state-color').innerHTML = `<span class="color-preview" style="background:${state.color}"></span>${colorName}`;
  // 大小
  $('state-size').textContent = `${state.size}px`;
  // 形状（上次绘制）
}

function updateVoiceCursor() {
  const cursor = drawEngine.getCursor();
  const canvas = $('main-canvas');
  const area = document.querySelector('.canvas-area');
  const canvasRect = canvas.getBoundingClientRect();
  const areaRect = area.getBoundingClientRect();

  const vcEl = $('voice-cursor');
  const cx = canvasRect.left - areaRect.left + cursor.x * canvasRect.width;
  const cy = canvasRect.top - areaRect.top + cursor.y * canvasRect.height;

  vcEl.style.left = cx + 'px';
  vcEl.style.top = cy + 'px';
  vcEl.classList.remove('hidden');
}

let toastTimer = null;
function showToast(msg, type = '', duration = 2500) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast hidden';
  }, duration);
}

// 导出给 HTML 按钮（虽然UI按钮是装饰性的，这里保留语音触发）
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
