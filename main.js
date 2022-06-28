const { app, BrowserWindow, ipcMain,dialog } = require('electron');
const path = require('path');
const url = require('url');


let mainWindow = null;
const createWindow = () => {
    let mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    /**
     * loadURL 分为两种情况
     *  1.开发环境，指向 react 的开发环境地址
     *  2.生产环境，指向 react build 后的 index.html
     */
    const startUrl =
        process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : path.join(__dirname, '/build/index.html');
    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.webContents.openDevTools();
};


app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

// 监听渲染程序发来的事件
ipcMain.on('open-file-dialog', (event, data) => {
    dialog
        .showOpenDialog({
            title: '请选择 .txt 文件',
            filters: [
                {
                    name: 'txt',
                    extensions: ['txt'],
                },
            ],
        })
        .then((res) => {
            event.sender.send('open-file-dialog', res.filePaths);
        })
        .catch(console.log);
});