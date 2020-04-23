const $ = require('jquery');
const {dialog, getCurrentWindow} = require('electron').remote;
const path = require('path');
const generalProvider = require(path.resolve('app/src/provider/generalProvider'));


//TreeView big shit
$('#treeview').on('click', 'li', function(e) {
    $(this).find('ul.treeview-nested').slideToggle('fast');
    $(this).find('.fa-angle-right').toggleClass('animate-caret');
    e.stopPropagation();
});

$('body')
    .on('click', '[data-action="loadFiles"]', function () {
    let path = dialog.showOpenDialogSync(getCurrentWindow(), {
        properties: ['openDirectory']
    });

    if (path)
        generalProvider.walkSync(path[0]);
    });
