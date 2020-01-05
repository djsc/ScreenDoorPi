import log4js from 'log4js';
import { ENABLE_FILE_LOGGING, LOG_LEVEL, LOG_FILE } from './constants';

log4js.configure({
    appenders: {
        app: { type: 'file', filename: LOG_FILE, maxLogSize: 10000000 },
        console: { type: 'stdout' }
    },
    categories: { default: { appenders: ['app', 'console'], level: LOG_LEVEL } }
});

export const shutdownLogger = () => {
    return new Promise((resolve, reject) => {
        logger.debug('Shutting down logger');
        log4js.shutdown((error: Error) => {
            error ? reject(error) : resolve();
        });
    });
};

const logger = ENABLE_FILE_LOGGING === true ? log4js.getLogger('default') : log4js.getLogger();
logger.level = LOG_LEVEL;
export default logger;
