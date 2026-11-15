const { app } = require('electron');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.local.unified-system');
}

require('./src/main/storage');
require('./src/main/excel');
require('./src/main/pdf');
require('./src/main/attachments');
require('./src/main/server');
require('./src/main/auth');
require('./src/main/updater');
require('./src/main/archive');

const { initAppLifecycle } = require('./src/main/window');
initAppLifecycle();
