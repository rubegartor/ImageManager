const path = require('path');
const ExifImage = require('exif').ExifImage;
const globals = require(path.resolve('app/src/commons/globals'));

module.exports = {
    /**
     * Establece la fecha correspondientea cada imagen dependiendo de su tipo y las ordena en sus respectivos directorios
     *
     * @param dir
     * @param file
     */
    parseDateTime: function (dir, file) {
        console.log(globals.ARCHIVE_PATH);
        let promiseDetectTypeOfFile = this._detectTypeOfFile(dir, file);
        if (promiseDetectTypeOfFile) {
            promiseDetectTypeOfFile.then(function (res) {
                console.log(res);
            });
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
        let extension = file.split('.').slice(-1)[0].toLowerCase();
        let result = null;
        if (globals.VALID_EXTENSIONS.includes(extension)) {
            result = this._getExifType(dir, file).then(function () {
                return {
                    'type': globals.IMAGE_TYPE
                };
            }).catch(function (err) {
                if (err.context._getWhatsAppType(file)) {
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
            });
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
                err ? reject({'context': this, 'err': err}) : resolve(null);
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
    _getExif: function _getExif(dir, file) {
        return new Promise(resolve => {
            ExifImage(path.join(dir, file), (err, data) => {
                if (err) {
                    let imgStats = fs.statSync(file);
                    resolve({filename: file, datetime: imgStats.mtime});
                } else {
                    let date = data.exif.DateTimeOriginal.split(' ');
                    let datePortions = date[0].split(':').join('/') + ' ' + date[1];
                    resolve({filename: file, datetime: new Date(datePortions)});
                }
            });
        });
    }
};