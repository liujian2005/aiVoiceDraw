/**
 * VoiceDraw - 绘图执行引擎
 * 负责所有 Canvas 绘图操作
 */
class DrawEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // 撤销/重做栈
    this.undoStack = [];
    this.redoStack = [];

    // 当前画笔状态
    this.brush = { ...CONFIG.DEFAULT_BRUSH };

    // 当前虚拟光标位置（相对百分比）
    this.cursor = { x: 0.5, y: 0.5 };

    this._initCanvas();
  }

  _initCanvas() {
    const { width, height } = CONFIG.CANVAS;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = CONFIG.CANVAS.bgColor;
    this.ctx.fillRect(0, 0, width, height);
    this._saveState();
  }

  // ===== 状态管理 =====
  _saveState() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(imageData);
    if (this.undoStack.length > CONFIG.MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
    this.redoStack = []; // 有新操作则清空重做栈
  }

  undo() {
    if (this.undoStack.length <= 1) return false;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.ctx.putImageData(prev, 0, 0);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.ctx.putImageData(next, 0, 0);
    return true;
  }

  clear() {
    this._saveState();
    this.ctx.fillStyle = CONFIG.CANVAS.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this._saveState();
  }

  save() {
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `VoiceDraw_${ts}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    return true;
  }

  // ===== 画笔状态更新 =====
  setColor(colorValue) {
    this.brush.color = colorValue;
  }

  setSize(size) {
    if (size === '+') { this.brush.size = Math.min(this.brush.size + 20, 300); }
    else if (size === '-') { this.brush.size = Math.max(this.brush.size - 20, 5); }
    else { this.brush.size = Math.min(Math.max(size, 5), 300); }
  }

  setCursor(position) {
    if (position) {
      this.cursor = { ...position };
    }
  }

  moveCursor(direction, distance) {
    const step = (distance || 30) / Math.max(this.canvas.width, this.canvas.height);
    switch (direction) {
      case 'left':  this.cursor.x = Math.max(0.05, this.cursor.x - step * 2); break;
      case 'right': this.cursor.x = Math.min(0.95, this.cursor.x + step * 2); break;
      case 'up':    this.cursor.y = Math.max(0.05, this.cursor.y - step * 2); break;
      case 'down':  this.cursor.y = Math.min(0.95, this.cursor.y + step * 2); break;
    }
    return this.cursor;
  }

  // ===== 坐标转换 =====
  _toPixel(pos) {
    return {
      x: (pos || this.cursor).x * this.canvas.width,
      y: (pos || this.cursor).y * this.canvas.height,
    };
  }

  // ===== 核心绘图函数 =====
  drawShape(cmd) {
    const { shape, color, size, position } = cmd;
    const effectiveColor = color || this.brush.color;
    const effectiveSize = size || this.brush.size;
    const effectivePos = position || this.cursor;

    // 更新画笔状态
    if (color) this.brush.color = color;
    if (size) this.brush.size = size;
    if (position) this.cursor = position;

    this._saveState();

    const { x, y } = this._toPixel(effectivePos);
    const ctx = this.ctx;

    ctx.save();
    const { fillColor, strokeColor, style } = this._applyBrushStyle(ctx, effectiveColor);

    // 水墨风格：圆形/椭圆用径向渐变模拟水彩渗透
    const useInkGrad = style.gradientFill && (shape === 'circle' || shape === 'ellipse');
    if (useInkGrad && shape === 'circle') {
      ctx.fillStyle = this._createInkGradient(ctx, x, y, effectiveSize / 2, fillColor);
    } else if (useInkGrad && shape === 'ellipse') {
      ctx.fillStyle = this._createInkGradient(ctx, x, y, effectiveSize * 0.6, fillColor);
    } else {
      ctx.fillStyle = fillColor;
    }
    ctx.strokeStyle = strokeColor;

    switch (shape) {
      case 'circle':
        this._drawCircle(ctx, x, y, effectiveSize / 2); break;
      case 'ellipse':
        this._drawEllipse(ctx, x, y, effectiveSize * 0.7, effectiveSize * 0.5); break;
      case 'rect':
        this._drawRect(ctx, x, y, effectiveSize, effectiveSize); break;
      case 'triangle':
        this._drawTriangle(ctx, x, y, effectiveSize); break;
      case 'star':
        this._drawStar(ctx, x, y, effectiveSize / 2, 5); break;
      case 'diamond':
        this._drawDiamond(ctx, x, y, effectiveSize); break;
      case 'heart':
        this._drawHeart(ctx, x, y, effectiveSize / 2); break;
      case 'line':
        this._drawLine(ctx, x, y, effectiveSize, effectiveColor); break;
      case 'arrow':
        this._drawArrow(ctx, x, y, effectiveSize, effectiveColor); break;
      default:
        this._drawCircle(ctx, x, y, effectiveSize / 2);
    }

    // 素描风格：叠加排线阴影
    if (style.hatching && effectiveSize > 20) {
      this._drawHatching(ctx, x, y, effectiveSize);
    }

    ctx.restore();
    return { x, y, size: effectiveSize, color: effectiveColor };
  }

  drawScene(cmd) {
    const { scene, color, position } = cmd;
    const effectivePos = position || this.cursor;
    if (position) this.cursor = position;
    this._saveState();

    const { x, y } = this._toPixel(effectivePos);
    const ctx = this.ctx;
    const style = this._getStyleConfig();

    ctx.save();

    // 应用风格滤镜
    if (style.grayScale) {
      ctx.filter = 'grayscale(100%)';
    } else if (style.brightColor) {
      ctx.filter = 'saturate(130%)';
    } else if (style.mutedColor) {
      ctx.filter = 'saturate(60%)';
    }

    // 阴影
    if (style.shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = style.shadowBlur;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
    }

    switch (scene) {
      case 'sun':    this._drawSun(x, y, color); break;
      case 'house':  this._drawHouse(x, y, color); break;
      case 'tree':   this._drawTree(x, y, color); break;
      case 'face':   this._drawFace(x, y); break;
      case 'cloud':  this._drawCloud(x, y, color); break;
      case 'flower': this._drawFlower(x, y, color); break;
      case 'mountain': this._drawMountain(x, y, color); break;
      case 'rainbow':  this._drawRainbow(x, y); break;
      case 'car':    this._drawCar(x, y, color); break;
    }

    // 素描排线
    if (style.hatching) {
      this._drawHatching(ctx, x, y, 120);
    }

    ctx.restore();
  }

  // ====== AI 绘画：语音驱动，任意内容 ======
  /**
   * 根据语音描述，调用 AI 绘画 API 生成图像并绘制到画布
   * 风格由语音内容自然决定——说"油画"就是油画，说"水墨"就是水墨，说"3D渲染"也行
   *
   * @param {string} prompt - 语音原文，如 "画一只橘猫"、"油画风格的向日葵"、"赛博朋克夜景"
   * @param {object} options - { position, size }
   * @returns {Promise<{x,y,w,h,prompt}>}
   */
  async drawAI(prompt, options = {}) {
    const cfg = CONFIG.AI_DRAW;
    if (!cfg.enabled || !cfg.apiKey) {
      console.warn('⚠️ AI 绘画未配置。请在 js/config.js → AI_DRAW 中填入 apiKey');
      console.warn('💡 支持 OpenAI DALL-E / 通义万相 / 文心一格 等兼容接口');
      return null;
    }

    this._saveState();

    try {
      console.log('🎨 AI 绘画:', prompt);
      const imageDataUrl = await this._callImageAPI(prompt, cfg, options);
      const img = await this._loadImage(imageDataUrl);

      // 按比例缩放到画布
      const pos = options.position || this.cursor;
      const maxPx = options.size || Math.min(this.canvas.width, this.canvas.height) * 0.55;
      const scale = Math.min(maxPx / img.width, maxPx / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const px = this._toPixel(pos);

      this.ctx.drawImage(img, px.x - w / 2, px.y - h / 2, w, h);

      console.log('✅ 绘制完成:', `${Math.round(w)}x${Math.round(h)}px`);
      return { x: px.x, y: px.y, w, h, prompt };
    } catch (e) {
      console.error('❌ AI 绘画失败:', e.message);
      throw e;
    }
  }

  /**
   * 调用 AI 图片生成 API
   * 支持返回 b64_json 或 url 两种格式
   */
  async _callImageAPI(prompt, cfg, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.timeout);

    let response;
    try {
      response = await fetch(cfg.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          prompt: prompt,
          n: 1,
          size: options.apiSize || cfg.imageSize,
          response_format: 'b64_json',
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    // 方式1: base64 直接返回
    if (data.data?.[0]?.b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    // 方式2: URL 返回，再 fetch 一次
    if (data.data?.[0]?.url) {
      const imgResp = await fetch(data.data[0].url);
      const blob = await imgResp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    throw new Error('API 返回格式不匹配，期望 b64_json 或 url');
  }

  /**
   * 从 data URL 加载 Image 对象
   */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = src;
    });
  }

  // ===== 基础形状实现 =====
  _drawCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawEllipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawRect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.roundRect(x - w/2, y - h/2, w, h, 4);
    ctx.fill();
    ctx.stroke();
  }

  _drawTriangle(ctx, x, y, size) {
    const h = size * 0.866;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.67);
    ctx.lineTo(x - size/2, y + h * 0.33);
    ctx.lineTo(x + size/2, y + h * 0.33);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawStar(ctx, x, y, outerR, points, innerR) {
    innerR = innerR || outerR * 0.4;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
      else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawDiamond(ctx, x, y, size) {
    const half = size / 2;
    ctx.beginPath();
    ctx.moveTo(x, y - half);
    ctx.lineTo(x + half * 0.6, y);
    ctx.lineTo(x, y + half);
    ctx.lineTo(x - half * 0.6, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawHeart(ctx, x, y, size) {
    ctx.beginPath();
    const s = size;
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y - s * 0.1, x - s, y - s * 0.1, x - s, y - s * 0.5);
    ctx.bezierCurveTo(x - s, y - s * 1.0, x, y - s * 0.9, x, y - s * 0.5);
    ctx.bezierCurveTo(x, y - s * 0.9, x + s, y - s * 1.0, x + s, y - s * 0.5);
    ctx.bezierCurveTo(x + s, y - s * 0.1, x, y - s * 0.1, x, y + s * 0.3);
    ctx.fill();
    ctx.stroke();
  }

  _drawLine(ctx, x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, size / 10);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
    ctx.stroke();
  }

  _drawArrow(ctx, x, y, size, color) {
    const len = size;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - len/2, y);
    ctx.lineTo(x + len/4, y);
    ctx.stroke();
    // 箭头头部
    ctx.beginPath();
    ctx.moveTo(x + len/2, y);
    ctx.lineTo(x + len/4, y - len/5);
    ctx.lineTo(x + len/4, y + len/5);
    ctx.closePath();
    ctx.fill();
  }

  // ===== 场景绘制实现 =====
  _drawSun(x, y, color) {
    const ctx = this.ctx;
    const c = color || '#f1c40f';
    const r = 40;
    const rays = 12;

    ctx.save();
    // 光芒
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (r + 8), y + Math.sin(angle) * (r + 8));
      ctx.lineTo(x + Math.cos(angle) * (r + 20), y + Math.sin(angle) * (r + 20));
      ctx.stroke();
    }
    // 太阳圆体
    ctx.fillStyle = c;
    ctx.strokeStyle = this._darken(c, 0.2);
    ctx.lineWidth = 2;
    ctx._addShadow && ctx._addShadow(ctx, c);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 笑脸
    ctx.fillStyle = this._darken(c, 0.4);
    ctx.strokeStyle = this._darken(c, 0.4);
    ctx.lineWidth = 2;
    // 眼睛
    ctx.beginPath(); ctx.arc(x - 12, y - 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 12, y - 10, 4, 0, Math.PI * 2); ctx.fill();
    // 嘴巴
    ctx.beginPath();
    ctx.arc(x, y + 2, 14, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  _drawHouse(x, y, color) {
    const ctx = this.ctx;
    const w = 80, h = 60;
    ctx.save();
    // 墙体
    ctx.fillStyle = color || '#e67e22';
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - w/2, y - h/2 + 20, w, h, 2);
    ctx.fill(); ctx.stroke();
    // 门
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.roundRect(x - 12, y + h/2 - 30, 24, 30, 2);
    ctx.fill();
    // 窗户
    ctx.fillStyle = '#74b9ff';
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 1.5;
    [-28, 28].forEach(dx => {
      ctx.beginPath();
      ctx.rect(x + dx - 10, y - 20, 20, 18);
      ctx.fill(); ctx.stroke();
      // 窗格
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 20); ctx.lineTo(x + dx, y - 2);
      ctx.moveTo(x + dx - 10, y - 11); ctx.lineTo(x + dx + 10, y - 11);
      ctx.stroke();
    });
    // 屋顶（三角形）
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#922b21';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - h/2 - 30);
    ctx.lineTo(x - w/2 - 8, y - h/2 + 22);
    ctx.lineTo(x + w/2 + 8, y - h/2 + 22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawTree(x, y, color) {
    const ctx = this.ctx;
    ctx.save();
    // 树干
    ctx.fillStyle = '#6d4c41';
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 8, y + 10, 16, 45, 2);
    ctx.fill(); ctx.stroke();
    // 树冠（三层三角形）
    const c = color || '#27ae60';
    const darkerC = this._darken(c, 0.15);
    [[0, 0, 55], [-8, 18, 50], [-16, 34, 45]].forEach(([dy, oy, size]) => {
      ctx.fillStyle = dy === 0 ? c : darkerC;
      ctx.strokeStyle = this._darken(c, 0.3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 50 + dy - oy);
      ctx.lineTo(x - size/2, y + dy);
      ctx.lineTo(x + size/2, y + dy);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }

  _drawFace(x, y) {
    const ctx = this.ctx;
    const r = 45;
    ctx.save();
    // 脸
    ctx.fillStyle = '#fdcb6e';
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2;
    this._addShadow(ctx, '#fdcb6e');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.shadowColor = 'transparent';
    // 眼睛
    ctx.fillStyle = '#2d3436';
    [[x - 16, y - 12], [x + 16, y - 12]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 2, ey - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d3436';
    });
    // 嘴巴
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + 5, 18, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    // 腮红
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    [x - 28, x + 28].forEach(cx => {
      ctx.beginPath();
      ctx.ellipse(cx, y + 18, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  _drawCloud(x, y, color) {
    const ctx = this.ctx;
    const c = color || '#ecf0f1';
    ctx.save();
    ctx.fillStyle = c;
    ctx.strokeStyle = this._darken(c, 0.1);
    ctx.lineWidth = 2;
    this._addShadow(ctx, c);
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 8, 22, 0, Math.PI * 2);
    ctx.arc(x - 28, y + 10, 20, 0, Math.PI * 2);
    ctx.arc(x + 8, y + 20, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFlower(x, y, color) {
    const ctx = this.ctx;
    const c = color || '#e74c3c';
    ctx.save();
    // 茎
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + 20);
    ctx.quadraticCurveTo(x + 10, y + 45, x, y + 55);
    ctx.stroke();
    // 叶子
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 38, 12, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // 花瓣
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(angle) * 18, y + Math.sin(angle) * 18,
        12, 8, angle, 0, Math.PI * 2
      );
      ctx.fill();
    }
    // 花心
    ctx.fillStyle = '#f1c40f';
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawMountain(x, y, color) {
    const ctx = this.ctx;
    ctx.save();
    // 远山
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.moveTo(x + 40, y + 50);
    ctx.lineTo(x + 110, y - 30);
    ctx.lineTo(x + 180, y + 50);
    ctx.closePath(); ctx.fill();
    // 近山
    const c = color || '#2c3e50';
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - 60, y + 50);
    ctx.lineTo(x, y - 60);
    ctx.lineTo(x + 60, y + 50);
    ctx.closePath(); ctx.fill();
    // 雪顶
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(x, y - 60);
    ctx.lineTo(x - 20, y - 30);
    ctx.lineTo(x + 20, y - 30);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _drawRainbow(x, y) {
    const ctx = this.ctx;
    const colors = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6'];
    ctx.save();
    colors.forEach((c, i) => {
      const r = 80 - i * 10;
      ctx.strokeStyle = c;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(x, y + 20, r, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
  }

  _drawCar(x, y, color) {
    const ctx = this.ctx;
    const c = color || '#3498db';
    ctx.save();
    // 车身
    ctx.fillStyle = c;
    ctx.strokeStyle = this._darken(c, 0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 55, y + 5, 110, 35, 6);
    ctx.fill(); ctx.stroke();
    // 车顶
    ctx.fillStyle = this._lighten(c, 0.2);
    ctx.beginPath();
    ctx.roundRect(x - 35, y - 20, 70, 28, 8);
    ctx.fill(); ctx.stroke();
    // 车窗
    ctx.fillStyle = 'rgba(116, 185, 255, 0.7)';
    [[-28, 14], [2, 14]].forEach(([dx, w]) => {
      ctx.beginPath();
      ctx.roundRect(x + dx - 2, y - 15, w, 20, 3);
      ctx.fill();
    });
    // 车轮
    [x - 30, x + 30].forEach(wx => {
      ctx.fillStyle = '#2d3436';
      ctx.beginPath(); ctx.arc(wx, y + 40, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b2bec3';
      ctx.beginPath(); ctx.arc(wx, y + 40, 7, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  // ===== 辅助工具 =====
  _addShadow(ctx, color) {
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
  }

  _darken(hex, amount) {
    const col = this._hexToRgb(hex);
    if (!col) return hex;
    return `rgb(${Math.max(0, col.r - 255*amount)}, ${Math.max(0, col.g - 255*amount)}, ${Math.max(0, col.b - 255*amount)})`;
  }

  _lighten(hex, amount) {
    const col = this._hexToRgb(hex);
    if (!col) return hex;
    return `rgb(${Math.min(255, col.r + 255*amount)}, ${Math.min(255, col.g + 255*amount)}, ${Math.min(255, col.b + 255*amount)})`;
  }

  _hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  // ====== 绘画风格系统 ======
  setStyle(styleName) {
    if (CONFIG.STYLES[styleName]) {
      this.brush.style = styleName;
    }
  }

  _getStyleConfig() {
    return CONFIG.STYLES[this.brush.style] || CONFIG.STYLES.default;
  }

  _applyBrushStyle(ctx, color) {
    const style = this._getStyleConfig();
    let fillColor = color;
    let strokeColor = style.strokeColor || this._darken(color, 0.3);

    // 素描：转灰度
    if (style.grayScale) {
      fillColor = this._toGrayScale(color);
      strokeColor = this._toGrayScale(strokeColor);
    }
    // 水墨：降低饱和度
    if (style.mutedColor) {
      fillColor = this._muteColor(fillColor, 0.55);
      strokeColor = this._muteColor(strokeColor, 0.35);
    }
    // 动漫：提高饱和度
    if (style.brightColor) {
      fillColor = this._saturateColor(fillColor, 0.35);
    }

    // 基础属性
    ctx.globalAlpha = style.fillOpacity;
    ctx.lineWidth = style.strokeWidth;
    ctx.lineCap = style.lineCap || 'round';
    ctx.lineJoin = style.lineJoin || 'round';

    // 阴影：水墨用大阴影模拟墨染，动漫/素描无阴影
    if (style.shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = style.shadowBlur;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    return { fillColor, strokeColor, style };
  }

  // 转灰度
  _toGrayScale(hex) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return hex;
    const g = Math.round(rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114);
    return `rgb(${g},${g},${g})`;
  }

  // 降低饱和度（向灰度靠拢）
  _muteColor(hex, amount) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return hex;
    const gray = Math.round(rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114);
    return `rgb(${Math.round(rgb.r + (gray - rgb.r) * amount)},${Math.round(rgb.g + (gray - rgb.g) * amount)},${Math.round(rgb.b + (gray - rgb.b) * amount)})`;
  }

  // 提高饱和度
  _saturateColor(hex, amount) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return hex;
    const avg = (rgb.r + rgb.g + rgb.b) / 3;
    return `rgb(${Math.min(255, Math.round(rgb.r + (rgb.r - avg) * amount))},${Math.min(255, Math.round(rgb.g + (rgb.g - avg) * amount))},${Math.min(255, Math.round(rgb.b + (rgb.b - avg) * amount))})`;
  }

  // 创建水墨渐变（径向，中心浓边缘淡）
  _createInkGradient(ctx, x, y, r, color) {
    const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, 'rgba(255,255,255,0.1)');
    return grad;
  }

  // 素描排线
  _drawHatching(ctx, x, y, size) {
    const s = size * 0.6;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    for (let a = -1; a <= 1; a += 2) {
      const angle = (Math.PI / 3.5) * a;
      const spacing = 4;
      const perpX = Math.cos(angle + Math.PI / 2);
      const perpY = Math.sin(angle + Math.PI / 2);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      for (let d = -s; d <= s; d += spacing) {
        ctx.beginPath();
        ctx.moveTo(x + perpX * d + dirX * s, y + perpY * d + dirY * s);
        ctx.lineTo(x + perpX * d - dirX * s, y + perpY * d - dirY * s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  getBrushState() {
    return { ...this.brush };
  }

  getCursor() {
    return { ...this.cursor };
  }
}
