const fs = require('fs');
const path = require('path');
const globals = require(path.join(__dirname, '../commons/globals'));
const errors = require(path.join(__dirname, '../commons/error/errors'));

module.exports = {
    /**
     * Obtiene los directorios de un path especificado
     *
     * @param path
     * @return {string[]|Error}
     */
    getDirectories: function (path) {
        try {
            return fs.readdirSync(path).filter(function (file) {
                return fs.statSync(path + '/' + file).isDirectory();
            });
        } catch (e) {
            return new errors.fsError();
        }
    },

    loadArchive: function (archive = globals.ARCHIVE_PATH) {
        let structure = {};

        for (let year of this.getDirectories(archive)) {
            let month = this.getDirectories(path.join(archive, year));

            if (!structure[year])
                structure[year] = [];

            structure[year].push(month);
        }

        return structure;
    },

    /**
     * Recorre recursivamente los directorios en busca de archivos
     *
     * @param dir
     * @param filelist
     */
    walkSync: function (dir, filelist) {
        let files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function (file) {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                filelist = generalProvider.walkSync(path.join(dir, file), filelist);
            } else {
                filelist.push({'dir': dir, 'file': file});
            }
        });

        return filelist;
    },

    /**
     * Comprueba si una ruta de directorios existe y si no existe la crea, pudiendo crear dicha ruta recursivamente o no
     *
     * @param path
     * @param recur
     * @return {string}
     */
    checkAndMake: function (path, recur = true) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, {recursive: recur});
        }

        return path;
    },

    /**:
     * Comprueba si un objeto está vacío
     *
     * @param object
     * @return {boolean}
     */
    isEmpty: function (object) {
        return Object.keys(object).length === 0;
    },

    monthToMonthName: function (month) {
        return globals.MONTHS_NAME[parseInt(month.substring(0, 2), 10) - 1];
    }
};