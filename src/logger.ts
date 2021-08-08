import log4js from 'log4js';
import { ENABLE_FILE_LOGGING, LOG_LEVEL } from './constants';
import dotenv from 'dotenv'

// loading the variables from the .env file asap
dotenv.config();

const logFileLocation = process.env.LOG_FILE_LOCATION;

log4js.configure({
    appenders: {
        app: { type: 'file', filename: logFileLocation, maxLogSize: 10000000 },
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
