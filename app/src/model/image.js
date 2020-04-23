class Image {
    constructor() {
        this._filename = '';
        this._extension = '';
        this._path = '';
        this._filesize = 0;
        this._datetime = new Date();
        this._x = 0;
        this._y = 0;
    }


    /**
     * @returns {string}
     */
    get filename() {
        return this._filename;
    }

    /**
     * @param {string} value
     */
    set filename(value) {
        this._filename = value;
    }

    /**
     * @returns {string}
     */
    get extension() {
        return this._extension;
    }

    /**
     * @param {string} value
     */
    set extension(value) {
        this._extension = value;
    }

    /**
     * @returns {string}
     */
    get path() {
        return this._path;
    }

    /**
     * @param {string} value
     */
    set path(value) {
        this._path = value;
    }

    /**
     * @returns {number}
     */
    get filesize() {
        return this._filesize;
    }

    /**
     * @param {number} value
     */
    set filesize(value) {
        this._filesize = value;
    }

    /**
     * @returns {number}
     */
    get x() {
        return this._x;
    }

    /**
     * @param {number} value
     */
    set x(value) {
        this._x = value;
    }

    /**
     * @returns {number}
     */
    get y() {
        return this._y;
    }

    /**
     * @param {number} value
     */
    set y(value) {
        this._y = value;
    }

    /**
     * @return {Date}
     */
    get datetime() {
        return this._datetime;
    }

    /**
     * @param {Date} value
     */
    set datetime(value) {
        this._datetime = value;
    }
}