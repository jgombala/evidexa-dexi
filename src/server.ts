import { createServer } from './serverFactory.js';
import { config } from './config.js';

const app = createServer();

app.listen(config.port, () => {
  console.log(`Dexi API listening on :${config.port}`);
});
