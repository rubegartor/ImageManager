const $ = require('jquery');
const {dialog, getCurrentWindow} = require('electron').remote;
const path = require('path');
const usbDetect = require('usb-detection');
const drivelist = require('drivelist');
const globals = require(path.join(__dirname, '../src/commons/globals'));
const generalProvider = require(path.join(__dirname, '../src/provider/generalProvider'));
const parserProvider = require(path.join(__dirname, '../src/provider/parserProvider'));
const contextMenu = require(path.join(__dirname, '../src/commons/contextMenu'));

let treeView = $('#treeview');

$(function () {
    contextMenu.createContextMenus();
    usbDetect.startMonitoring();
    usbDetect.on('add', (device) => {
        const poll = setInterval(() => {
            drivelist.list().then((drives) => {
                drives.forEach((drive) => {
                    if (drive.isUSB) {
                        const mountPath = drive.mountpoints[0].path;
                        let modal = $('#newDeviceModal');
                        $('#newDeviceModal-usbName').text(drive.description);
                        modal.attr('data-pid', device.productId);
                        modal.show();
                        clearInterval(poll);
                    }
                })
            })
        }, 2000)
    });

    usbDetect.on('remove', function (device) {
        $('.modal[data-pid="' + device.productId + '"]').hide();
    });

    generalProvider.checkAndMake(globals.ARCHIVE_PATH);
    renderTreeview();
});

//TreeView big shit
treeView.on('click', 'li', function (e) {
    $(this).find('ul.treeview-nested').slideToggle('fast');
    $(this).find('.fa-angle-right').toggleClass('animate-caret');
    $(window).trigger('click');
    e.stopPropagation();
}).on('click', '.treeview-month', function () {
    let year = $(this).data('year').toString();
    let month = $(this).data('month').toString();

    let files = generalProvider.walkSync(path.join(globals.ARCHIVE_PATH, year, month));
    let imageContainer = $('#imageContainer');

    imageContainer.html('');

    for (let image of files) {
        let imageElement = $('<img>')
            .addClass('image')
            .attr('src', path.join(image.dir, image.file))
        ;

        imageContainer.append(imageElement);
    }
});

$(window).on('click', function () {
    contextMenu.toggleMenu($('.contextmenu'), 'hide');
});

$('body')
    .on('click', '[data-close="modal"]', function () {
        $('.modal').hide();
    })
    .on('click', '[data-action="loadFiles"]', function () {
        let folderPath = dialog.showOpenDialogSync(getCurrentWindow(), {
            properties: ['openDirectory']
        });

        if (folderPath) {
            let files = generalProvider.walkSync(folderPath[0]);

            if (files.length >= 1) {
                for (let path of files) {
                    parserProvider.parseDateTime(path.dir, path.file);
                }
            }
        }
    })
    .on('click', '[data-action="reloadTreeView"]', function () {
        treeView.html('');
        renderTreeview();
    })
    .on('click', '.image', function (e) {
        let thumbnailSrc = $(e.target).attr('src');

        let newImage = $('<img>')
            .attr('src', thumbnailSrc)
            .addClass('openImage')
        ;

        let openImage = $('#openImage');

        openImage.html('');
        openImage
            .append(newImage)
        ;

        $('.openImage-container').fadeIn('fast');
    })
    .on('click', '.openImage-container', function (e) {
        if (e.target !== e.currentTarget) return;
        $('.openImage-container').fadeOut('fast');
    })
;

/**
 * Función que genera el HTMl del TreeView
 */
function renderTreeview() {
    let treeviewStructure = generalProvider.loadArchive();

    for (let year of Object.keys(treeviewStructure).sort()) {
        let nestedElement = $('<ul>').addClass('treeview-nested');

        for (let months of treeviewStructure[year]) {
            for (let month of months) {
                nestedElement.append(
                    $('<li>')
                        .addClass('treeview-month')
                        .text(generalProvider.monthToMonthName(month))
                        .attr('data-month', month)
                        .attr('data-year', year)
                );
            }
        }

        let treeviewYear = $('<li>')
            .addClass('treeview-year')
            .append($('<span class="treeview-caret"><i class="fas fa-angle-right"></i> ' + year + '</span>'))
            .append(nestedElement)
        ;

        treeView.append(treeviewYear);
    }
}