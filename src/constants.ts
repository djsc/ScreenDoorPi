//DISPLAY
export const DISPLAY_WIDTH_CHARS = 20; //likely 16 or 20
export const DISPLAY_HEIGHT_CHARS = 4; //likely 2 or 4

//ERROR DETECTION/MANAGEMENT
export const HEARTBEAT_INTERVAL_MS = 300000; //5min. frequency of status updates to app. If too long, the app will think device is offline.
export const MAX_ERROR_RETRY = 5; //If an error occurs this many times in a row, terminate the program.
export const RETRY_INTERVAL_MS = 60000; //1 minute. Starting reinitialization interval after error occurs.

//LOGGING
export const ENABLE_FILE_LOGGING = true;
export const LOG_LEVEL = 'debug';
