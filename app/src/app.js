const $ = require('jquery');
const {dialog, getCurrentWindow} = require('electron').remote;
const path = require('path');
const usbDetect = require('usb-detection');
const drivelist = require('drivelist');
require('jstree/dist/jstree');
const globals = require(path.join(__dirname, '../src/commons/globals'));
const generalProvider = require(path.join(__dirname, '../src/provider/generalProvider'));
const parserProvider = require(path.join(__dirname, '../src/provider/parserProvider'));
const contextMenu = require(path.join(__dirname, '../src/commons/contextMenu'));
const dir2Json = require('dir2Json');

let treeView = $('#treeview');

function loadUSBTreeDir(mountPath) {
    dir2Json(mountPath).then(function (tree) {
        $('#jsTreeView').jstree({
            core: {
                'themes': {
                    'name': 'proton',
                    'responsive': true
                },
                'data': [
                    tree
                ]
            },
            checkbox: {
                tie_selection: false,
                three_state: false,
            },
            "plugins": ["checkbox"],
        })
    });
}

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
                        let usbTreeViewModal = $('#usbTreeViewModal');
                        let modalScanUsbBtn = modal.find('[data-action="scanUSBBtn"]');

                        $('#newDeviceModal-usbName').text(drive.description);
                        modal.attr('data-pid', device.productId);
                        modalScanUsbBtn.on('click', function () {
                            modal.hide();
                            loadUSBTreeDir(mountPath);
                            usbTreeViewModal.attr('data-pid', device.productId);
                            usbTreeViewModal.show();
                        });

                        modal.show();
                        clearInterval(poll);
                    } else {
                        console.log(drive);
                    }
                })
            })
        }, 2000);
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
        $('.modal').fadeOut('fast');
    })
    .on('click', '[data-action="loadFiles"]', function () {
        let folderPath = dialog.showOpenDialogSync(getCurrentWindow(), {
            properties: ['openDirectory']
        });

        if (folderPath) {
            let files = generalProvider.walkSync(folderPath[0]);
            let progressBar = $('#countingLoadedFilesProgress');
            let progressModal = $('#countingLoadedFilesModal');
            let progressVal = $('#countingLoadedFilesVal');

            if (files.length >= 1) {
                progressBar.val(0);
                progressBar.attr('max', files.length);
                progressModal.show();
                for (let path of files) {
                    setTimeout(function () {
                        parserProvider.parseDateTime(path.dir, path.file);
                        progressBar.val(progressBar.val() + 1);
                        if (progressBar.val() === files.length) {
                            progressBar.removeClass('progress-orange').addClass('progress-green');
                            $('#countingLoadedFilesContinueBtn').show();
                        }
                        progressVal.text('Se han importado ' + progressBar.val() + ' de ' + files.length + ' archivos');
                    }, files.indexOf(path) * 10); //Arreglo para que funcione el Timeout en el foreach (JS Shit OwO)
                }
            }
        }

        setTimeout(function () {
            treeView.html('');
            renderTreeview();
        }, 1000);
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
    .on('click', '#countingLoadedFilesContinueBtn', function () {
        $('.modal').fadeOut('fast');
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