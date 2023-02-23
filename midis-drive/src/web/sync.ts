import * as vscode from 'vscode';
import { CreateExtensionList, ExtensionInformation, InstallExtensions } from "./syncer/extensions";
import { MidisFS } from './fileSystemProvider';
import { getSettings, writeSettings } from './syncer/settings';

export class Syncer {

  private syncJson = vscode.Uri.parse("midisfs:/.sync.json");
  
  private enc = new TextEncoder();
  private dec = new TextDecoder();

  constructor(fs: MidisFS, data: {
    extensions?: ExtensionInformation[];
  } = {}) {
    let {extensions} = data;
    if(extensions) { this.extensions=extensions; }
    this.fs = fs;  
  } 

  async init(status: vscode.StatusBarItem) {
    await this.fromCloud();
    status.tooltip=`Last sync: ${this.lastSync}`;
    const timer = setInterval(async ()=>{
      if(!await this.update()) {
        this.lastSync=new Date().toLocaleTimeString();
        this.toCloud().then((v)=>{
          if(v) {
            status.tooltip=`Last sync: ${this.lastSync}`;
          } else {
            status.tooltip=`Sync error`;
            clearInterval(timer);
          }
        });
      }
    }, 10000);
  }

  async update(): Promise<boolean> {
    const settings = JSON.parse(this.dec.decode(await getSettings()));
    const extensions = CreateExtensionList();
    const isEq: boolean = JSON.stringify({extensions, settings}) === JSON.stringify({extensions:this.extensions, settings:this.settings});
    this.extensions=extensions;
    this.settings=settings;
    return isEq;
  }

  toCloud() {
    return new Promise<boolean>((resolve, _)=>{
      this.fs.writeFile(this.syncJson, this._formatString(), {create:true, overwrite: true}).then((_)=>{
        resolve(true);
      }).catch((_)=>{
        resolve(false);
      });
    });
  }

  fromCloud() {
    return new Promise<boolean>((resolve, _)=>{
      this.fs.readFile(this.syncJson).then(async (data)=>{
        const {extensions, settings, lastSync} = this._formatObject(data);
        this.extensions=extensions;
        this.settings=settings;
        this.lastSync=lastSync;

        writeSettings(this.enc.encode(JSON.stringify(this.settings, null, 2)));
        // write settings
        Object.keys(this.settings).forEach(key=>{
          vscode.workspace.getConfiguration().update(key, this.settings[key]);
        });

        await InstallExtensions(extensions,["midis-drive"]);
        resolve(true);
      }).catch((_)=>{
        resolve(false); 
      });
    });
  }

  private _formatObject(data: Uint8Array) {
    const {extensions, settings, lastSync}: {
      extensions: ExtensionInformation[];
      settings: any;
      lastSync: string;
    } = JSON.parse(this.dec.decode(data));
    return {
      extensions, 
      settings,
      lastSync
    };
  }

  private _formatString() {
    return this.enc.encode(JSON.stringify({
      extensions:this.extensions,
      settings:this.settings,
      lastSync:this.lastSync
    }));
  }

  lastSync: string = "";
  extensions: ExtensionInformation[] = [];
  settings: any = {};

  fs: MidisFS;
}