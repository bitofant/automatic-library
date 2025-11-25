import path from 'path';
import express from 'express';
import { Library } from './library/library.js';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 8081;
const app = express();

const DEV_MODE = !process.argv.pop()?.endsWith('.js');
const VERSION_TAG = DEV_MODE ? Date.now().toString() : 'prod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libs = new Library('/home/joran/src/stable-diffusion-webui/outputs/txt2img-images');

app.use(express.static(path.join(__dirname, 'static')));

app.use('/', (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
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
