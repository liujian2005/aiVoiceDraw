/**
 * VoiceDraw - 颜色映射表
 * 支持中文颜色名称 → CSS颜色值
 */
const COLOR_MAP = {
  // 基础色
  '红':   '#e74c3c', '红色': '#e74c3c', '大红': '#c0392b', '朱红': '#e84118',
  '橙':   '#e67e22', '橙色': '#e67e22', '橘色': '#f39c12', '橘':  '#f39c12',
  '黄':   '#f1c40f', '黄色': '#f1c40f', '金黄': '#ffd32a', '柠黄': '#fff200',
  '绿':   '#2ecc71', '绿色': '#2ecc71', '深绿': '#27ae60', '浅绿': '#55efc4',
    '草绿': '#78e08f',
  '蓝':   '#3498db', '蓝色': '#3498db', '深蓝': '#2980b9', '浅蓝': '#74b9ff',
    '天蓝': '#00cec9', '海蓝': '#0652dd',
  '紫':   '#9b59b6', '紫色': '#9b59b6', '深紫': '#8e44ad', '浅紫': '#a29bfe',
    '薰衣草': '#d7b3ff',
  '粉':   '#fd79a8', '粉色': '#fd79a8', '粉红': '#e84393', '浅粉': '#fab1d3',
    '玫瑰': '#d63031',
  '黑':   '#2d3436', '黑色': '#2d3436', '深黑': '#000000', '纯黑': '#000000',
  '白':   '#ffffff', '白色': '#ffffff',
  '灰':   '#95a5a6', '灰色': '#95a5a6', '深灰': '#636e72', '浅灰': '#dfe6e9',
  '棕':   '#6d4c41', '棕色': '#6d4c41', '褐色': '#795548', '咖啡': '#a07850',
    '棕褐': '#8d6e63',
  '青':   '#00b894', '青色': '#00b894', '青绿': '#55efc4', '青蓝': '#00cec9',
  '金':   '#fdcb6e', '金色': '#fdcb6e', '土黄': '#e1b12c',
  '银':   '#b2bec3', '银色': '#b2bec3',
};

/**
 * 解析文本中的颜色名称
 * @param {string} text
 * @returns {{ colorName: string, colorValue: string } | null}
 */
function parseColor(text) {
  // 按长度降序匹配，确保"深蓝"优先于"蓝"
  const keys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (text.includes(key)) {
      return { colorName: key, colorValue: COLOR_MAP[key] };
    }
  }
  return null;
}

/**
 * 根据颜色值获取颜色名称
 */
function getColorName(hex) {
  for (const [name, val] of Object.entries(COLOR_MAP)) {
    if (val === hex) return name;
  }
  return hex;
}
