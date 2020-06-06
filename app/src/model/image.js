const jQuery = require('jquery');
const path = require('path');
const ExifImage = require('exif').ExifImage;
const commons = require(path.join(__dirname, '../commons/commons'));
const globals = require(path.join(__dirname, '../commons/globals'));

class Image {
    static VALID_EXTENSIONS = ['jpeg', 'jpg', 'png', 'bmp', 'webp', 'gif'];
    static WHATSAPP_TYPE = 'whatsapp';
    static IMAGE_TYPE = 'image';
    static UNKNOWN_TYPE = 'unknown';
    static IMAGEMANAGER_TYPE = 'imagemanager';

    constructor(element) {
        if (element instanceof jQuery) {
            element = $(element);
            this.filename = element.data('filename');
            this.extension = element.data('extension');
            this.path = element.attr('src');
            this.filesize = element.data('size');
            this.datetime = element.data('datetime');
        } else if (typeof element === "string" || element instanceof String) {
            let elementStats = fs.statSync(element);
            if (elementStats.isFile()) {
                let filePath = element;
                let fileStats = elementStats;

                this.filename = path.basename(filePath);
                this.extension = commons.getExtension(filePath);
                this.path = path.dirname(filePath);
                this.filesize = fileStats.size;
                this.datetime = undefined;
            }
        }
    }

    _detectTypeOfFile(dir, filename) {
        let extension = commons.getExtension(filename);
        let result = null;
        if (Image.VALID_EXTENSIONS.includes(extension)) {
            result = this._checkExifType(dir, filename).then(function () {
                return {
                    'type': Image.IMAGE_TYPE
                };
            }).catch(function (err) {
                if (this._checkWhatsAppType(filename)) {
                    result = {
                        'type': Image.WHATSAPP_TYPE
                    };
                } else if (this._checkImageManagerType(filename)) {
                    result = {
                        'type': Image.IMAGEMANAGER_TYPE
                    };
                } else {
                    result = {
                        'type': Image.UNKNOWN_TYPE,
                        'processData': {
                            'dir': dir,
                            'filename': filename,
                            'extension': extension
                        }
                    };
                }

                return result;
            }.bind(this));
        }

        return result;
    }

    _checkExifType(dir, file) {
        return new Promise((resolve, reject) => {
            ExifImage(path.join(dir, file), (err) => {
                err ? reject(err) : resolve(null);
            });
        });
    }

    _checkWhatsAppType(file) {
        return new RegExp(/^IMG-\d{8}-WA\d{4}\.\w*/).test(file);
    }

    _checkImageManagerType(file) {
        return new RegExp(/(\d{2})-(\d{2})-(\d{4}).(\d{13})/).test(file);
    }

    _getExif(dir, file) {
        return new Promise((resolve, reject) => {
            ExifImage(path.join(dir, file), (err, data) => {
                try {
                    let datePortions = undefined;

                    if (!commons.isEmpty(data.exif)) {
                        let date = data.exif.DateTimeOriginal.split(' ');
                        datePortions = date[0].split(':').join('/') + ' ' + date[1];
                    } else if (!commons.isEmpty(data.image)) {
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
    }

    _getWhatsAppImageDate(file) {
        let unformatedDate = file.split('-')[1];
        return {
            'day': unformatedDate.substring(6, 8),
            'month': unformatedDate.substring(4, 6),
            'year': unformatedDate.substring(0, 4)
        };
    }

    parseDateTime() {
        return new Promise((resolve, reject) => {
            let promiseDetectTypeOfFile = this._detectTypeOfFile(this.path, this.filename);
            if (promiseDetectTypeOfFile) {
                let promiseRes = promiseDetectTypeOfFile.then(function (res) {
                    switch (res.type) {
                        case Image.IMAGE_TYPE:
                            return this.copyImageType().then((r) => {
                                return r;
                            });
                        case Image.WHATSAPP_TYPE:
                            return this.copyWhatsAppType();
                        case Image.IMAGEMANAGER_TYPE:
                            return this.copyImageManagerType();
                        case Image.UNKNOWN_TYPE:
                            //Baia baia, me cachis, kasemo' aquí?
                            break;
                    }
                }.bind(this));

                if (promiseRes instanceof Promise) {
                    promiseRes.then((r) => {
                        r.err ? reject(r) : resolve(r);
                    });
                } else {
                    promiseRes.err ? reject(promiseRes) : resolve(promiseRes);
                }
            }
        });
    }

    copyImageType() {
        return this._getExif(this.path, this.filename).then(r => {
            let fileExtension = commons.getExtension(this.filename);
            let date = {
                'day': ('0' + r.datetime.getDate()).slice(-2),
                'month': r.datetime.getMonth() + 1,
                'year': r.datetime.getFullYear(),
                'time': r.datetime.getTime()
            };

            let formatedDateTime = date.day + '-' + date.month + '-' + date.year + '.' + date.time;
            let finalPath = commons.checkAndMake(path.join(
                globals.CONFIG.get('archive'),
                date.year.toString(),
                date.month.toString() + ' ' + globals.MONTHS[date.month]));

            this.datetime = r.datetime;

            fs.copyFileSync(path.join(this.path, this.filename), path.join(finalPath, formatedDateTime + '.' + fileExtension));

            return {'err': false};
        }).catch(err => {
            return {'err': true, 'message': err};
        });
    }

    copyWhatsAppType() {
        try {
            let fileExtension = commons.getExtension(this.filename);
            let date = this._getWhatsAppImageDate(this.filename);
            let dateObject = new Date(parseInt(date.year), parseInt(date.month), parseInt(date.day));

            let formatedDate = date.day + '-' + date.month + '-' + date.year;
            let finalPath = commons.checkAndMake(path.join(globals.CONFIG.get('archive'),
                date.year.toString(),
                date.month.toString() + ' ' + globals.MONTHS[date.month]));

            this.datetime = dateObject;

            fs.copyFileSync(path.join(this.path, this.filename), path.join(finalPath, formatedDate + '.' + fileExtension));

            return {'err': false};
        } catch (err) {
            return {'err': true, 'message': err};
        }
    }

    copyImageManagerType() {
        try {
            let fileExtension = commons.getExtension(this.filename);

            let date = {
                'day': this.filename.substring(0, 2),
                'month': this.filename.substring(3, 5),
                'year': this.filename.substring(6, 10)
            };

            this.datetime = new Date(date.year + '-' + date.month + '-' + date.day);

            let formatedDateTime = date.day + '-' + date.month + '-' + date.year;

            let finalPath = commons.checkAndMake(path.join(globals.CONFIG.get('archive'),
                date.year.toString(),
                date.month.toString() + ' ' + globals.MONTHS[date.month]));

            fs.copyFileSync(path.join(this.path, this.filename), path.join(finalPath, formatedDateTime + '.' + fileExtension));

            return {'err': false};
        } catch (err) {
            return {'err': true, 'message': err};
        }
    }

    toHTML() {
        return $('<img>')
            .addClass('image')
            .attr({
                'src': path.join(this.path, this.filename),
                'data-filename': this.filename,
                'data-extension': commons.getExtension(this.filename),
                'data-path': this.path,
                'data-size': this.filesize,
                'data-datetime': this.datetime
            })
            ;
    }
}

module.exports = Image;