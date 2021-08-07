# ScreenDoorPi

This is a NodeJS project that displays messages posted from an Android/iOS app (see [ScreenDoor](https://github.com/djsc/ScreenDoor/)) and displays them on an LCD.

This program runs on a Raspberry Pi and will not build on other platforms due to the i2c-bus dependency. It logs in via Firebase Auth, connects to a Firebase Realtime Database, and uses the attached I2C LCD to display the last message posted by the logged in user. Heartbeats are also sent to the database every 5 minutes so that the phone app can tell if the program has crashed. If a potentially recoverable error occurs, the program will try to recover 5 times over the course of 5 minutes before terminating.

## Parts:
* Raspberry Pi 3 B+
* Case
* 32 GB UHS 1 Micro SD Card
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
* Install Raspbian
  * https://www.raspberrypi.org/documentation/installation/installing-images/

* Enable Headless Mode (optional)
  * https://www.raspberrypi.org/documentation/configuration/wireless/headless.md

* Secure Raspberry Pi (optional)
  * https://www.raspberrypi.org/documentation/configuration/security.md

* Setup automatic updates (optional)
    * Option 1: Use crontab to update packages and reboot at a time and interval of your choosing.
    * Option 2: Use Unattended Upgrades
      * Follow instructions on https://wiki.debian.org/UnattendedUpgrades
      * Also add the following to the Unattended-Upgrade list
        * "origin=Raspbian,codename=${distro_codename},label=Raspbian";
        * "origin=Raspberry Pi Foundation,codename=${distro_codename},label=Raspberry Pi Foundation";

* Configure LCD and get I2C address
  * Plug in LCD using 4 jumper wires
  * Follow the steps below. **Note the I2C address and device port (0 or 1) obtained at the end for later**
  * https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c

* Install dependencies
  * curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
  * sudo apt install -y nodejs
  * node -v #Should output the Node version number if successful
  * sudo npm i -g typescript
  * sudo apt install vim

* Setup project
  * cd ~
  * git clone https://github.com/djsc/ScreenDoorPi.git
  * cd ScreenDoorPi
  * vim src/constants.ts #Set the Firebase and the Display constants obtained earlier in the instructions. Also set the absolute logfile path. Only set your Firebase password if you're going to automatically start the project on boot
  * npm install #This installs the dependencies
  * tsc #Transpiles the typescript from /src into javascript in /build
  * node build #Starts the program at /build/index.ts

* Automatically start project on boot (optional)
  * Make sure you have your Firebase email/password entered in sdoorpi/src/constants.ts
  * sudo vim /etc/rc.local
  * Add the following line before the exit command(may need to change pi to your username): node /home/pi/ScreenDoorPi/build &
