import log4js from 'log4js';
import { ENABLE_FILE_LOGGING, LOG_LEVEL } from './constants';
import dotenv from 'dotenv'
import path from 'path';

// loading the variables from the .env file asap. Path is necessary when running from rc.local
const envResult = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (envResult.error) {
    throw new Error('Could not load the .env file: ' + JSON.stringify(envResult.error));
}

const logFileLocation = process.env.LOG_FILE_LOCATION;

if (!logFileLocation) {
    throw new Error('No log file location was specified in the .env file');
}

try {
    log4js.configure({
        appenders: {
            app: { type: 'file', filename: logFileLocation, maxLogSize: 10000000 },
            console: { type: 'stdout' }
        },
        categories: { default: { appenders: ['app', 'console'], level: LOG_LEVEL } }
    });
} catch (e) {
    throw new Error('Could not configure log4js: ' + JSON.stringify(e));
}

export const shutdownLogger = () => {
    return new Promise<void>((resolve, reject) => {
        logger.debug('Shutting down logger');
        log4js.shutdown((error: Error) => {
            error ? reject(error) : resolve();
        });
    });
};

const logger = ENABLE_FILE_LOGGING === true ? log4js.getLogger('default') : log4js.getLogger();
logger.level = LOG_LEVEL;
export default logger;
