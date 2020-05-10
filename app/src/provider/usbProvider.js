const globals = require(path.join(__dirname, '../commons/globals'));
const errors = require(path.join(__dirname, '../commons/error/errors'));
const generalProvider = require(path.join(__dirname, 'generalProvider'));
const drivelist = require('drivelist');
const os = require('os');

module.exports = {
    checkUSBDevice: function (device) {
        return new Promise((resolve, reject) => {
            const poll = setInterval(() => {
                drivelist.list().then((drives) => {
                    drives.forEach((drive) => {
                        if (drive.isUSB) {
                            let mountPath = drive.mountpoints[0].path;
                            try {
                                resolve(mountPath);
                            } catch (err) {
                                reject(err);
                            } finally {
                                clearInterval(poll);
                            }
                        } else if (globals.PHONE_BRANDS.includes(device.manufacturer.toLowerCase()) && os.platform() === "linux") {
                            let loopInterval = undefined;
                            try {
                                let linuxMobileMount = '/run/user/' + os.userInfo().uid + '/gvfs';
                                let retries = 1;
                                loopInterval = setInterval(function () {
                                    retries++;

                                    let dir = generalProvider.getDirectories(linuxMobileMount);
                                    //Se elige el directorio que pertenezca directamente a los datos del telefono, por ejemplo los iPhone crean 2 directorios diferentes
                                    let dirIndex = dir.findIndex((element) => element.includes(device.deviceName));

                                    if (dir instanceof errors.fsError) {
                                        if (loopInterval) {
                                            globals.LOOP_BREAK = false;
                                            clearInterval(loopInterval);
                                        }
                                        reject(dir);
                                    } else {
                                        if (dir.length > 0 && generalProvider.getDirectories(path.join(linuxMobileMount, dir[dirIndex])).length > 0) {
                                            clearInterval(loopInterval);
                                            globals.LOOP_BREAK = false;
                                            resolve(path.join(linuxMobileMount, dir[dirIndex]));
                                        }

                                        if (retries === globals.LOOP_MAX_TRIES || globals.LOOP_BREAK) {
                                            globals.LOOP_BREAK = false;
                                            clearInterval(loopInterval);

                                            if (retries === globals.LOOP_MAX_TRIES) {
                                                reject(new errors.usbTimeout('Se ha excedido el intento maximo para el dispositivo USB'));
                                            }
                                        }
                                    }
                                }, 1000);
                            } catch (err) {
                                reject(err);
                            } finally {
                                clearInterval(poll);
                            }
                        }
                    })
                })
            }, 2000);
        });
    }
};