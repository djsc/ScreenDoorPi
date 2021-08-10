# ScreenDoorPi

This is a NodeJS project that displays messages posted from an Android/iOS app (see [ScreenDoor](https://github.com/djsc/ScreenDoor/)) and displays them on an LCD.

This program runs on a Raspberry Pi and will not build on other platforms due to the i2c-bus dependency. It logs in via Firebase Auth, connects to a Firebase Realtime Database, and uses the attached I2C LCD to display the last message posted by the logged in user. Heartbeats are also sent to the database every 5 minutes so that the phone app can tell if the program has crashed. If a potentially recoverable error occurs, the program will try to recover 5 times over the course of 5 minutes before terminating.

## Parts:
* Raspberry Pi
* Case
* Micro SD Card
* Power Supply
* USB Micro SD Card Reader
* 20x4 I2C LCD
* F/F Jumper Wires

## Additional Hardware:
* HDMI Cable
* HDMI Monitor
* USB Mouse
* USB Keyboard

## Firebase Setup:
* Go to https://console.firebase.google.com/
* Add a project
* Add an app to the project: Dashboard -> Project settings -> General -> Add App -> Web. **Note the firebaseConfig for later**
* Dashboard -> Authentication -> Sign in method -> Email/Password -> Enable
* Dashboard -> Authentication -> Users -> Add user -> **Note username and password for later**
* Dashboard -> Firestore Database -> Create database (locked mode) #This creates a Firestore database which we won't be using
* Dashboard -> Realtime Database  -> Rules -> Publish the following rules:
```
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "posts": {
        ".indexOn": "timePosted",
          "$postID": {
          	".validate": "newData.hasChildren(['text', 'timePosted', 'uuid']) &&
              newData.child('text').isString() &&
              newData.child('timePosted').isNumber() &&
              newData.child('uuid').isString()"
          }
        },
        "lastHeartbeat": {
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

## Raspberry Pi Setup:
* Install Raspberry Pi OS via Raspberry Pi Imager
  * https://www.raspberrypi.org/software/

* Enable Headless Mode (optional)
  * https://www.raspberrypi.org/documentation/configuration/wireless/headless.md

* Secure Raspberry Pi (optional)
  * https://www.raspberrypi.org/documentation/configuration/security.md

* Install dependencies
  * ```curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -``` #Try the latest version first
  * sudo apt install -y nodejs
  * node -v #Should output the Node version number if successful
  * sudo npm i -g typescript
  * sudo apt install vim

* Setup automatic updates (optional)
    * Option 1: Use crontab to update packages and reboot at a time and interval of your choosing.
      * cd /home/pi
      * mkdir autoUpdater
      * mkdir autoUpdater/logs
      * touch autoUpdater/logs/cronlog
      * vim autoUpdater/update.sh
      * Add the following:
        ```
        sudo apt update && sudo apt upgrade -y
        sudo apt autoremove -y
        sudo apt autoclean -y
        sudo reboot
        ```
      * chmod +x autoUpdater/update.sh
      * crontab -e
      * Add the following line to run the script every Saturday at 12:00 AM
        ```0 0 * * SAT sh /home/pi/autoUpdater/update.sh > /home/pi/autoUpdater/logs/cronlog 2>&1```
    * Option 2: Use Unattended Upgrades
      * Follow instructions on https://wiki.debian.org/UnattendedUpgrades
      * Also add the following to the Unattended-Upgrade list
        * "origin=Raspbian,codename=${distro_codename},label=Raspbian";
        * "origin=Raspberry Pi Foundation,codename=${distro_codename},label=Raspberry Pi Foundation";

* Configure LCD and get I2C address
  * Plug in LCD using 4 jumper wires
  * Follow the steps below. **Note the I2C address and device port (0 or 1) obtained at the end for later**
  * https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c

* Setup project
  * cd ~
  * git clone https://github.com/djsc/ScreenDoorPi.git
  * cd ScreenDoorPi
  * Create a .env file to store your Firebase, LCD, and logging configuration
    * vim .env
    * Copy and paste the following. Remove the comments and insert the constants that were obtained earlier in the instructions. The constants should be inside the quotes.
      ```
        DISPLAY_ADDRESS='0x27' //obtained using i2cdetect
        DISPLAY_I2C_BUS='1' //'1' for RPi 3+ Rev >= 2. '0' otherwise
        LOG_FILE_LOCATION='/home/pi/ScreenDoorPi/app.log' //use an absolute path since the program can be started from any location. Don't use '~' as a shortcut for the user's home directory
        FIREBASE_EMAIL='' //if blank, will be prompted to provide at runtime. Only necessary if you're going to automatically start the project on boot
        FIREBASE_PASSWORD='' //if blank, will be prompted to provide at runtime. Only necessary if you're going to automatically start the project on boot
        FIREBASE_API_KEY='' //obtained when setting up Firebase
        FIREBASE_AUTH_DOMAIN='' //obtained when setting up Firebase
        FIREBASE_DATABASE_URL='' //obtained when setting up Firebase
        FIREBASE_PROJECT_ID='' //obtained when setting up Firebase
        FIREBASE_STORAGE_BUCKET='' //obtained when setting up Firebase
        FIREBASE_MESSAGING_SENDER_ID='' //obtained when setting up Firebase
        FIREBASE_APP_ID='' //obtained when setting up Firebase
      ```
  * vim src/constants.ts #Optional. Can configure certain aspects of the app.
  * npm install #This installs the dependencies
  * tsc #Transpiles the typescript from /src into javascript in /build
  * node build #Starts the program at /build/index.ts

* Automatically start project on boot (optional)
  * For this to work, you need to have your Firebase email/password entered in .env
  * sudo vim /etc/rc.local
  * Add the following line before the exit command(may need to change pi to your username): node /home/pi/ScreenDoorPi/build &
