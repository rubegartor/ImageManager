const phonebrands = require('./data/phone-brands')

module.exports = {
    ARCHIVE_PATH: '/home/ruben/Proyectos/imagemanager/archive',
    DEVICES_PIDS: [],
    LOOP_MAX_TRIES: 10,
    LOOP_BREAK: false,
    PHONE_BRANDS: phonebrands.PHONE_BRANDS,
    MONTHS: {
        '01': 'Ene',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Abr',
        '05': 'May',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Ago',
        '09': 'Sep',
        '10': 'Oct',
        '11': 'Nov',
        '12': 'Dic'
    },
    MONTHS_NAME: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    VALID_EXTENSIONS: ['jpeg', 'jpg', 'png', 'bmp', 'webp', 'gif'],
    WHATSAPP_TYPE: 'whatsapp',
    IMAGE_TYPE: 'image',
    UNKNOWN_TYPE: 'unknown'
}