/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import { request } from './extension';

// export class File implements vscode.FileStat {

// 	type: vscode.FileType;
// 	ctime: number;
// 	mtime: number;
// 	size: number;

// 	name: string;
// 	data?: Uint8Array;

// 	constructor(name: string) {
// 		this.type = vscode.FileType.File;
// 		this.ctime = Date.now();
// 		this.mtime = Date.now();
// 		this.size = 0;
// 		this.name = name;
// 	}
// }

// export class Directory implements vscode.FileStat {

// 	type: vscode.FileType;
// 	ctime: number;
// 	mtime: number;
// 	size: number;

// 	name: string;
// 	entries: Map<string, File | Directory>;

// 	constructor(name: string, entries) {
// 		this.type = vscode.FileType.Directory;
// 		this.ctime = Date.now();
// 		this.mtime = Date.now();
// 		this.size = 0;
// 		this.name = name;
// 		this.entries = new Map();
// 	}
// }

// export type Entry = File | Directory;

// export class MidisFS implements vscode.FileSystemProvider {

//     root = new Directory('');

//     constructor(name: string) {
//         this.root = new Directory(name);
//     }


// 	// --- manage file metadata

// 	stat(uri: vscode.Uri): vscode.FileStat {
//         vscode.window.showInformationMessage("Stat: "+uri);
// 		return {
//             type: 1,
//             ctime: 0,
//             mtime: 0,
//             size: 0
//         };
// 	}

// 	async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
// 		const result: [string, vscode.FileType][] = [];
// 		//const {res: folderRes, data: folderData} = await request("/disk.folder.get", {id: rootData.rootId});
//         if(true){
            
//             vscode.window.showInformationMessage("Read dir: "+uri.fsPath);
//             return result;
//         }else{
//             throw vscode.FileSystemError.FileNotFound();
//         }
// 	}

// 	// --- manage file contents

// 	readFile(uri: vscode.Uri): Uint8Array {
// 		throw vscode.FileSystemError.FileNotFound();
// 	}

// 	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        
// 	}

// 	// --- manage files/folders

// 	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {

// 	}

// 	delete(uri: vscode.Uri): void {
		
// 	}

// 	createDirectory(uri: vscode.Uri): void {
// 		vscode.window.showInformationMessage("Create dir: "+this.root.name);
// 	}

	

	

// 	// --- manage file events

// 	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
// 	private _bufferedEvents: vscode.FileChangeEvent[] = [];
// 	private _fireSoonHandle?: NodeJS.Timer;

// 	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

// 	watch(_resource: vscode.Uri): vscode.Disposable {
// 		// ignore, fires for all changes...
// 		return new vscode.Disposable(() => { });
// 	}

// 	private _fireSoon(...events: vscode.FileChangeEvent[]): void {
// 		this._bufferedEvents.push(...events);

// 		if (this._fireSoonHandle) {
// 			clearTimeout(this._fireSoonHandle);
// 		}

// 		this._fireSoonHandle = setTimeout(() => {
// 			this._emitter.fire(this._bufferedEvents);
// 			this._bufferedEvents.length = 0;
// 		}, 5);
// 	}
// }


export type Element = {
    id: number;
    filename: string;
    type: "file" | "folder";
    ctime: number;
    mtime: number;
    data?: string; 
};

export class MidisFS implements vscode.FileSystemProvider {
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    _root: number = 0;
    _bigdata: any = [];

    constructor(root: number, children: any) {
        this._root=root;
        this._bigdata=children;
    }

    watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
        throw new Error('Method not implemented.');
    }
    
    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        throw new Error('Method not implemented.'); // disk.folder.get || disk.file.get
    }
    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        throw new Error('Method not implemented.'); // disk.folder.getchildren
    }
    createDirectory(uri: vscode.Uri): void | Thenable<void> {
        throw new Error('Method not implemented.'); // disk.folder.addsubfolder
    }
    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        throw new Error('Method not implemented.'); // ???
    }
    writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.');  // disk.folder.uploadfile
    }
    delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.'); // disk.folder.deletetree || disk.file.delete
    }
    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.'); // disk.folder.rename || disk.file.rename
    }
    copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.'); // disk.folder.copyto || disk.file.copyto
    }

    _findFolderByUri(uri: vscode.Uri) {

    }

    _thisIsFileOrFolder(uri: vscode.Uri): "file" | "folder" {
        return "file";
    }
}