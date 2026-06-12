const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = 'd:/ai语音绘图';
const MIME = { html: 'text/html', css: 'text/css', js: 'application/javascript', png: 'image/png', md: 'text/plain' };

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(8765, () => console.log('VoiceDraw server running at http://localhost:8765'));
