const fsError = require(path.join(__dirname, '../error/fsError'));
const usbTimeout = require(path.join(__dirname, '../error/usbTimeout'));

module.exports = {
    fsError,
    usbTimeout
};