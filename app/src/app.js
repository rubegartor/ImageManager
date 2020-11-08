require('jstree/dist/jstree');
const $ = require('jquery');
const {dialog, getCurrentWindow} = require('electron').remote;
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('ffmpeg-static');
const genThumbnail = require('simple-thumbnail');
const usbDetect = require('usb-detection');
const globals = require(path.join(__dirname, '../src/commons/globals'));
const commons = require(path.join(__dirname, '../src/commons/commons'));
const Store = require(path.join(__dirname, '../src/model/store'));
const Alert = require(path.join(__dirname, '../src/model/alert'));
const Image = require(path.join(__dirname, '../src/model/image'));
const usbProvider = require(path.join(__dirname, '../src/provider/usbProvider'));
const contextMenu = require(path.join(__dirname, '../src/commons/contextMenu/contextMenu'));
const errors = require(path.join(__dirname, '../src/commons/error/errors'));
const dir2Json = require('dir2Json');

let leftMenuTreeView = $('#treeview');
let jsTreeViewElement = $('#jsTreeView');

//LOAD CONFIGURATION DATA
globals.CONFIG = new Store();
globals.CONFIG.parseData().then(function () {
    loadMain();
}).catch(function (err) {
    process.exit(1);
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

    console.log('=== DEBUG INFO ===');
    console.log('OS Platform: ' + os.platform());
    console.log('User UID: ' + os.userInfo().uid);
    console.log('User homedir: ' + os.homedir())
    console.log('=== END DEBUG INFO ===');

    $(function () {
        setVersion();
        contextMenu.createContextMenus();
        usbDetect.startMonitoring();

        const audio = new Audio("/home/ruben/Escritorio/file_example_MP3_1MG.mp3");
        audio.play();

        usbDetect.on('add', (device) => {
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

        let files = commons.walkSync(path.join(globals.CONFIG.get('archive'), year, month));
        //Se comprueba que los archivos que se leen del directorio son archivos validos
        let filteredFiles = files.filter(file => Image.VALID_EXTENSIONS.includes(commons.getExtension(file.file)));
        let imageContainer = $('#imageContainer');

        //Se eliminan las imagenes para liberar el espacio que ocupaban en la memoria.
        for (let imageObject of imageContainer.children()) {
            //TODO: Eliminar las miniaturas de los videos generadas sobre /tmp
            imageObject.remove();
        }

        if (filteredFiles.length > 0) {
            for (let imageSrc of filteredFiles) {
                //Si el la extension del archivo pertenece a la de un video aceptado por la app
                if(Image.VIDEO_EXTENSIONS.includes(commons.getExtension(imageSrc.file))) {
                    let uuid = commons.generateUUID();
                    let filenameWithoutExtension = commons.getFilenameWithoutExtension(imageSrc.file);
                    let THUMBNAIL_EXTENSION = 'png';

                    //Se crea el directorio unico sobre /tmp en el que se alamacenará temporalmente la miniatura del video
                    commons.checkAndMake(path.join(os.tmpdir(), uuid));
                    //Se genera la miniatura del video
                    genThumbnail(path.join(imageSrc.dir, imageSrc.file), path.join(os.tmpdir(), uuid, filenameWithoutExtension + '.' + THUMBNAIL_EXTENSION), '150x80', {path: ffmpeg.path})
                        .then(() => {
                            let imageElement = new Image(path.join(os.tmpdir(), uuid, filenameWithoutExtension + '.' + THUMBNAIL_EXTENSION)).toHTML();
                            imageContainer.append(imageElement);
                        })
                        .catch(err => console.error(err));
                } else { //Si el archivo pertene a una imagen
                    let imageElement = new Image(path.join(imageSrc.dir, imageSrc.file)).toHTML();
                    imageContainer.append(imageElement);
                }
            }
            $('#topTitle').text(year + ' - ' + commons.monthToMonthName(month));
            $('[data-action="deleteImage"]').css('display', 'inline');
            $('#noimages').hide();
        } else {
            $('#noimages').show();
            $('[data-action="deleteImage"]').hide();
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
            /**
             * Función para actualizar el progreso de la importación de imágenes
             *
             * @param progressBar
             * @param progressVal
             * @param files
             * @param importImagesErrors
             * @private
             */
            function _updateProgressBar(progressBar, progressVal, files, importImagesErrors) {
                progressBar.val(progressBar.val() + 1);
                if (progressBar.val() === files.length) {
                    progressBar.removeClass('progress-orange').addClass('progress-green');
                    $('#countingLoadedFilesContinueBtn').show();

                    _onFinished(importImagesErrors);
                    if(importImagesErrors.length > 0) {
                        progressVal.text('Se han importado ' + (parseInt(progressBar.val()) - importImagesErrors.length) + ' de ' + files.length + ' archivos. (' + importImagesErrors.length + ' imágenes no se han podido importar)');
                    }
                } else{
                    progressVal.text('Se han importado ' + progressBar.val() + ' de ' + files.length + ' archivos');
                }
            }

            /**
             * Función que se ejecuta al finalizar la importación de las imágenes
             *
             * @param importImagesErrors
             * @private
             */
            function _onFinished(importImagesErrors) {
                //Si ha ocurrido algún error al importar alguna imágen
                if(importImagesErrors.length > 0) {
                    $('[data-action="viewImagesErrors"]').removeClass('d-none');
                }
            }

            if (globals.CONFIG.get('archive') !== undefined) {
                $(window).trigger('modalShow');
                let folderPath = dialog.showOpenDialogSync(getCurrentWindow(), {
                    properties: ['openDirectory']
                });

                if (folderPath && !folderPath[0].includes(globals.CONFIG.get('archive'))) {
                    let files = commons.walkSync(folderPath[0]).filter(file => Image.VALID_EXTENSIONS.includes(commons.getExtension(file.file)));
                    let progressBar = $('#countingLoadedFilesProgress');
                    let progressModal = $('#countingLoadedFilesModal');
                    let progressVal = $('#countingLoadedFilesVal');

                    if (files.length >= 1) {
                        let importImagesErrors = [];
                        progressBar.val(0);
                        progressBar.attr('max', files.length);
                        progressModal.show();
                        for (let absPath of files) {
                            setTimeout(function () {
                                let image = new Image(path.join(absPath.dir, absPath.file));
                                image.parseDateTime().then(function () {
                                    _updateProgressBar(progressBar, progressVal, files, importImagesErrors);
                                }).catch(function (err) {
                                    importImagesErrors.push(err);
                                    _updateProgressBar(progressBar, progressVal, files, importImagesErrors);
                                });
                            }, files.indexOf(absPath) * 10); //Arreglo para que funcione el Timeout en el foreach (JS Shit OwO)
                        }
                    }
                } else {
                    if (folderPath) new Alert('Advertencia', 'No se pueden importar imágenes desde el archivo principal de imágenes.', Alert.YELLOW_ALERT).spawn();
                }
            }
        })
        .on('click', '[data-action="reloadTreeView"]', function () {
            if (globals.CONFIG.get('archive') !== undefined) {
                renderLeftMenuTreeview();
            }
        })
        .on('click', '.image', function (e) {
            $(window).trigger('imageOpen');

            let openImage = $('#openImage');
            openImage.html('');

            let image = new Image($(e.target).attr('src'));

            for (let elem of image.previsualize()) {
                openImage.append(elem);
            }

            $('.openImage-container').fadeIn('fast');
        })
        //Evento para navegar entre las imágenes (Previsualizar anterior)
        .on('click', '[data-action="showPrevImage"]', function () {
            let previewedImage = $('.openImage');
            let prevImage = $('.image[src="' + previewedImage.attr('src') + '"]').prev();

            if (prevImage.length > 0) {
                previewedImage.removeAttr('src').attr('src', prevImage.attr('src'));
            }
        })
        //Evento para navegar entre las imágenes (Previsualizar siguiente)
        .on('click', '[data-action="showNextImage"]', function () {
            let previewedImage = $('.openImage');
            let nextImage = $('.image[src="' + previewedImage.attr('src') + '"]').next();

            if (nextImage.length > 0) {
                previewedImage.removeAttr('src').attr('src', nextImage.attr('src'));
            }
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

                    new Alert('Configuración', 'Se ha guardado la nueva ruta.', Alert.GREEN_ALERT).spawn();
                } else {
                    new Alert('Error', 'La ruta especificada no es válida.', Alert.YELLOW_ALERT).spawn();
                }
            }
        })
        .on('click', '[data-action="processUSBFilesBtn"]', function() {
            //TODO: Desarrollar la importacion de imagenes de un dispositivo USB autodetectado
        })
    ;
}

/**
 * Función para cargar el TreeView de los directorios de los dispositivos conectados por USB
 * @param mountPath
 */
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
    let treeviewStructure = commons.loadArchive();

    for (let year of Object.keys(treeviewStructure).sort()) {
        let nestedElement = $('<ul>').addClass('treeview-nested');

        for (let months of treeviewStructure[year]) {
            for (let month of months) {
                nestedElement.append(
                    $('<li>')
                        .addClass('treeview-month')
                        .text(commons.monthToMonthName(month))
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