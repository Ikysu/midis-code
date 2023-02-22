import * as vscode from 'vscode';
import { CreateExtensionList, ExtensionInformation, InstallExtensions } from "./syncer/extensions";
import { MidisFS } from './fileSystemProvider';
import { getSettings } from './syncer/settings';

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

  async init() {
    await this.fromCloud();
    const timer = setInterval(async ()=>{
      if(await this.update() && await this.toCloud()) {
        this.toCloud().then((v)=>{
          if(v) { clearInterval(timer); }
        });
      }
    }, 10000);
  }

  async update(): Promise<boolean> {
    const settings = JSON.parse(this.dec.decode(await getSettings()));
    const extensions = CreateExtensionList();
    const isEq: boolean = this.deepCompare({extensions, settings}, {extensions:this.extensions, settings:this.settings});
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
        const {extensions, settings} = this._formatObject(data);
        this.extensions=extensions;
        this.settings=settings;

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
    const {extensions, settings}: {
      extensions: ExtensionInformation[];
      settings: any;
    } = JSON.parse(this.dec.decode(data));
    return {
      extensions, 
      settings
    };
  }

  private _formatString() {
    return this.enc.encode(JSON.stringify({
      extensions:this.extensions,
      settings:this.settings
    }));
  }

  private deepCompare: any = (a: any, b: any) => {
    if (Object.prototype.toString.call(a) === Object.prototype.toString.call(b)){
      if (Object.prototype.toString.call(a) === '[object Object]' || Object.prototype.toString.call(a) === '[object Array]' ){
        if (Object.keys(a).length !== Object.keys(b).length ){
          return false;
        }
        return (Object.keys(a).every((key: any)=>{
          return this.deepCompare(a[key],b[key]);
        }));
      }
      return (a===b);
    }
    return false;
  };

  extensions: ExtensionInformation[] = [];
  settings: any = {};

  fs: MidisFS;
}