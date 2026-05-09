function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  console[level](`[${timestamp()}] ${message}${payload}`);
}

module.exports = {
  info(message, meta) {
    log('info', message, meta);
  },
  warn(message, meta) {
    log('warn', message, meta);
  },
  error(message, meta) {
    log('error', message, meta);
  }
};
