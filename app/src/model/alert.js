class Alert {
    ALERT_PANEL = $('#alertPanel');
    static BLUE_ALERT = 'blue';
    static RED_ALERT = 'red';
    static GREEN_ALERT = 'green';
    static YELLOW_ALERT = 'yellow';

    /**
     * Constructor para la alerta.
     *
     * @param title
     * @param body
     * @param color
     * @param timeout (0 = Infinito)
     */
    constructor(title = '', body = '', color = Alert.BLUE_ALERT, timeout = 4500) {
        this.title = title;
        this.body = body;
        this.color = color;
        this.timeout = timeout;
    }

    /**
     * Función para mostrar la alerta en el panel
     */
    spawn() {
        let alertElement = this._getHTML();

        if (this.timeout !== 0) {
            setTimeout(function () {
                let alertPanelElement = $('#alertPanel');
                $(alertElement).fadeOut('slow', function () {
                    if (alertPanelElement.children().length === 0) {
                        alertPanelElement.hide();
                    }

                    alertElement.remove(); //Eliminar el elemento una vez se ha ocultado
                });
            }, this.timeout);
        }

        if (this.ALERT_PANEL.css('display') === 'none') {
            this.ALERT_PANEL.show();
        }

        this.ALERT_PANEL.append(alertElement);
    }

    /**
     * Función para obtener el elemento HTML de la alerta
     * @return {jQuery}
     * @private
     */
    _getHTML() {
        let titleElement = $('<h3>').text(this.title);
        let closeIconElement = $('<i>').addClass('fas fa-times fa-lg ml-15 close-alert');
        let bodyElement = $('<div>').addClass('d-flex align-items-center').text(this.body);

        //Listener del boton de cierre manual de una alerta
        closeIconElement.on('click', function () {
            let alertElement = $(this).parent();
            $(alertElement).fadeOut('slow', function () {
                alertElement.remove();
            });
        });

        return $('<div>')
            .addClass('alert ' + this.color + '-alert')
            .append(titleElement)
            .append(bodyElement)
            .append(closeIconElement);
    }
}

module.exports = Alert;