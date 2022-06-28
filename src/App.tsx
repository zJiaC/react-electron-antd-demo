import React from 'react';
import fs from 'fs';
import { Button } from 'antd';
import './App.css';
const { ipcRenderer} = require('electron')

interface Props {}

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
    ipcRenderer.on('open-file-dialog', (event : any, data : Array<string>) => {
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
          <Button type={"primary"} onClick={this.readTxtFileData}>读取一个txt文件的内容</Button>
          <div dangerouslySetInnerHTML={{ __html: this.state.txtFileData }} />
        </section>
    );
  };
}