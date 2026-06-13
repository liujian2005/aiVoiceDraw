/**
 * VoiceDraw - 主应用入口（唤醒词模式）
 * 进页面自动获取语音权限，"你好"唤醒，"停下"休眠
 */

// ===== 全局状态 =====
let drawEngine = null;
let voiceEngine = null;
let historyItems = [];

const $ = id => document.getElementById(id);

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initVoiceEngine();
  updateVoiceCursor();
  showToast('🎙️ 说「你好」唤醒我', '', 3000);
});

function initCanvas() {
  drawEngine = new DrawEngine('main-canvas');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  // 暴露到全局
  window.draw = drawEngine;
  window.$$ = drawEngine;
}

function resizeCanvas() {
  const area = document.querySelector('.canvas-area');
  const areaW = area.clientWidth - 40;
  const areaH = area.clientHeight - 40;
  const aspectRatio = CONFIG.CANVAS.width / CONFIG.CANVAS.height;
  let displayW = Math.min(areaW, CONFIG.CANVAS.width);
  let displayH = displayW / aspectRatio;
  if (displayH > areaH) { displayH = areaH; displayW = displayH * aspectRatio; }
  const canvas = $('main-canvas');
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
}

function initVoiceEngine() {
  voiceEngine = new VoiceEngine({
    onStatus: (state) => {
      if (state === 'sleep') {
        setStatus('idle', '💤 说「你好」唤醒我');
      } else {
        setStatus('listening', '🎙️ 正在聆听...');
      }
    },

    onWake: (word, text) => {
      $('interim-text').textContent = '';
      $('final-text').textContent = `👋 ${text}`;
      setStatus('listening', '🎙️ 请说，我在听...');
      $('wake-indicator').classList.add('active');
      $('wake-indicator').querySelector('.wake-icon').textContent = '🎙️';
      $('wake-indicator').querySelector('.wake-label').textContent = '正在聆听...';
      showToast(`👋 你好！请说你想画什么`, 'success', 2000);
    },

    onSleep: (word, text) => {
      $('interim-text').textContent = '';
      $('final-text').textContent = `💤 ${text}`;
      setStatus('idle', '💤 已休眠，说「你好」唤醒');
      $('wake-indicator').classList.remove('active');
      $('wake-indicator').querySelector('.wake-icon').textContent = '💤';
      $('wake-indicator').querySelector('.wake-label').textContent = '说「你好」唤醒';
      showToast('😴 已暂停，说「你好」继续', '', 2500);
    },

    onInterim: (text) => {
      $('interim-text').textContent = text + '...';
    },

    onCommand: async (text) => {
      $('interim-text').textContent = '';
      $('final-text').textContent = `"${text}"`;
      setStatus('processing', '正在理解...');
      await processVoiceInput(text);
    },

    onError: (msg) => {
      setStatus('error', msg);
      showToast('⚠️ ' + msg, 'error');
      setTimeout(() => setStatus('idle', '💤 说「你好」唤醒我'), 4000);
    },
  });

  if (!voiceEngine.isSupported()) {
    setStatus('error', '浏览器不支持语音识别');
    showToast('⚠️ 请使用 Chrome 或 Edge 浏览器', 'error', 8000);
  }
}

// ===== 核心：处理语音指令 =====
async function processVoiceInput(text) {
  let result;
  try {
    result = await parseCommand(text);
  } catch (e) {
    setStatus('error', '指令解析异常');
    showToast('❌ 解析失败: ' + e.message, 'error');
    setStatus('listening', '🎙️ 请继续说...');
    return;
  }

  const displayEl = $('command-display');
  let toastMsg = '';
  let success = false;

  setStatus('drawing', '执行中...');

  try {
    switch (result.type) {
      case CMD_TYPE.DRAW_SHAPE: {
        if (result.confidence < 0.3) { handleUnknown(text, displayEl); return; }
        if (result.color) drawEngine.setColor(result.color);
        if (result.size)  drawEngine.setSize(result.size);
        if (result.position) drawEngine.setCursor(result.position);
        const drawn = drawEngine.drawShape(result);
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
        addHistory('🎨', `颜色→${result.colorName}`);
        toastMsg = `🎨 颜色已设为${result.colorName}`;
        success = true;
        break;
      }
      case CMD_TYPE.SET_SIZE: {
        drawEngine.setSize(result.size || result.delta);
        addHistory('📏', `大小→${drawEngine.getBrushState().size}`);
        toastMsg = `📏 大小已调整`;
        success = true;
        break;
      }
      case CMD_TYPE.UNDO: {
        const ok = drawEngine.undo();
        addHistory('↩️', '撤销');
        toastMsg = ok ? '↩️ 已撤销' : '⚠️ 无法撤销';
        success = ok;
        break;
      }
      case CMD_TYPE.REDO: {
        const ok = drawEngine.redo();
        addHistory('↪️', '重做');
        toastMsg = ok ? '↪️ 已重做' : '⚠️ 无法重做';
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
        toastMsg = '💾 已保存';
        success = true;
        break;
      }
      case CMD_TYPE.MOVE: {
        const newPos = drawEngine.moveCursor(result.direction, result.distance);
        updateVoiceCursor();
        addHistory('↕️', `移动→${dirNameCN(result.direction)}`);
        toastMsg = `移动到 (${Math.round(newPos.x*100)}%, ${Math.round(newPos.y*100)}%)`;
        success = true;
        break;
      }
      case CMD_TYPE.DRAW_AI: {
        if (!CONFIG.AI_DRAW.enabled || !CONFIG.AI_DRAW.apiKey) {
          setStatus('listening', '⚠️ AI绘画未配置');
          showToast('⚠️ AI绘画未配置，请在 config.js 设置 API Key', 'warning', 5000);
          displayEl.className = 'command-display warning';
          displayEl.textContent = `AI绘画未配置\n\n你说的是: "${result.prompt}"\n\n在 js/config.js → AI_DRAW 配置 API Key`;
          return;
        }
        setStatus('drawing', `🤖 AI 生成: ${result.prompt}`);
        showToast(`🤖 AI 绘画中...`, '', 0);
        displayEl.className = 'command-display';
        displayEl.textContent = `🤖 AI 绘画中...\n"${result.prompt}"`;

        const aiResult = await drawEngine.drawAI(result.prompt);
        if (aiResult) {
          updateVoiceCursor();
          addHistory('🤖', `AI: ${result.prompt}`);
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

    displayEl.className = 'command-display ' + (success ? 'success' : 'warning');
    displayEl.textContent = formatParseResult(result);
    if (toastMsg) showToast(toastMsg, success ? 'success' : 'warning');

    // 恢复聆听状态（休眠模式则由 onSleep 切换）
    if (voiceEngine.getState() === 'active') {
      setStatus('listening', '🎙️ 请继续说...');
    }

  } catch (e) {
    console.error('[App] 执行失败:', e);
    setStatus('error', '执行失败');
    showToast('❌ ' + e.message, 'error');
    setStatus('listening', '🎙️ 请继续说...');
  }
}

function handleUnknown(text, displayEl) {
  displayEl.className = 'command-display error';
  displayEl.textContent = `未能理解: "${text}"\n\n试试：\n• "画一个红色圆形"\n• "画一棵树"\n• "撤销"\n• "油画风格的向日葵"`;
  setStatus('listening', '⚠️ 没听懂，请再说一次');
  showToast('💬 没听懂，换个说法试试', 'warning', 3000);
}

// ===== UI 辅助 =====
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
  while (list.children.length > 30) list.removeChild(list.lastChild);
  historyItems.unshift({ icon, text, time: now });
}

function updateVoiceCursor() {
  const cursor = drawEngine.getCursor();
  const canvas = $('main-canvas');
  const area = document.querySelector('.canvas-area');
  const canvasRect = canvas.getBoundingClientRect();
  const areaRect = area.getBoundingClientRect();
  const vcEl = $('voice-cursor');
  vcEl.style.left = (canvasRect.left - areaRect.left + cursor.x * canvasRect.width) + 'px';
  vcEl.style.top = (canvasRect.top - areaRect.top + cursor.y * canvasRect.height) + 'px';
  vcEl.classList.remove('hidden');
}

let toastTimer = null;
function showToast(msg, type = '', duration = 2500) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  if (duration > 0) {
    toastTimer = setTimeout(() => { toast.className = 'toast hidden'; }, duration);
  }
}

// 别名（复用 commandParser 中的函数，这里做桥接）
function shapeNameCN(s) { const m={circle:'圆形',rect:'矩形',triangle:'三角形',star:'五角星',line:'直线',diamond:'菱形',heart:'心形',ellipse:'椭圆',arrow:'箭头'}; return m[s]||s; }
function sceneNameCN(s) { const m={sun:'太阳',house:'房子',tree:'树',face:'笑脸',cloud:'云',flower:'花',mountain:'山',rainbow:'彩虹',car:'汽车'}; return m[s]||s; }
function dirNameCN(d)  { const m={left:'左',right:'右',up:'上',down:'下'}; return m[d]||d; }
