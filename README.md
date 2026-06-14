# VoiceDraw 🎙️

> 纯语音控制的 AI 绘图创作工具 — 不需要鼠标，不需要键盘，只需要你的声音。

---

## ✨ 项目简介

VoiceDraw 是一款基于 Web 技术实现的**语音驱动 AI 绘图工具**。

用户通过语音指令完成全部操作：说"画一只猫"→ AI 自动选择画笔或 Seedream 出图 → 看到绘制过程动画。零按钮、零触控，全程语音交互。

**核心技术栈**
- **语音识别**：Web Speech API（Chrome/Edge）
- **AI 指令解析**：DeepSeek Chat API（LLM 自主判断绘图策略）
- **AI 图像生成**：Seedream 5.0 API（复杂场景出图）
- **图形渲染**：HTML5 Canvas 2D
- ** reveal 动画**：Sobel 边缘检测 → 线稿 → 铺色 → 细节 → 成稿

---

## 🎥 演示视频

👉 [B站观看 VoiceDraw 演示视频](https://www.bilibili.com/video/BV1LkJF6VENm/)

---

## 🎬 功能演示

```
用户说：画一只日漫风格的猫
  ↓
LLM 判断：复杂内容 → Seedream 出图
  ↓
Seedream 5.0 生成图片
  ↓
Reveal 动画播放（2.5秒）：线稿 → 铺色 → 细节 → 成稿
  ↓
完成！
```

```
用户说：画一个火柴人
  ↓
LLM 判断：简单内容 → 画笔指令
  ↓
Canvas 逐笔绘制火柴人
  ↓
完成！
```

---

## 📊 当前进度

- [x] 项目骨架与 UI 布局
- [x] 语音识别引擎（Web Speech API）
- [x] 唤醒词模式（说"你好"激活）
- [x] 指令解析引擎（DeepSeek LLM）
- [x] 基础形状绘制（Canvas 画笔）
- [x] 混合绘图模式（LLM 自主判断画笔/Seedream）
- [x] Seedream 5.0 文生图集成
- [x] Reveal 动画（线稿→铺色→细节→成稿）
- [x] 纯语音交互（零按钮）
- [x] 撤销 / 重做 / 保存
- [ ] 多轮对话上下文（规划中）
- [ ] 语音合成 TTS 反馈（规划中）

---

## 🚀 快速运行

```bash
# 克隆仓库
git clone https://github.com/liujian2005/aiVoiceDraw.git
cd aiVoiceDraw

# 启动本地服务器（需要 Node.js）
node server.js

# 用 Chrome 或 Edge 打开
# http://localhost:8765
```

> ⚠️ 语音识别依赖 HTTPS 或 localhost，请勿直接双击 HTML 文件打开。

---

## 🏗️ 项目结构

```
aiVoiceDraw/
├── index.html          # 主页面
├── style.css           # 样式
├── js/
│   ├── app.js          # 主控制器
│   ├── voiceEngine.js  # 语音识别引擎
│   ├── commandParser.js# 指令解析（LLM）
│   ├── drawEngine.js   # 绘图引擎（画笔+Seedream）
│   └── config.js       # API 配置
├── server.js           # 本地开发服务器（端口 8765）
└── README.md
```

---

## 🔧 技术架构

```
+------------------------------------------+
|  用户语音输入（Web Speech API）            |
+--> commandParser.js                       |
|   DeepSeek LLM 解析指令                   |
|   输出：{actions: [...]} 或 {mode:"image"}|
+--> 判断分支                               |
     |-- 简单内容 --> Canvas 画笔绘制        |
     |-- 复杂内容 --> Seedream 5.0 出图     |
                       +--> Reveal 动画      |
                       +--> 完成显示         |
+------------------------------------------+
```

---

## 📝 配置说明

`js/config.js` 中有两处 API 配置：

| 配置项 | 用途 | 默认值 |
|--------|------|--------|
| `AI.apiKey` | DeepSeek LLM（指令解析） | 需自行填写 |
| `AI_DRAW.apiKey` | Seedream 5.0（图像生成） | 需自行填写 |

> 💡 获取 API Key：
> - DeepSeek：https://platform.deepseek.com
> - Seedream：https://apiyi.com（apiyi 代理）

---

## 📖 使用说明

1. 打开页面后，说**"你好"**唤醒语音识别
2. 说出绘图指令，例如：
   - "画一只猫"
   - "画一个红色的圆"
   - "画一幅海边日落的风景画"
   - "画一个火柴人"
3. 等待 AI 处理（简单内容走画笔，复杂内容走 Seedream）
4. 查看绘制结果

---

## 📄 许可证

MIT License © 2026

---

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) — LLM 能力支持
- [Seedream 5.0](https://apiyi.com) — AI 图像生成
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — 语音识别
