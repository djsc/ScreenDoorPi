import firebase from 'firebase';
import moment from 'moment';
import LCD from './lcd';
import {
    MAX_ERROR_RETRY,
    RETRY_INTERVAL_MS,
    HEARTBEAT_INTERVAL_MS,
    DISPLAY_WIDTH_CHARS,
    DISPLAY_HEIGHT_CHARS
} from './constants';
import { getLines } from './text';
import { Post } from './types';
import logger, {shutdownLogger} from './logger';
import readline from 'readline';
import { Writable } from 'stream';
import sleep from 'sleep';
import dotenv from 'dotenv';
import path from 'path';

// loading the variables from the .env file asap. Path is necessary when running from rc.local
const envResult = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (envResult.error) {
    throw new Error('Could not load the .env file: ' + JSON.stringify(envResult.error));
}

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
}; 

const displayI2cBus = parseInt(process.env.DISPLAY_I2C_BUS || '', 10);
const displayAddress = parseInt(process.env.DISPLAY_ADDRESS || '', 16);

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || 
    !firebaseConfig.databaseURL || !firebaseConfig.projectId || 
    !firebaseConfig.storageBucket || !firebaseConfig.messagingSenderId || 
    !firebaseConfig.appId || !displayI2cBus || !displayAddress
) {
    throw new Error('Some required properties in the .env file are not defined');
} 


let lcd: LCD | null = null;
let heartbeatTimer: NodeJS.Timer | null = null;
let handlingError = false; //true if there is already a setTimeout set to reinitialize after an error occurred
let numConsecutiveErrors = 0;
let lastErrorTime = 0; //timestamp of last error

//used to hide the Firebase password from the console
let hideInput = false;
const hiddenStdout = new Writable({
    write: (chunk, encoding, callback) => {
        if (hideInput === false) {
            process.stdout.write(chunk, encoding);
        }
        callback();
    }
});

const initialize = async () => {
    try {
        logger.debug('Initializing app');
        sleep.msleep(10000);
        logger.debug('Done sleeping before init');
        await initializeLCD();
        await initializeFirebase();
        startPostListener();
        startHeartbeats();
        logger.debug('App initialized');
    } catch (err) {
        handleError(err);
    }
};

const reinitialize = async () => {
    try {
        lcd = null;
        if (firebase.apps.length > 0 && firebase.auth().currentUser !== null) {
            await firebase.auth().signOut().catch(() => { });
        }
        await initialize();
    } catch (err) {
        handleError(err);
    }
};

const handleError = (err: any) => {
    if (handlingError === true) {
        logger.error(`The following error occurred. Already queued up to retry`, err);
        return;
    }
    handlingError = true;
    stopHeartbeats();
    const now = moment.now();
    if (now - lastErrorTime < RETRY_INTERVAL_MS * 2) {
        numConsecutiveErrors++;
    } else {
        numConsecutiveErrors = 1;
    }
    lastErrorTime = now;
    if (numConsecutiveErrors >= MAX_ERROR_RETRY) {
        logger.error(`**ERROR** The consecutive error threshhold of ${MAX_ERROR_RETRY} has been reached. Terminating program.`, err);
        shutdownProgram();
    } else {
        logger.error(`**ERROR** Reinitializing in ${RETRY_INTERVAL_MS / 1000}s. Consecutive errors: ${numConsecutiveErrors}`, err);
    }
    setTimeout(() => {
        handlingError = false;
        try {
            reinitialize();
            startHeartbeats();
        } catch (err) {
            handleError(err);
        }
    }, RETRY_INTERVAL_MS);
};

const initializeLCD = (): Promise<void> => {
    lcd = new LCD(displayI2cBus, displayAddress, DISPLAY_WIDTH_CHARS, DISPLAY_HEIGHT_CHARS);
    return lcd.initialize();
};

const initializeFirebase = async () => {
    if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
    }
    let email = process.env.FIREBASE_EMAIL;
    let pass = process.env.FIREBASE_PASSWORD;
    let userInputtedCredentials = false; //true if the user has to input their credentials.
    if (!email) {
        userInputtedCredentials = true;
        const emailReader = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        email = await readLineAsync('Firebase email: ', emailReader, false);
        emailReader.close();
        const passReader = readline.createInterface({
            input: process.stdin,
            output: hiddenStdout,
            terminal: true
        });
        pass = await readLineAsync('Firebase password: ', passReader, true);
        passReader.close();
    } else if (!pass) {
        userInputtedCredentials = true;
        console.log('Firebase email: ' + email);
        const passReader = readline.createInterface({
            input: process.stdin,
            output: hiddenStdout,
            terminal: true
        });
        pass = await readLineAsync('Firebase password: ', passReader, true);
        passReader.close();
    }
    return firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((a: firebase.auth.UserCredential) => {
            logger.debug('Logged in');
            return Promise.resolve(a);
        })
        .catch((err: firebase.auth.Error) => {
            const recoverableError = err.code === 'auth/too-many-requests' || err.code === 'auth/network-request-failed';
            if (userInputtedCredentials === true || recoverableError === false) {
                logger.error('Authentication error. Terminating program.', err);
                shutdownProgram();
            }
            logger.debug('Failed to log in');
            return Promise.reject(err);
        });
};

const readLineAsync = (prompt: string, reader: readline.ReadLine, isPassword: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
        reader.question(prompt, (answer: string) => {
            if (isPassword === true) {
                hideInput = false;
            }
            resolve(answer);
        });
        if (isPassword === true) {
            hideInput = true;
        }
    });
};

const startPostListener = () => {
    const { currentUser } = firebase.auth();
    if (currentUser === null) {
        throw Error('No user found');
    }
    firebase.database().ref(`/users/${currentUser.uid}/posts`).orderByChild('timePosted').limitToLast(1)
        .on('value', async (snapshot) => {
            try {
                await handleNewPosts(snapshot);
            } catch (err) {
                handleError(err);
            }
        });
};

const startHeartbeats = () => {
    if (heartbeatTimer === null) {
        heartbeatTimer = setInterval(async () => {
            try {
                await sendHeartbeat();
            } catch (err) {
                handleError(err);
            }
        }, HEARTBEAT_INTERVAL_MS);
    }
};

const stopHeartbeats = () => {
    if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
};

const sendHeartbeat = () => {
    const now = moment.now();
    const { currentUser } = firebase.auth();
    if (currentUser === null) {
        throw Error('User not authenticated');
    }
    if (lcd === null) {
        throw Error('LCD is null');
    }
    lcd.home(); //Just moves the already invisible cursor to test the LCD's connection
    return firebase.database().ref(`/users/${currentUser.uid}/lastHeartbeat/`).set(now)
        .then(() => {
            logger.debug('Heartbeat sent');
            return Promise.resolve();
        });
};

const handleNewPosts = (snapshot: firebase.database.DataSnapshot | null) => {
    if (lcd === null) {
        throw Error('LCD is null');
    }
    sendHeartbeat();
    lcd.clear();
    if (snapshot === null || snapshot.hasChildren() === false) {
        logger.debug('Fetched 0 posts');
        return;
    }
    let lastPost: Post | undefined;
    snapshot.forEach(snap => {
        const post = snap.val() as Post;
        if (!isValidPost(post)) {
            throw Error('Post contains unexpected data');
        }
        lastPost = post;
        return false;
    });
    if (lastPost) {
        logger.debug('Fetched a post', lastPost);
        displayPost(lastPost);
    }
};

const isValidPost = (post: any) => {
    return (
        post !== undefined &&
        post.text !== undefined &&
        post.timePosted !== undefined &&
        post.uuid !== undefined &&
        typeof post.text === 'string' &&
        typeof post.timePosted === 'number' &&
        typeof post.uuid === 'string'
    );
};

const displayPost = (post: Post) => {
    if (lcd === null) {
        throw Error('LCD is null');
    }
    lcd.clear();
    const lines = getLines(post.text, DISPLAY_HEIGHT_CHARS, DISPLAY_WIDTH_CHARS);
    lines.forEach((line, idx) => {
        if (lcd === null) {
            throw Error('LCD is null');
        }
        if (idx < DISPLAY_HEIGHT_CHARS) {
            lcd.printlnBlock(line, idx);
        }
    });
};

const shutdownProgram = async () => {
    try {
        await shutdownLogger();
        process.exit(1);
    } catch (err) {
        logger.debug('Failed to shutdown logger, err');
        process.exit(1);
    }
};

initialize();
