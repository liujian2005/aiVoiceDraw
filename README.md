# VoiceDraw 🎙️

> 纯语音控制的绘图创作工具 — 不需要鼠标，不需要键盘，只需要你的声音。

---

## 项目简介

VoiceDraw 是一款基于 Web 技术实现的语音绘图工具。
用户通过语音指令完成全部绘图操作，包括：形状绘制、颜色控制、位置调整、撤销保存等。

**核心技术栈**
- HTML5 Canvas — 图形渲染
- Web Speech API — 语音识别
- Vanilla JavaScript — 逻辑实现（无框架依赖）

---

## 当前进度

- [x] 项目骨架与 UI 布局
- [ ] 语音识别引擎
- [ ] 指令解析引擎
- [ ] 基础形状绘制
- [ ] 复合场景绘制
- [ ] 位置 / 大小 / 颜色控制
- [ ] 撤销 / 重做 / 保存

---

## 快速运行

```bash
# 克隆仓库
git clone https://github.com/your-username/voicedraw.git
cd voicedraw

# 启动本地服务器（需要 Node.js）
node server.js

# 用 Chrome 或 Edge 打开
# http://localhost:8765
```

> ⚠️ 语音识别依赖 HTTPS 或 localhost，请勿直接双击 HTML 文件打开。

---

## 许可证

MIT License © 2026
