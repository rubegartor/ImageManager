const fs = require('fs');
const errors = require(path.join(__dirname, 'error/errors'));
const globals = require(path.join(__dirname, 'globals'));

module.exports = {
    getExtension: function (file) {
        let result = undefined;

        try {
            result = file.split('.').slice(-1)[0].toLowerCase();
        } catch (err) {
            throw err;
        }

        return result;
    },

    getFilenameWithoutExtension: function(file) {
        let result = undefined;

        try {
            result = file.split('.')[0];
        } catch (err) {
            throw err;
        }

        return result;
    },

    isEmpty: function (object) {
        return Object.keys(object).length === 0;
    },

    monthToMonthName: function (month) {
        return globals.MONTHS_NAME[parseInt(month.substring(0, 2), 10) - 1];
    },

    checkAndMake: function (dirPath, recur = true) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, {recursive: recur});
        }

        return dirPath;
    },

    walkSync: function (dir, filelist) {
        let files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function (file) {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                filelist = commons.walkSync(path.join(dir, file), filelist);
            } else {
                filelist.push({'dir': dir, 'file': file});
            }
        });

        return filelist;
    },

    loadArchive: function (archive = globals.CONFIG.get('archive')) {
        let structure = {};

        for (let year of this.getDirectories(archive)) {
            let month = this.getDirectories(path.join(archive, year));

            if (!structure[year])
                structure[year] = [];

            structure[year].push(month);
        }

        return structure;
    },

    getDirectories: function (path) {
        try {
            return fs.readdirSync(path).filter(function (file) {
                return fs.statSync(path + '/' + file).isDirectory();
            });
        } catch (e) {
            return new errors.fsError();
        }
    },

    generateUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}