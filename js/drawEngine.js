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
    ctx.fillStyle = effectiveColor;
    ctx.strokeStyle = this._darken(effectiveColor, 0.2);
    ctx.lineWidth = 2;
    ctx.globalAlpha = this.brush.opacity;

    this._addShadow(ctx, effectiveColor);

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

    ctx.restore();
    return { x, y, size: effectiveSize, color: effectiveColor };
  }

  drawScene(cmd) {
    const { scene, color, position } = cmd;
    const effectivePos = position || this.cursor;
    if (position) this.cursor = position;
    this._saveState();

    const { x, y } = this._toPixel(effectivePos);

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

  getBrushState() {
    return { ...this.brush };
  }

  getCursor() {
    return { ...this.cursor };
  }
}
