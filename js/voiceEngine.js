/**
 * VoiceDraw - 语音识别引擎
 * 基于 Web Speech API，封装连续识别、错误恢复、状态管理
 */
class VoiceEngine {
  constructor(callbacks) {
    this.recognition = null;
    this.isListening = false;
    this.isHoldMode = false;   // 按住说话模式
    this.callbacks = {
      onInterim: callbacks.onInterim || (() => {}),
      onFinal:   callbacks.onFinal   || (() => {}),
      onStart:   callbacks.onStart   || (() => {}),
      onStop:    callbacks.onStop    || (() => {}),
      onError:   callbacks.onError   || (() => {}),
    };
    this._supported = false;
    this._init();
  }

  _init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[VoiceEngine] 当前浏览器不支持 Web Speech API');
      this.callbacks.onError('浏览器不支持语音识别，请使用 Chrome/Edge');
      return;
    }

    this._supported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = CONFIG.SPEECH.lang;
    this.recognition.continuous = CONFIG.SPEECH.continuous;
    this.recognition.interimResults = CONFIG.SPEECH.interimResults;
    this.recognition.maxAlternatives = CONFIG.SPEECH.maxAlternatives;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onStop();
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      const errMap = {
        'no-speech':       '未检测到语音，请再试一次',
        'audio-capture':   '麦克风无法访问，请检查权限',
        'not-allowed':     '麦克风权限被拒绝，请在浏览器设置中允许',
        'network':         '网络错误，语音识别需要联网',
        'aborted':         '识别已停止',
        'service-not-allowed': '服务不可用，请检查网络',
      };
      const msg = errMap[event.error] || `识别错误: ${event.error}`;
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        this.callbacks.onError(msg);
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // 选取置信度最高的候选
        let best = result[0].transcript;
        let bestConf = result[0].confidence;
        for (let j = 1; j < result.length; j++) {
          if (result[j].confidence > bestConf) {
            best = result[j].transcript;
            bestConf = result[j].confidence;
          }
        }

        if (result.isFinal) {
          finalTranscript += best;
        } else {
          interimTranscript += best;
        }
      }

      if (interimTranscript) {
        this.callbacks.onInterim(interimTranscript);
      }
      if (finalTranscript) {
        this.callbacks.onFinal(finalTranscript.trim());
      }
    };
  }

  isSupported() { return this._supported; }

  startListening() {
    if (!this._supported) return;
    if (this.isListening) this.stopListening();
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('[VoiceEngine] start failed:', e);
    }
  }

  stopListening() {
    if (!this._supported || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  // 按住说话模式
  pressStart() {
    this.isHoldMode = true;
    this.startListening();
  }

  pressEnd() {
    this.isHoldMode = false;
    // 延迟停止，给时间处理最后的语音
    setTimeout(() => this.stopListening(), 200);
  }

  // 切换模式（单次 vs 连续）
  setMode(continuous) {
    if (this.recognition) {
      const wasListening = this.isListening;
      if (wasListening) this.stopListening();
      this.recognition.continuous = continuous;
      if (wasListening) setTimeout(() => this.startListening(), 300);
    }
  }
}
