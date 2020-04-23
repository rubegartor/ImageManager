const fs = require('fs');
const path = require('path');
const parser = require(path.resolve('app/src/provider/parserProvider'));

module.exports = {
    /**
     * Recorre recursivamente los directorios en busca de archivos
     *
     * @param dir
     * @param filelist
     */
    walkSync: function(dir, filelist) {
        let files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function (file) {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                filelist = generalProvider.walkSync(path.join(dir, file), filelist);
            } else {
                parser.parseDateTime(dir, file);
            }
        });
    }
};