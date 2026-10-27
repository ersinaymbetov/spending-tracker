const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const files = [
  'index.html',
  'style.css',
  'app.js',
  'chart.umd.min.js'
];

files.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> dist/${file}`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

console.log('Build complete! Assets ready in dist/');
