/**
 * VoiceDraw - 语音识别引擎（唤醒词模式）
 * 持续监听，"你好"唤醒，"停下"休眠
 */
class VoiceEngine {
  constructor(callbacks) {
    this.recognition = null;
    this.state = 'sleep';       // 'sleep' | 'active'
    this._supported = false;
    this._restartTimer = null;

    this.cb = {
      onWake:    callbacks.onWake    || (() => {}),
      onSleep:   callbacks.onSleep   || (() => {}),
      onCommand: callbacks.onCommand || (() => {}),
      onInterim: callbacks.onInterim || (() => {}),
      onStatus:  callbacks.onStatus  || (() => {}),
      onError:   callbacks.onError   || (() => {}),
    };

    this._init();
  }

  _init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.cb.onError('浏览器不支持语音识别，请用 Chrome/Edge');
      return;
    }

    this._supported = true;
    this.recognition = new SR();
    this.recognition.lang = CONFIG.SPEECH.lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = CONFIG.SPEECH.maxAlternatives;

    this.recognition.onstart = () => {
      this.cb.onStatus(this.state);
    };

    this.recognition.onend = () => {
      // 自动重连
      if (this._supported) {
        this._restartTimer = setTimeout(() => this.start(), CONFIG.SPEECH.restartDelay);
      }
    };

    this.recognition.onerror = (event) => {
      const errMap = {
        'no-speech':       null,  // 静音忽略
        'audio-capture':   '麦克风无法访问，请检查浏览器权限',
        'not-allowed':     '麦克风权限被拒绝，请在浏览器设置中允许',
        'network':         '网络错误，语音识别需要联网',
        'aborted':         null,  // 内部中断忽略
        'service-not-allowed': '语音服务不可用',
      };
      const msg = errMap[event.error];
      if (msg) this.cb.onError(msg);
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // 选置信度最高的候选项
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

      // 处理最终结果
      if (finalText) {
        const text = finalText.trim();
        if (this.state === 'sleep') {
          this._tryWake(text);
        } else {
          this._tryStop(text);
        }
      }

      // 中间结果（仅在 active 状态显示）
      if (this.state === 'active' && interim) {
        this.cb.onInterim(interim);
      }
    };

    // 启动
    setTimeout(() => this.start(), 500);
  }

  /** 尝试从文本中检测唤醒词 */
  _tryWake(text) {
    const hit = CONFIG.WAKE_WORDS.find(w => text.includes(w));
    if (hit) {
      this.state = 'active';
      this.cb.onWake(hit, text);
    }
  }

  /** 尝试从文本中检测停止词，否则当指令处理 */
  _tryStop(text) {
    const hit = CONFIG.STOP_WORDS.find(w => text.includes(w));
    if (hit) {
      this.state = 'sleep';
      this.cb.onSleep(hit, text);
    } else {
      this.cb.onCommand(text);
    }
  }

  isSupported() { return this._supported; }

  getState() { return this.state; }

  start() {
    if (!this._supported) return;
    try {
      this.recognition.start();
    } catch (e) {
      // 已在运行则忽略
    }
  }

  stop() {
    if (!this._supported) return;
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  /** 强制进入 active 状态（供外部调用） */
  forceWake() {
    this.state = 'active';
    this.cb.onWake('手动', '');
  }

  /** 强制进入 sleep 状态 */
  forceSleep() {
    this.state = 'sleep';
    this.cb.onSleep('手动', '');
  }
}
