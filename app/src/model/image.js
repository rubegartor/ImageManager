const jQuery = require('jquery');
const path = require('path');
const ExifImage = require('exif').ExifImage;
const commons = require(path.join(__dirname, '../commons/commons'));
const globals = require(path.join(__dirname, '../commons/globals'));

class Image {
    static IMAGE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'bmp', 'webp', 'gif'];
    static VIDEO_EXTENSIONS = ['mp4'];
    static VALID_EXTENSIONS = Image.IMAGE_EXTENSIONS.concat(Image.VIDEO_EXTENSIONS);
    static WHATSAPP_TYPE = 'whatsapp';
    static IMAGE_TYPE = 'image';
    static WHATSAPP_VIDEO_TYPE = 'whatsappVideo';
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
                } else if (this._checkWhatsAppVideoType(filename)) {
                    result = {
                        'type': Image.WHATSAPP_VIDEO_TYPE
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

    _checkWhatsAppVideoType(file) {
        return new RegExp(/^VID-\d{8}-WA\d{4}\.\w*/).test(file);
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
                    reject('No se ha podido extraer la información EXIF del siguiente archivo: ' + path.join(dir, file));
                }
            });
        });
    }

    _getWhatsAppImageOrVideoDate(file) {
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
                            return this.copyWhatsAppImageOrVideoType();
                        case Image.WHATSAPP_VIDEO_TYPE:
                            return this.copyWhatsAppImageOrVideoType();
                        case Image.IMAGEMANAGER_TYPE:
                            return this.copyImageManagerType();
                        case Image.UNKNOWN_TYPE:
                            return {'err': true, 'message': 'No se ha encontrado el patrón para ordenar esta imágen.'};
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
                'month': ('0' + (r.datetime.getMonth() + 1)).slice(-2),
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

    copyWhatsAppImageOrVideoType() {
        try {
            let fileExtension = commons.getExtension(this.filename);
            let date = this._getWhatsAppImageOrVideoDate(this.filename);
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

            let formatedDateTime = date.day + '-' + date.month + '-' + date.year;

            let finalPath = commons.checkAndMake(path.join(globals.CONFIG.get('archive'),
                date.year.toString(),
                date.month.toString() + ' ' + globals.MONTHS[date.month]));

            this.datetime = new Date(date.year + '-' + date.month + '-' + date.day);

            fs.copyFileSync(path.join(this.path, this.filename), path.join(finalPath, formatedDateTime + '.' + fileExtension));

            return {'err': false};
        } catch (err) {
            return {'err': true, 'message': err};
        }
    }

    /**
     * Devuelve el elemento de la miniatura de la imagen
     *
     * @return {jQuery}
     */
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
            });
    }

    /**
     * Devuelve los elementos necesarios para la previsualizacion de una imagen
     *
     * @return {(jQuery|jQuery)[]}
     */
    previsualize() {
        let thumbnailSrc = path.join(this.path, this.filename);

        let prevImgBtn = $('<a>')
            .attr('data-action', 'showPrevImage')
            .addClass('prev')
            .html('<i class="fas fa-chevron-left"></i>');

        let nextImgBtn = $('<a>')
            .attr('data-action', 'showNextImage')
            .addClass('next')
            .html('<i class="fas fa-chevron-right"></i>');

        let newImage = $('<img>')
            .attr('src', thumbnailSrc)
            .addClass('openImage');

        return [newImage, prevImgBtn, nextImgBtn];
    }
}

module.exports = Image;