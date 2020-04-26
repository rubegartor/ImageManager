const {getCurrentWindow} = require('electron').remote;

module.exports = {
    addContextMenu: function (element, subElement, options, funcs) {
        element.on('contextmenu', subElement, (e) => {
            e.preventDefault()

            $('#contextmenu > ul').html('')
            for (let i = 0; i < options.length; i++) {
                this.addMenuOption(options[i])
                this.addClickHandler($(e.currentTarget), '#' + options[i].attr('id'), funcs[i])
            }

            const origin = {
                left: e.pageX,
                top: e.pageY
            }

            this.setPosition($('#contextmenu'), origin)
        })
    },

    addClickHandler: function (clickedElement, menuOptionId, func) {
        $(menuOptionId).on('click', () => {
            func(clickedElement)
            this.toggleMenu($('#contextmenu'), 'hide')
        })
    },

    addMenuOption: (option) => {
        $('#contextmenu > ul').append(option)
    },

    toggleMenu: (menu, command) => {
        if (command === 'show')
            menu.fadeIn('fast');
        else
            menu.fadeOut('fast');
    },

    setPosition: function (menu, pos) {
        let windowWidth = getCurrentWindow().getBounds().width
        let windowHeight = getCurrentWindow().getBounds().height

        if ((pos.top + menu.height()) > windowHeight) {
            pos.top = pos.top - menu.height()
        }

        if ((pos.left + menu.width()) > windowWidth) {
            pos.left = pos.left - menu.width()
        }

        menu.css({'left': pos.left + 'px', 'top': pos.top + 'px'})
        this.toggleMenu(menu, 'show')
    },

    createContextMenus: function () {
        let messageContextMenuOptions = [
            $('<li>').addClass('menu-option').attr('id', 'contextmenu-copyMsgBtn').text('Copiar'),
            $('<li>').addClass('menu-separator'),
            $('<li>').addClass('menu-option').attr('id', 'contextmenu-editMsgBtn').text('Editar mensaje'),
            $('<li>').addClass('menu-option').attr('id', 'contextmenu-removeMsgBtn').text('Eliminar mensaje')
        ]

        let messageContextMenuFuncs = [this.alerta, null, this.alerta, this.alerta]

        this.addContextMenu($('body'), '.main-container', messageContextMenuOptions, messageContextMenuFuncs)
    },

    alerta: function () {
        alert(1);
    }
};