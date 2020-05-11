const os = require('os');
const fs = require('fs');
const path = require('path');
const generalProvider = require(path.join(__dirname, 'generalProvider'));
const errors = require(path.join(__dirname, '../commons/error/errors.js'));

const CONFIG_FILE = 'config.json';

class Store {
    constructor(data) {
        if (data) {
            this.data = data;
        } else {
            this.data = {
                'archive': undefined
            };
        }
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
    }

    parseData() {
        return new Promise((resolve, reject) => {
            let configPath = this.getConfigPath();
            generalProvider.checkAndMake(configPath, false);

            if (!fs.existsSync(path.join(configPath, CONFIG_FILE))) {
                fs.writeFile(path.join(configPath, CONFIG_FILE), JSON.stringify(this.data), function (err) {
                    if (err) throw new errors.criticalError('No se ha podido crear el archivo de configuración.');
                });
            }

            fs.readFile(path.join(configPath, CONFIG_FILE), 'utf8', (err, data) => {
                if (err) throw new errors.criticalError('No se ha podido leer el archivo de configuración.');

                let jsonData = JSON.parse(data);

                this.data = jsonData;

                resolve(true);

                /*for (const key in jsonData) {
                    this.set(key, jsonData[key]);
                    if (jsonData.hasOwnProperty(key)) {

                    }
                }*/
            });
        });
    }

    getConfigPath() {
        let configPath = undefined;
        let username = os.userInfo().username;

        switch (os.platform()) {
            case "linux":
                configPath = '/home/' + username + '/.config/imagemanager';
                break;
            case "win32":
                configPath = 'C:\\Users\\' + username + '\\AppData\\Local\\imagemanager'
                break;
        }

        return configPath;
    }

    updateConfig() {
        let configPath = this.getConfigPath();

        fs.writeFile(path.join(configPath, CONFIG_FILE), JSON.stringify(this.data), function (err) {
            if (err) throw new errors.fsError('No se ha podido actualizar la configuración.');

            return true;
        });
    }
}

module.exports = Store;