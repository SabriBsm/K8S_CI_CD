const app = require('./app');
const { port } = require('./config/env');
const logger = require('./utils/logger');

app.listen(port, () => {
  console.log(`Gemini AI running on port ${port}`);
  logger.info(`Gemini API server listening on port ${port}`);
});
