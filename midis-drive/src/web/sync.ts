import * as vscode from 'vscode';
import { CreateExtensionList, ExtensionInformation, InstallExtensions } from "./syncer/extensions";
import { MidisFS } from './fileSystemProvider';

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
      if(this.update() && await this.toCloud()) {
        this.toCloud().then((v)=>{
          if(v) { clearInterval(timer); }
        });
      }
    }, 10000);
  }

  update(): boolean {
    const extensions = CreateExtensionList();
    const isEq: boolean = this.deepCompare({extensions}, {extensions:this.extensions});
    this.extensions=extensions;
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
        const {extensions} = this._formatObject(data);
        this.extensions=extensions;
        await InstallExtensions(extensions,["midis-drive"]);
        resolve(true);
      }).catch((_)=>{
        resolve(false); 
      });
    });
  }

  private _formatObject(data: Uint8Array) {
    const {extensions}: {
      extensions: ExtensionInformation[];
    } = JSON.parse(this.dec.decode(data));
    return {
      extensions
    };
  }

  private _formatString() {
    return this.enc.encode(JSON.stringify({
      extensions:this.extensions
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

  fs: MidisFS;
}