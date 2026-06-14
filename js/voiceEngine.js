/**
 * VoiceDraw - 语音识别引擎（唤醒词模式）
 * 持续监听，"你好"唤醒，"停下"休眠
 * 修复点：Chrome 静默死亡时完全重建 recognition 对象
 */
class VoiceEngine {
  constructor(callbacks) {
    this.recognition = null;
    this.state = 'sleep';       // 'sleep' | 'active'
    this._supported = false;
    this._restartTimer = null;
    this._cmdBuffer = '';        // 跨重连累积的命令文本
    this._silenceTimer = null;   // 静音超时后提交完整命令
    this._busy = false;          // 命令执行中，忽略新语音输入
    this._alive = false;         // 心跳标记：onstart=true, onend=false
    this._heartbeatTimer = null; // 心跳定时器
    this._buildCount = 0;       // 重建次数（防止无限重建）
    this._lastResultTime = 0;   // 上次 onresult 触发时间戳（用于检测静默死）
    this._builtAt = 0;          // 引擎构建时间戳（心跳用：启动后长期无结果判定死）
    this._everGotResult = false; // 是否有任何一次 onresult 触发过（跨重建保持）

    this.cb = {
      onWake:    callbacks.onWake    || (() => {}),
      onSleep:   callbacks.onSleep   || (() => {}),
      onCommand: callbacks.onCommand || (() => {}),
      onInterim: callbacks.onInterim || (() => {}),
      onStatus:  callbacks.onStatus  || (() => {}),
      onError:   callbacks.onError   || (() => {}),
    };

    // 启动心跳（只建一次）
    this._heartbeatTimer = setInterval(() => this._heartbeat(), 8000);
    // 构建 recognition 并启动
    this._build();
  }

  /** 构建/重建 recognition 对象 */
  _build() {
    this._buildCount++;
    this._builtAt = Date.now();       // 记录构建时间
    this._lastResultTime = Date.now(); // 重置为现在，避免心跳误判"从未收到结果"
    if (this._buildCount > 50) {
      console.error('[Voice] 重建次数过多，停止自动恢复');
      this.cb.onError('语音引擎反复崩溃，请刷新页面');
      return;
    }

    // 销毁旧的
    this._destroy();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.cb.onError('浏览器不支持语音识别，请用 Chrome/Edge');
      return;
    }

    this._supported = true;
    const rec = new SR();
    rec.lang = CONFIG.SPEECH.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = CONFIG.SPEECH.maxAlternatives;

    rec.onstart = () => {
      this._alive = true;
      console.log('[Voice] 识别已启动 (#' + this._buildCount + '), 状态:', this.state);
      this.cb.onStatus(this.state);
    };

    rec.onend = () => {
      this._alive = false;
      console.log('[Voice] 识别断开 (#' + this._buildCount + '), 状态:', this.state, '→ 200ms 后重连');
      if (this._supported && !this._busy) {
        clearTimeout(this._restartTimer);
        this._restartTimer = setTimeout(() => this._build(), CONFIG.SPEECH.restartDelay);
      }
    };

    rec.onerror = (event) => {
      const errMap = {
        'no-speech':       null,
        'audio-capture':   '麦克风无法访问，请检查浏览器权限',
        'not-allowed':     '麦克风权限被拒绝，请在浏览器设置中允许',
        'network':         '网络错误，语音识别需要联网',
        'aborted':         null,
        'service-not-allowed': '语音服务不可用',
      };
      const msg = errMap[event.error];
      console.log('[Voice] onerror (#' + this._buildCount + '):', event.error, msg ? '→ 提示用户' : '→ 忽略');
      if (msg) this.cb.onError(msg);
      // network / service-not-allowed → 立即重建
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        console.warn('[Voice] 严重错误，800ms 后重建 recognition');
        setTimeout(() => this._build(), 800);
      }
    };

    rec.onresult = (event) => {
      this._lastResultTime = Date.now();  // 记录最后活动时间
      this._everGotResult = true;        // 标记：至少有一次结果
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        let best = result[0].transcript;
        let bestConf = result[0].confidence;
        for (let j = 1; j < result.length; j++) {
          if (result[j].confidence > bestConf) {
            best = result[j].transcript;
            bestConf = result[j].confidence;
          }
        }
        if (result.isFinal) {
          finalText += best;
        } else {
          interim += best;
        }
      }

      if (finalText) {
        const text = finalText.trim();
        if (this._busy) {
          console.log('[Voice] 忙碌中忽略:', text);
        } else if (this.state === 'sleep') {
          this._tryWake(text);
        } else {
          this._tryStop(text);
        }
      }

      if (this.state === 'active') {
        const display = this._cmdBuffer
          ? this._cmdBuffer + (interim ? ' ' + interim : '') + ' ...'
          : interim;
        if (display) this.cb.onInterim(display);
      }
    };

    this.recognition = rec;

    // 延迟启动（让页面先稳定）
    setTimeout(() => this.start(), 500);
    console.log('[Voice] 重建 #' + this._buildCount + '，500ms 后启动');
  }

  /** 销毁当前 recognition */
  _destroy() {
    if (this.recognition) {
      try { this.recognition.onstart = null; } catch(e){}
      try { this.recognition.onend = null; } catch(e){}
      try { this.recognition.onerror = null; } catch(e){}
      try { this.recognition.onresult = null; } catch(e){}
      try { this.recognition.stop(); } catch(e){}
      this.recognition = null;
    }
    this._alive = false;
    clearTimeout(this._restartTimer);
  }

  /** 心跳：检测引擎死亡 + 静默死（onresult 长期不触发） */
  _heartbeat() {
    if (!this._supported || this._busy) return;

    let isDead = !this._alive;

    // 二次确认：_alive 可能是旧值，直接探一下对象
    if (!isDead && this.recognition) {
      try {
        const _ = this.recognition.continuous;
      } catch (e) {
        isDead = true;
        console.warn('[Voice] 心跳：recognition 对象已损坏');
      }
    }

    // 静默死：引擎活着但超过 25s 没收到任何语音结果 → 重建
    if (!isDead && this._alive) {
      const aliveSec = (Date.now() - this._builtAt) / 1000;
      if (this._lastResultTime > 0) {
        const silentSec = (Date.now() - this._lastResultTime) / 1000;
        if (silentSec > 25) {
          isDead = true;
          console.warn('[Voice] 心跳：静默死（' + Math.round(silentSec) + 's 无语音结果），重建');
        }
      } else if (!this._everGotResult && aliveSec > 20) {
        // 引擎启动后从未触发过 onresult（国内环境常见）→ 死
        isDead = true;
        console.warn('[Voice] 心跳：启动 ' + Math.round(aliveSec) + 's 从未收到语音结果，重建');
      }
    }

    if (isDead) {
      console.warn('[Voice] 💀 心跳检测引擎死亡，立即重建 (#' + (this._buildCount + 1) + ')');
      this._build();
    }
  }

  /** 尝试从文本中检测唤醒词 */
  _tryWake(text) {
    const hit = CONFIG.WAKE_WORDS.find(w => text.includes(w));
    if (hit) {
      console.log('[Voice] 唤醒词命中:', hit, '| 原文:', text);
      this._cmdBuffer = '';
      this._busy = false;
      this.state = 'active';
      this.cb.onWake(hit, text);
    } else {
      console.log('[Voice] 未匹配唤醒词:', text, '| 唤醒词列表:', CONFIG.WAKE_WORDS.join(','));
    }
  }

  /** 累积命令片段 — 操作指令即时触发，否则检测结束词提交 */
  _tryStop(text) {
    const stopHit = CONFIG.STOP_WORDS.find(w => text.includes(w));
    if (stopHit) {
      this._cmdBuffer = '';
      this.state = 'sleep';
      this.cb.onSleep(stopHit, text);
      return;
    }

    this._cmdBuffer += text;
    const fullText = this._cmdBuffer;

    const actionKw = {
      save:  ['保存','下载','保存图片','存一下','下载图片','导出','导出图片'],
      clear: ['清空','清除','清屏','重新开始','全部删掉','清空画布','删掉所有'],
      undo:  ['撤销','取消','退一步','撤回','回退','上一步','撤'],
    };
    let hitAction = null;
    for (const [action, keywords] of Object.entries(actionKw)) {
      if (keywords.some(kw => fullText.includes(kw))) { hitAction = action; break; }
    }

    if (hitAction) {
      this._cmdBuffer = '';
      this._busy = true;
      console.log('[Voice] 操作指令即时触发:', hitAction, '| 文本:', fullText.trim(), '→ 🔒 锁定');
      this.cb.onCommand(fullText.trim());
      return;
    }

    const endHit = CONFIG.COMMAND_END.find(w => fullText.includes(w));
    if (endHit) {
      const cmd = this._cmdBuffer.replace(endHit, '').trim();
      this._cmdBuffer = '';
      if (cmd) {
        this._busy = true;
        console.log('[Voice] 命令提交:', cmd, '→ 🔒 锁定');
        this.cb.onCommand(cmd);
      }
    } else {
      this.cb.onInterim(this._cmdBuffer + ' ...');
    }
  }

  isSupported() { return this._supported; }
  getState() { return this.state; }

  start() {
    if (!this._supported || !this.recognition) return;
    clearTimeout(this._restartTimer);
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('[Voice] start 异常 (#' + this._buildCount + '):', e.message, '→ 800ms 后重建');
      setTimeout(() => this._build(), 800);
    }
  }

  stop() {
    if (!this._supported || !this.recognition) return;
    try { this.recognition.stop(); } catch(e){}
  }

  /** 强制重建（供外部紧急调用） */
  forceRebuild() {
    console.warn('[Voice] 外部强制重建');
    this._build();
  }

  /** 强制进入 active 状态 */
  forceWake() {
    this._cmdBuffer = '';
    this.state = 'active';
    this.cb.onWake('手动', '');
  }

  /** 强制进入 sleep 状态 */
  forceSleep() {
    this._cmdBuffer = '';
    this._busy = false;
    this.state = 'sleep';
    this.cb.onSleep('手动', '');
  }

  /** 解锁 */
  unbusy() {
    this._busy = false;
    console.log('[Voice] 🔓 解锁，恢复接收指令');
  }

  isBusy() { return this._busy; }
}
