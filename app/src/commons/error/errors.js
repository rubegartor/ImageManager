const path = require('path');
const fsError = require(path.join(__dirname, '../error/fsError'));
const usbTimeout = require(path.join(__dirname, '../error/usbTimeout'));
const criticalError = require(path.join(__dirname, '../error/criticalError'));
const validationError = require(path.join(__dirname, '../error/validationError'));

module.exports = {
    fsError,
    usbTimeout,
    criticalError,
    validationError
};