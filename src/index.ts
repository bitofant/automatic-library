import path from 'path';
import express from 'express';
import fs from 'fs';
import { Library } from './library/library.js';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 3000;
const app = express();

const DEV_MODE = !process.argv.pop()?.endsWith('.js');
const VERSION_TAG = DEV_MODE ? Date.now().toString() : 'prod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libPaths = [
  '/home/joran/src/stable-diffusion-webui/outputs/txt2img-images',
  '/Users/jtesse/src/_mine/stable-diffusion-webui/outputs/txt2img-images'
];
const libPath = libPaths.find(p => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}) || '';
const libs = new Library(libPath);

const staticDir = path.join(__dirname, DEV_MODE ? '../src/static' : 'static');
app.use(express.static(staticDir));

app.use('/', (req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});
app.get('/version-tag', (req, res) => {
  if (req.query.longpoll) {
    setTimeout(() => {
      res.send(VERSION_TAG);
    }, 10000);
  } else {
    res.send(VERSION_TAG);
  }
});

app.use('/libs', libs.getRouter());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
