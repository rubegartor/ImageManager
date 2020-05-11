const path = require('path');
const fs = require('fs');
const ExifImage = require('exif').ExifImage;
const globals = require(path.join(__dirname, '../commons/globals'));

module.exports = {
    /**
     * Establece la fecha correspondiente a cada imagen dependiendo de su tipo y las ordena en sus respectivos directorios
     *
     * @param dir
     * @param file
     */
    parseDateTime: function (dir, file) {
        let promiseDetectTypeOfFile = this._detectTypeOfFile(dir, file);
        if (promiseDetectTypeOfFile) {
            promiseDetectTypeOfFile.then(function (res) {
                switch (res.type) {
                    case globals.IMAGE_TYPE:
                        this._getExif(dir, file).then(r => {
                            let fileExtension = this._getExtension(file);
                            let date = {
                                'day': ('0' + r.datetime.getDate()).slice(-2),
                                'month': r.datetime.getMonth() + 1,
                                'year': r.datetime.getFullYear(),
                                'time': r.datetime.getTime()
                            };

                            let formatedDateTime = date.day + '-' + date.month + '-' + date.year + '.' + date.time;
                            let finalPath = generalProvider.checkAndMake(path.join(
                                globals.CONFIG.get('archive'),
                                date.year.toString(),
                                date.month.toString() + ' ' + globals.MONTHS[date.month]));

                            fs.copyFileSync(path.join(dir, file), path.join(finalPath, formatedDateTime + '.' + fileExtension));
                        }).catch(err => {
                            throw err;
                        });

                        break;
                    case globals.WHATSAPP_TYPE:
                        let fileExtension = this._getExtension(file);
                        let date = this._getWhatsAppImageDate(file);

                        let formatedDate = date.day + '-' + date.month + '-' + date.year;
                        let finalPath = generalProvider.checkAndMake(path.join(globals.CONFIG.get('archive'),
                            date.year.toString(),
                            date.month.toString() + ' ' + globals.MONTHS[date.month]));

                        fs.copyFileSync(path.join(dir, file), path.join(finalPath, formatedDate + '.' + fileExtension));

                        break;
                    case globals.UNKNOWN_TYPE:
                        break;
                }
            }.bind(this));
        }
    },

    /**
     * Detecta el tipo de archivo con el que más tarde se tendrá que trabajar.
     *
     * @param dir
     * @param file
     * @return {Promise|null}
     * @private
     */
    _detectTypeOfFile: function (dir, file) {
        let extension = this._getExtension(file);
        let result = null;
        if (globals.VALID_EXTENSIONS.includes(extension)) {
            result = this._getExifType(dir, file).then(function () {
                return {
                    'type': globals.IMAGE_TYPE
                };
            }).catch(function (err) {
                if (this._getWhatsAppType(file)) {
                    result = {
                        'type': globals.WHATSAPP_TYPE
                    };
                } else {
                    result = {
                        'type': globals.UNKNOWN_TYPE,
                        'processData': {
                            'dir': dir,
                            'file': file,
                            'extension': extension
                        }
                    }
                }

                return result;
            }.bind(this));
        }

        return result;
    },

    /**
     * Devuelve si el nombre del archivo corresponde a una imagen de WhatsApp
     *
     * @param file
     * @return {boolean}
     * @private
     */
    _getWhatsAppType: function (file) {
        return new RegExp(/^IMG-\d{8}-WA\d{4}\.\w*/).test(file);
    },

    _getExifType: function (dir, file) {
        return new Promise((resolve, reject) => {
            ExifImage(path.join(dir, file), (err) => {
                err ? reject(err) : resolve(null);
            });
        });
    },

    /**
     * Obtiene los datos EXIF de una imagen
     *
     * @param dir
     * @param file
     * @return {Promise}
     * @private
     */
    _getExif: function (dir, file) {
        return new Promise((resolve, reject) => {
            ExifImage(path.join(dir, file), (err, data) => {
                try {
                    let datePortions = undefined;

                    if (!generalProvider.isEmpty(data.exif)) {
                        let date = data.exif.DateTimeOriginal.split(' ');
                        datePortions = date[0].split(':').join('/') + ' ' + date[1];
                    } else if (!generalProvider.isEmpty(data.image)) {
                        let date = data.image.ModifyDate.split(' ');
                        datePortions = date[0].split(':').join('/') + ' ' + date[1];
                    }

                    if (datePortions === undefined) {
                        reject(path.join(dir, file));
                    } else {
                        resolve({filename: file, datetime: new Date(datePortions)});
                    }
                } catch (e) {
                    throw new Error('No se ha podido extraer la información EXIF del siguiente archivo: ' + path.join(dir, file));
                }
            });
        });
    },

    /**
     * Obtiene la extensión de un archivo
     *
     * @param file
     * @return {string}
     * @private
     */
    _getExtension: function (file) {
        let result = undefined;

        try {
            result = file.split('.').slice(-1)[0].toLowerCase();
        } catch (err) {
            throw err;
        }

        return result;
    },

    /**
     * Obtiene la fecha de una imagen de tipo WhatsApp
     *
     * @param file
     * @return {Object}
     * @private
     */
    _getWhatsAppImageDate: function (file) {
        let unformatedDate = file.split('-')[1];
        return {
            'day': unformatedDate.substring(6, 8),
            'month': unformatedDate.substring(4, 6),
            'year': unformatedDate.substring(0, 4)
        };
    }
};