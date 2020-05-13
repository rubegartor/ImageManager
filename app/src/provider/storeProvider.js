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
            //Default config data
            this.data = {
                'archive': undefined,
                'selectChildrenNodes': false,
                'optimizeImageMemory': true
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
            generalProvider.checkAndMake(configPath, true);

            if (!fs.existsSync(path.join(configPath, CONFIG_FILE))) {
                fs.writeFile(path.join(configPath, CONFIG_FILE), JSON.stringify(this.data), function (err) {
                    if (err) reject(errors.criticalError('No se ha podido crear el archivo de configuración.'));
                });
            }

            fs.readFile(path.join(configPath, CONFIG_FILE), 'utf8', (err, data) => {
                if (err) reject(errors.criticalError('No se ha podido leer el archivo de configuración.'));

                let jsonData = JSON.parse(data);

                for (const key in jsonData) {
                    if (jsonData.hasOwnProperty(key)) {
                        this.set(key, jsonData[key]);
                    }
                }

                resolve(true);
            });
        });
    }

    getConfigPath() {
        let configPath = undefined;
        let homedir = os.homedir();

        switch (os.platform()) {
            case "linux":
                configPath = homedir + '/.config/imagemanager/';
                break;
            case "win32":
                configPath = homedir + '\\AppData\\Local\\imagemanager'
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