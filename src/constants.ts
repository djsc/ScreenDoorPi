//FIREBASE
export const FIREBASE_CONFIG = { //TODO: replace with your own firebase config
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: ''
};
//NOTE: can hardcode email/password for convenience, but it's insecure. If you leave them blank, you will be prompted for them at runtime
//TODO: replace with your own firebase user email/password (not your Google email/pass) if you want automatic login functionality
export const FIREBASE_EMAIL = '';
export const FIREBASE_PASSWORD = '';

//DISPLAY
export const DISPLAY_WIDTH_CHARS = 20; //likely 16 or 20
export const DISPLAY_HEIGHT_CHARS = 4; //likely 2 or 4
export const DISPLAY_ADDRESS = 0x27; //find using i2cdetect
export const DISPLAY_I2C_BUS = 1; //'1' for RPi Rev >= 2. '0' for RPi Rev 1.

//ERROR DETECTION/MANAGEMENT
export const HEARTBEAT_INTERVAL_MS = 300000; //5min. frequency of status updates to app. If too long, the app will think device is offline.
export const MAX_ERROR_RETRY = 5; //If an error occurs this many times in a row, terminate the program.
export const RETRY_INTERVAL_MS = 60000; //1 minute. Starting reinitialization interval after error occurs.

//LOGGING
export const ENABLE_FILE_LOGGING = true;
export const LOG_FILE = '/home/pi/sdoorpi/app.log'; //use an absolute path since the program can be started from any location. Don't use ~.
export const LOG_LEVEL = 'debug';