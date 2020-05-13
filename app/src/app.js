require('jstree/dist/jstree');
const $ = require('jquery');
const {dialog, getCurrentWindow} = require('electron').remote;
const path = require('path');
const fs = require('fs');
const os = require('os');
const usbDetect = require('usb-detection');
const Store = require(path.join(__dirname, '../src/provider/storeProvider'));
const globals = require(path.join(__dirname, '../src/commons/globals'));
const generalProvider = require(path.join(__dirname, '../src/provider/generalProvider'));
const parserProvider = require(path.join(__dirname, '../src/provider/parserProvider'));
const usbProvider = require(path.join(__dirname, '../src/provider/usbProvider'));
const contextMenu = require(path.join(__dirname, '../src/commons/contextMenu'));
const errors = require(path.join(__dirname, '../src/commons/error/errors'));
const Alert = require(path.join(__dirname, '../src/model/alert'));
const dir2Json = require('dir2Json');

let leftMenuTreeView = $('#treeview');
let jsTreeViewElement = $('#jsTreeView');

//LOAD CONFIGURATION DATA
globals.CONFIG = new Store();
globals.CONFIG.parseData().then(function () {
    loadMain();
}).catch(function (err) {

});

function loadMain() {
    if (globals.CONFIG.get('archive') !== undefined) {
        $('#showConfigBtnAlertIcon').hide();
        $('#archivePathConfig').val(globals.CONFIG.get('archive'));
        renderLeftMenuTreeview();
    } else {
        new Alert('Configuración', 'Se necesita configurar la "Ruta del archivo de imágenes"', Alert.BLUE_ALERT, 10000).spawn();
        $('#archivePathConfigAlertIcon').show();
    }

    if (globals.CONFIG.get('optimizeImageMemory')) {
        let element = $('#optimizeImageMemoryConfig');
        element.next().trigger('click');
    }

    if (globals.CONFIG.get('selectChildrenNodes')) {
        let element = $('#selectChildrenNodesConfig');
        element.next().trigger('click');
    }

    console.log('=== DEBUG INFO ===');
    console.log('OS Platform: ' + os.platform());
    console.log('User UID: ' + os.userInfo().uid);
    console.log('User homedir: ' + os.homedir())
    console.log('=== END DEBUG INFO ===');

    $(function () {
        setVersion();
        contextMenu.createContextMenus();
        usbDetect.startMonitoring();

        usbDetect.on('add', (device) => {
            console.log(device);
            if (!globals.DEVICES_PIDS.some(dev => dev.pid === device.productId)) {
                globals.LOOP_BREAK = false;
                globals.DEVICES_PIDS.push({'pid': device.productId, 'mountpoint': undefined});

                let detectedUSB = usbProvider.checkUSBDevice(device);

                detectedUSB.then((res) => {
                    if (!globals.DEVICES_PIDS.some(dev => dev.mountpoint === res)) {
                        let deviceIndex = globals.DEVICES_PIDS.findIndex(dev => dev.pid === device.productId);
                        globals.DEVICES_PIDS[deviceIndex].mountpoint = res;

                        let modal = $('#newDeviceModal');
                        let usbTreeViewModal = $('#usbTreeViewModal');
                        let modalScanUsbBtn = modal.find('[data-action="scanUSBBtn"]');

                        let deviceDescription = device.manufacturer ? device.deviceName + ' - ' + device.manufacturer : device.deviceName;

                        $('#newDeviceModal-usbName').text(deviceDescription);
                        modal.attr('data-pid', device.productId);
                        modalScanUsbBtn.on('click', function () {
                            modal.hide();
                            loadUSBTreeDir(res);
                            usbTreeViewModal.attr('data-pid', device.productId);
                            usbTreeViewModal.show();

                            modalScanUsbBtn.off('click');
                        });

                        modal.show();
                        $(window).trigger('modalShow');
                    }
                }).catch((err) => {
                    if (!(err instanceof errors.fsError)) {
                        new Alert('Error', err.message, Alert.RED_ALERT).spawn();
                    }
                })
            }
        });

        usbDetect.on('remove', function (device) {
            if (globals.DEVICES_PIDS.some(dev => dev.pid === device.productId)) {
                globals.DEVICES_PIDS.splice(globals.DEVICES_PIDS.findIndex(dev => dev.pid === device.productId), 1);
                globals.LOOP_BREAK = true;
                $('#jsTreeView').empty();
                $('.loader-icon').show();
                $('.postLoadingContent-icon').hide();
            }

            $('.modal[data-pid="' + device.productId + '"]').hide();
        });
    });

    //leftMenuTreeView big shit
    leftMenuTreeView.on('click', 'li', function (e) {
        $(this).find('ul.treeview-nested').slideToggle('fast');
        $(this).find('.fa-angle-right').toggleClass('animate-caret');
        $(window).trigger('click');
        e.stopPropagation();
    }).on('click', '.treeview-month', function () {
        $('.treeview-month').removeClass('treeview-selected');
        $('.treeview-nested').prev().removeClass('treeview-selected');
        $(this).addClass('treeview-selected');
        $(this).parent().prev().addClass('treeview-selected');
        let year = $(this).data('year').toString();
        let month = $(this).data('month').toString();

        let files = generalProvider.walkSync(path.join(globals.CONFIG.get('archive'), year, month));
        let imageContainer = $('#imageContainer');

        //Se eliminan las imagenes para liberar el espacio que ocupaban en la memoria.
        for (let imageObject of imageContainer.children()) {
            imageObject.remove();
        }

        if (files.length > 0) {
            for (let image of files) {
                let imageElement = $('<img>')
                    .addClass('image')
                    .attr('src', path.join(image.dir, image.file))
                ;

                imageContainer.append(imageElement);
            }
            $('#topTitle').text(year + ' - ' + generalProvider.monthToMonthName(month));
            $('#noimages').hide();
        } else {
            $('#noimages').show();
        }
    });

    $(window)
        .on('click', function () {
            contextMenu.toggleMenu($('.contextmenu'), 'hide');
        })
        //Estos eventos se lanzan cuando se necesite ocultar el sidebar derecho
        .on('modalShow imageOpen', function () {
            $('#rightSidebar').hide();
        })
    ;

    $('body')
        .on('click', '[data-close="modal"]', function () {
            $(window).trigger('modalShow');
            $('.modal').fadeOut('fast');
        })
        .on('click', '[data-action="loadFiles"]', function () {
            if (globals.CONFIG.get('archive') !== undefined) {
                $(window).trigger('modalShow');
                let folderPath = dialog.showOpenDialogSync(getCurrentWindow(), {
                    properties: ['openDirectory']
                });

                if (folderPath && folderPath[0] !== globals.CONFIG.get('archive')) {
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
            }
        })
        .on('click', '[data-action="reloadTreeView"]', function () {
            if(globals.CONFIG.get('archieve') !== undefined) {
                renderLeftMenuTreeview();
            }
        })
        .on('click', '.image', function (e) {
            $(window).trigger('imageOpen');
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
            $(window).trigger('modalShow');
            renderLeftMenuTreeview();
            $('.modal').fadeOut('fast');
        })
        .on('click', '[data-action="openRightSidebar"]', function () {
            $('#rightSidebar > div').show();
            $('#rightSidebar').animate({width: 'toggle'}, 350);
        })
        .on('click', '[data-action="closeRightSidebar"]', function () {
            $('#rightSidebar > div').hide();
            $('#rightSidebar').animate({width: 'hide'}, 350);
        })
        .on('click', '[data-action="showConfig"]', function () {
            $('#rightSidebarConfig').toggle('fast');
        })
        .on('change', '#optimizeImageMemoryConfig', function () {
            $(this).is(':checked') ? globals.CONFIG.set('optimizeImageMemory', true) : globals.CONFIG.set('optimizeImageMemory', false);
            globals.CONFIG.updateConfig();
        })
        .on('change', '#selectChildrenNodesConfig', function () {
            $(this).is(':checked') ? globals.CONFIG.set('selectChildrenNodes', true) : globals.CONFIG.set('selectChildrenNodes', false);
            globals.CONFIG.updateConfig();
        })
        .on('click', '#archivePathConfigBtn', function () {
            let folderPath = dialog.showOpenDialogSync(getCurrentWindow(), {
                properties: ['openDirectory']
            });

            folderPath = folderPath ? folderPath[0] : folderPath;

            if (folderPath) {
                if (fs.existsSync(folderPath)) {
                    globals.CONFIG.set('archive', folderPath);
                    globals.CONFIG.updateConfig();

                    $('#archivePathConfig').val(folderPath);
                    $('#archivePathConfigAlertIcon').hide();
                    $('#showConfigBtnAlertIcon').hide();

                    renderLeftMenuTreeview();
                } else {
                    new Alert('Error', 'La ruta especificada no es válida.', Alert.YELLOW_ALERT).spawn();
                }
            }
        })
    ;
}

function loadUSBTreeDir(mountPath) {
    dir2Json(mountPath).then(function (jsonTree) {
        jsTreeViewElement.jstree("destroy").empty();
        jsTreeViewElement.jstree({
            core: {
                'themes': {
                    'name': 'proton',
                    'responsive': true
                },
                'data': [
                    jsonTree
                ]
            },
            checkbox: {
                tie_selection: false,
                three_state: globals.CONFIG.get('selectChildrenNodes'),
            },
            "plugins": ["checkbox"],
        });

        $('.loader-icon').hide();
        $('.postLoadingContent-icon').show();
    });
}

/**
 * Función que genera el HTMl del TreeView
 */
function renderLeftMenuTreeview() {
    leftMenuTreeView.html('');
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

        leftMenuTreeView.append(treeviewYear);
    }
}

/**
 * Función que establece la versión del programa en la UI
 */
function setVersion() {
    $('#version').text('ImageManager | ' + globals.VERSION);
}