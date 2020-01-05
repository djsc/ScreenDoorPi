// This is a modified version of https://github.com/craigmw/lcdi2c

import i2c from 'i2c-bus';
import sleep from 'sleep';
import logger from './logger';

const displayPorts = {
    RS: 0x01,
    E: 0x04,
    D4: 0x10,
    D5: 0x20,
    D6: 0x40,
    D7: 0x80,
    CHR: 1,
    CMD: 0,
    backlight: 0x08,
    RW: 0x20
};

// commands
const CLEARDISPLAY = 0x01;
const RETURNHOME = 0x02;
const ENTRYMODESET = 0x04;
const DISPLAYCONTROL = 0x08;
const CURSORSHIFT = 0x10;
const FUNCTIONSET = 0x20;
const SETCGRAMADDR = 0x40;
const SETDDRAMADDR = 0x80;

//# flags for display entry mode
const ENTRYRIGHT = 0x00;
const ENTRYLEFT = 0x02;
const ENTRYSHIFTINCREMENT = 0x01;
const ENTRYSHIFTDECREMENT = 0x00;

//# flags for display on/off control
const DISPLAYON = 0x04;
const DISPLAYOFF = 0x00;
const CURSORON = 0x02;
const CURSOROFF = 0x00;
const BLINKON = 0x01;
const BLINKOFF = 0x00;

//# flags for display/cursor shift
const DISPLAYMOVE = 0x08;
const CURSORMOVE = 0x00;
const MOVERIGHT = 0x04;
const MOVELEFT = 0x00;

//# flags for function set
const _8BITMODE = 0x10;
const _4BITMODE = 0x00;
const _2LINE = 0x08;
const _1LINE = 0x00;
const _5x10DOTS = 0x04;
const _5x8DOTS = 0x00;

//Line addresses.
const LINEADDRESS = [0.80, 0xC0, 0x94, 0xD4];

/**
 * device: I2C bus number; 0 for rev. 1 boards, 1 for rev. 2+ boards.
 * address: Address of device (use i2cdetect to determine this)
 * cols: columns supported by display (e.g. 16 or 20)
 * rows: rows supported by display (e.g. 2 or 4 )
 */
class LCD {
    device: number;
    address: number;
    cols: number;
    rows: number;
    i2c: i2c.I2cBus | null;

    constructor(device: number, address: number, cols: number, rows: number) {
        this.device = device;
        this.address = address;
        this.cols = cols;
        this.rows = rows;
        this.i2c = null;
    }

    initialize = async (): Promise<void> => {
        logger.debug('Initializing LCD');
        this.i2c = await this.openPort();
        sleep.msleep(1000);
        this.write4(0x33, displayPorts.CMD);
        sleep.msleep(200);
        this.write4(0x32, displayPorts.CMD);
        sleep.msleep(100);
        this.write4(0x06, displayPorts.CMD);
        sleep.msleep(100);
        this.write4(0x28, displayPorts.CMD);
        sleep.msleep(100);
        this.write4(0x01, displayPorts.CMD);
        sleep.msleep(100);
        this.write4(FUNCTIONSET | _4BITMODE | _2LINE | _5x10DOTS, displayPorts.CMD); //4 bit - 2 line 5x7 matrix
        sleep.msleep(10);
        this.write(DISPLAYCONTROL | DISPLAYON, displayPorts.CMD); //turn cursor off 0x0E to enable cursor
        sleep.msleep(10);
        this.write(ENTRYMODESET | ENTRYLEFT, displayPorts.CMD); //shift cursor right
        sleep.msleep(10);
        this.write(CLEARDISPLAY, displayPorts.CMD); // LCD clear
        sleep.msleep(10);
        this.write(displayPorts.backlight, displayPorts.CHR); //Turn on backlight.
        sleep.msleep(10);
        logger.debug('LCD Initialized');
        return Promise.resolve();
    }

    private openPort = (): Promise<i2c.I2cBus> => {
        logger.debug('Opening port');
        return new Promise((accept, reject) => {
            const i2cBus = i2c.open(this.device, (err) => {
                if (err) {
                    return reject;
                }
                logger.debug('Opened port');
                return accept(i2cBus);
            });
        });
    }

    private write4 = (x: number, c: number) => {
        if (this.i2c === null) {
            throw Error('i2c is null');
        }
        const a = (x & 0xF0); // Use upper 4 bit nibble
        this.i2c.sendByteSync(this.address, a | displayPorts.backlight | c);
        sleep.msleep(2);
        this.i2c.sendByteSync(this.address, a | displayPorts.E | displayPorts.backlight | c);
        sleep.msleep(2);
        this.i2c.sendByteSync(this.address, a | displayPorts.backlight | c);
        sleep.msleep(2);
    }

    /**
     * Was broken in the original library.
     * I believe errors are now fixed, but this should still be set up to use promises before being used
     */
    // private write4Async = (x: number, c: number) => {
    //     if (this.i2c === null) {
    //         throw Error('i2c is null');
    //     }
    //     const a = (x & 0xF0); // Use upper 4 bit nibble
    //     this.i2c.sendByte(this.address, a | displayPorts.backlight | c, (err) => {
    //         if (err) {
    //             throw Error(err);
    //         }
    //     });
    //     sleep.msleep(2);
    //     this.i2c.sendByte(this.address, a | displayPorts.E | displayPorts.backlight | c, (err) => {
    //         if (err) {
    //             throw Error(err);
    //         }
    //     });
    //     sleep.msleep(2);
    //     this.i2c.sendByte(this.address, a | displayPorts.backlight | c, (err) => {
    //         if (err) {
    //             throw Error(err);
    //         }
    //     });
    //     sleep.msleep(2);
    // };

    private write4Block = (x: number, c: number) => {
        if (this.i2c === null) {
            throw Error('i2c is null');
        }
        const a = (x & 0xF0);
        const buffer = Buffer.alloc(3);
        buffer[0] = a | displayPorts.backlight | c;
        buffer[1] = a | displayPorts.E | displayPorts.backlight | c;
        buffer[2] = a | displayPorts.backlight | c;
        this.i2c.writeI2cBlockSync(this.address, 1, buffer.length, buffer);
        sleep.msleep(2);
    };

    private write = (x: number, c: number) => {
        this.write4(x, c);
        this.write4(x << 4, c);
    }

    private writeBlock = (x: number, c: number) => {
        this.write4Block(x, c);
        this.write4Block(x << 4, c);
    };

    clear = () => {
        this.write(CLEARDISPLAY, displayPorts.CMD);
    }

    print = (str: string) => {
        for (let i = 0; i < str.length; i++) {
            const c = str[i].charCodeAt(0);
            this.write(c, displayPorts.CHR);
        }
    }

    printBlock = (str: string) => {
        for (let i = 0; i < str.length; i++) {
            const c = str[i].charCodeAt(0);
            this.writeBlock(c, displayPorts.CHR);
        }
    };

    /**
     * NOTE: lines start at 0
     */
    println = (str: string, line: number) => {
        //Set cursor to correct line.
        if (line >= 0 && line < this.rows) {
            this.write(LINEADDRESS[line], displayPorts.CMD);
        }
        this.print(str.substring(0, this.cols));
    };

    /**
     * printlnBlock: println function, but uses writeI2CBlockSync method to speed up transfers.
     * NOTE: lines start at 0
     */
    printlnBlock = (str: string, line: number) => {
        if (line >= 0) {
            this.write(LINEADDRESS[line], displayPorts.CMD);
        }
        //Now, write block to i2c.
        this.printBlock(str.substring(0, this.cols));
    }

    /** flashing block for the current cursor */
    cursorFull = () => {
        this.write(DISPLAYCONTROL | DISPLAYON | CURSORON | BLINKON, displayPorts.CMD);
    }

    /** small line under the current cursor */
    cursorUnder = () => {
        this.write(DISPLAYCONTROL | DISPLAYON | CURSORON | BLINKOFF, displayPorts.CMD);
    }

    /** set cursor pos, top left = 0,0 */
    setCursor = (x: number, y: number) => {
        const l = [0x00, 0x40, 0x14, 0x54];
        this.write(SETDDRAMADDR | (l[y] + x), displayPorts.CMD);
    }

    /** set cursor to 0,0 */
    home = () => {
        const l = [0x00, 0x40, 0x14, 0x54];
        this.write(SETDDRAMADDR | 0x00, displayPorts.CMD);
    }

    /** Turn underline cursor off */
    blinkOff = () => {
        this.write(DISPLAYCONTROL | DISPLAYON | CURSOROFF | BLINKOFF, displayPorts.CMD);
    }

    /** Turn underline cursor on */
    blinkOn = () => {
        this.write(DISPLAYCONTROL | DISPLAYON | CURSORON | BLINKOFF, displayPorts.CMD);
    }

    /** Turn block cursor off */
    cursorOff = () => {
        this.write(DISPLAYCONTROL | DISPLAYON | CURSOROFF | BLINKON, displayPorts.CMD);
    }

    /** Turn block cursor on */
    cursorOn = () => {
        this.write(DISPLAYCONTROL | DISPLAYON | CURSORON | BLINKON, displayPorts.CMD);
    }

    /** setBacklight */
    setBacklight = (val: number) => {
        if (val > 0) {
            displayPorts.backlight = 0x08;
        } else {
            displayPorts.backlight = 0x00;
        }
        this.write(DISPLAYCONTROL, displayPorts.CMD);
    }

    /** setContrast stub */
    setContrast = (val: number) => {
        this.write(DISPLAYCONTROL, displayPorts.CMD);
    }

    /** Turn display off */
    off = () => {
        displayPorts.backlight = 0x00;
        this.write(DISPLAYCONTROL | DISPLAYOFF, displayPorts.CMD);
    }

    /** Turn display on */
    on = () => {
        displayPorts.backlight = 0x08;
        this.write(DISPLAYCONTROL | DISPLAYON, displayPorts.CMD);
    }

    /** set special character 0..7, data is an array(8) of bytes, and then return to home addr */
    createChar = (ch: number, data: number[]) => {
        this.write(SETCGRAMADDR | ((ch & 7) << 3), displayPorts.CMD);
        for (let i = 0; i < 8; i++) {
            this.write(data[i], displayPorts.CHR);
        }
        this.write(SETDDRAMADDR, displayPorts.CMD);
    }
}

export default LCD;