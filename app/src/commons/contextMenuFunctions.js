const {clipboard} = require('electron').remote;

module.exports = {
    copyText: function (e) {
        function getSelectedText(elem) {
            if (elem.is('input:text')) {
                return elem[0].value.substring(elem[0].selectionStart, elem[0].selectionEnd);
            }
            return null;
        }

        let inputText = $(e).val();
        let selectedText = getSelectedText($(e));

        if (selectedText) {
            clipboard.writeText(selectedText);
        } else {
            clipboard.writeText(inputText);
        }
    },

    pasteText: function (e) {
        $(e).val(clipboard.readText());
    }
}