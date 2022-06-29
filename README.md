
# Electron React Typescript Antd 环境搭建

## 前言

- 参考文章： [electron + react + typescript 环境搭建](https://yyccyy.com/2019/11/13/electron-react-typescript-build/)
- 最近打算 Electron React Typescript Antd 结合学习,自己重新整理了下
  - 修复 electron 启动界面加载空白
  - 修复版本差异导致的调用 electron 的 dialog 错误

## 基本环境搭建

### 创建 react + typescript 项目

> yarn create react-app --template typescript

### 安装 react-app-rewired 以及 cross-env

> yarn add react-app-rewired cross-env -D

### 创建 react-app-rewired 配置文件 config-overrides.js 用于扩展 webpack 配置

```javascript
module.exports = (config, env) => {
    // 为了方便使用 electron 以及 node.js 相关的 api
    // 需要将 target 设置为 electron-renderer
    // 设置了 target 之后，原生浏览器的环境将无法运行此 react 项目(因为不支持 node.js 相关的 api)，会抛出 Uncaught ReferenceError: require is not defined 异常
    // 需要在 electron 的环境才能运行(因为支持 node.js 相关的 api)
    // 这一步的操作, 都是为了能与 electron 进行更好的集成
    config.target = 'electron-renderer';
    return config;
};
```

### 安装 electron 环境

> yarn add electron -D

- 这里加 -D 是为了只添加到 package.json 下的 devDependencies
- 如果 electron 存在 dependencies 里面在后续使用 electron-builder 会出现报错情况

### 创建 electron 环境

- 新建 electron 文件夹
  - 新建 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "sourceMap": true,
    "strict": true,
    "outDir": "../build/",
    "rootDir": "../electron/",
    "noEmitOnError": true,
    "typeRoots": [
      "node_modules/@types"
    ]
  }
}
```

- 新建 electron 入库文件 main.ts

```typescript
import {app, BrowserWindow, ipcMain, dialog} from "electron";
import * as path from "path";

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, "preload.js"),
        },
        width: 800,
    });

    /**
     * loadURL 分为两种情况
     *  1.开发环境，指向 react 的开发环境地址
     *  2.生产环境，指向 react build 后的 index.html
     */
    const startUrl =
        process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : path.join(__dirname, 'index.html');
    mainWindow.loadURL(startUrl);


    // Open the DevTools.
    mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    createWindow();

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

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
```

- 新建预加载文件 preload.ts
  - 若是不添加则会出现空白情况

```typescript
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector: string, text: string) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, <string>process.versions[type])
    }
})

```

### 添加相关脚本

- /package.json

```json
{
  "scripts": {
    "prestart": "tsc -p electron",
    "start": "cross-env BROWSER=none react-app-rewired start",
    "build": "react-app-rewired build & tsc -p electron",
    "test": "react-app-rewired test --env=jsdom",
    "eject": "react-scripts eject",
    "start-electron": "cross-env NODE_ENV=development electron .",
    "start-electron-prod": "electron .",
    "build-electron": "electron-builder"
  }
}

```

### 添加 electron 及 node.js 相关代码，用于测试是否集成完毕

- /src/App.css

```css
@import '~antd/dist/antd.css';

.App {
    text-align: center;
}

.App-logo {
    height: 40vmin;
    pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
    .App-logo {
        animation: App-logo-spin infinite 20s linear;
    }
}

.App-header {
    background-color: #282c34;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: calc(10px + 2vmin);
    color: white;
}

.App-link {
    color: #61dafb;
}

@keyframes App-logo-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

```

- /src/App.tsx

```typescript
import React from 'react';
import fs from 'fs';
import {Button} from 'antd';
import './App.css';

const {ipcRenderer} = require('electron')

interface Props {
}

interface State {
    txtFileData: string;
}

export default class App extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            txtFileData: '',
        };
    }

    /**
     * 弹出文件选择框，选择 .txt 文件
     * 将选中的 .txt 内容展示到页面
     */
    public readTxtFileData = async () => {
        // 发送事件给主进程
        ipcRenderer.send('open-file-dialog', '传输给主进程的值');

        // 监听主进程发来的事件
        ipcRenderer.on('open-file-dialog', (event: any, data: Array<string>) => {
            if (!data[0]) return;
            fs.readFile(data[0], 'utf-8', (err, data) => {
                if (err) {
                    console.error(err);
                } else {
                    this.setState({
                        txtFileData: data.replace(/\n|\r\n/g, '<br/>'),
                    });
                }
            });
        })

    };

    public render = (): JSX.Element => {
        return (
            <section>
                <Button type = {"primary"}
        onClick = {this.readTxtFileData} > 读取一个txt文件的内容 < /Button>
            < div
        dangerouslySetInnerHTML = {
        {
            __html: this.state.txtFileData
        }
    }
        />
        < /section>
    )
        ;
    };
}
```

### 运行测试

- 一个命令行窗口跑 react 项目

> yarn start

- 另一个命令行窗口跑 electron 项目

> yarn start-electron

### 项目打包

- 添加 electron-builder 工具

> yarn add electron-builder -D

- 添加脚本以及打包相关配置
  - oneClick 是否启用一键安装
  - allowToChangeInstallationDirectory 是否允许修改安装路径

```json
{
  "build": {
    "appId": "com.example.my-app",
    "productName": "react-electron",
    "extends": null,
    "directories": {
      "output": "build-electron"
    },
    "files": [
      "./build/**/*",
      "./package.json"
    ],
    "win": {
      "icon": "src/asset/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## 开始打包

- 打包 react

> yarn build

- react 打包完成后，可以运行 electron 生产环境查看一下功能是否正常运行

> yarn start-electron-prod

- 打包 electron 项目为安装包，安装包会生成到指定的 build-electron 目录

> yarn build-electron

## Github

[react-electron-antd-demo](https://github.com/zJiaC/react-electron-antd-demo)