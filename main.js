const { app, BrowserWindow } = require('electron');
const path = require('path');

app.allowRendererProcessReuse = false;
let win;

function createWindow () {
    win = new BrowserWindow({
        width: 960,
        height: 600,
        'minHeight': 460,
        'minWidth': 720,
        title: 'ImageManager',
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false
        }
    });

    win.setIcon(path.join(__dirname, 'app/assets/icons/icon.png'));
    win.setMenu(null);
    win.loadFile(path.join(__dirname, 'app/templates/index.html'));

    win.webContents.openDevTools();

    win.on('closed', () => {
        win = null
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
