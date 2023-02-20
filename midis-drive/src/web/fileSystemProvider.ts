/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import { download, request } from './extension';

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
	name: string;
	type: "file" | "folder" | "unknown";
	ctime: number;
	mtime: number;
	children?: Record<string, {
		type: "file" | "folder" | "unknown",
		name: string
	}>;
};

export class MidisFS implements vscode.FileSystemProvider {
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	_root: number = 0;
	_bigdata: Record<string, Element> = {};

	constructor(root: number, elements: any) {
		this._root = root;
		let children: any = {}
		elements.map((e: any) => {
			let element: Element = this._formatElement(e);
			this._bigdata[element.id] = element;
			children[element.id]={
				type:element.id,
				name:element.name
			};
		});
		this._bigdata[this._root]={
			id:this._root,
			name:"root",
			type:"folder",
			ctime:0,
			mtime:0,
			children
		};
	}

	_formatElement(data: any): Element {
		return {
			id: data.ID,
			name: data.NAME,
			type: data.TYPE,
			ctime: +new Date(data.CREATE_TIME),
			mtime: +new Date(data.UPDATE_TIME)
		};
	}

	_formatType(type: string): vscode.FileType {
		switch (type) {
			case "file":
				return 1;
			case "folder":
				return 2;
			default:
				return 0;
		}
	}

	watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
		console.log(`watch ${uri.path}`);
		throw new Error('Method not implemented. watch');
	}

	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		const { type, ctime, mtime } = await this._uriToElement(uri);
		return {
			type: this._formatType(type),
			ctime,
			mtime,
			size: 0
		};
		throw new Error('Method not implemented. stat'); // disk.folder.get || disk.file.get
	}
	async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		return (await this._getFilesInFolder((await this._uriToElement(uri)).id)).map(element => [element.name, this._formatType(element.type)]);
	}
	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		throw new Error('Method not implemented. createDirectory'); // disk.folder.addsubfolder
	}
	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		return await download((await this._uriToElement(uri)).id);
	}
	writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented. writeFile');  // disk.folder.uploadfile
	}
	delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented. delete'); // disk.folder.deletetree || disk.file.delete
	}
	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented. rename'); // disk.folder.rename || disk.file.rename
	}
	copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented. copy'); // disk.folder.copyto || disk.file.copyto
	}

	async _uriToElement(uri: vscode.Uri): Promise<Element> {
		let path = uri.path.split("/").filter(e => e !== "");
		if (path.length) {
			let pre: Element = this._bigdata[this._root];
			for (let index = 0; index < path.length; index++) {
				const folder = await this._getFilesInFolder( pre.id );
				const find = folder.find(({name})=>{
					return name===path[index];
				});
				if(find){
					switch (find.type) {
						case "file":
							pre=await this._getFile(find.id);
							break;
						case "folder":
							pre=await this._getFolder(find.id);
							break;
					
						default:
							throw new Error("Path not found");
					}
				}else{
					throw new Error("Path not found");
				}
			}
			return pre;
		} else {
			let rootFolder = this._checkIfInBigData(this._root) ?? this._getFolder(this._root);
			return rootFolder;
		}
	}

	async _getFolder(id: number): Promise<Element> {
		let folder = this._checkIfInBigData(id);
		if (!folder) {
			const { res: folderRes, data: folderData } = await request("/disk.folder.get", { id });
			if (folderRes.ok) {
				folder = this._formatElement(folderData.result);
			} else {
				throw new Error(`Error get folder: ${folderRes.status}`);
			}
		}
		this._bigdata[folder.id]=folder;
		return folder;
	}

	async _getFile(id: number): Promise<Element> {
		let file = this._checkIfInBigData(id);
		if (!file) {
			const { res: rootFolderRes, data: rootFolderData } = await request("/disk.file.get", { id });
			if (rootFolderRes.ok) {
				file = this._formatElement(rootFolderData.result);
			} else {
				throw new Error(`Error get folder: ${rootFolderRes.status}`);
			}
		}
		this._bigdata[file.id]=file;
		return file;
	}

	async _getFilesInFolder(id: number): Promise<Element[]> {
		let folder = await this._getFolder(id);
		if(folder.children&&Object.keys(folder.children).length){
			return Promise.all(Object.keys(folder.children).map(async (id: string)=>{
				if(this._bigdata[id]){
					return this._bigdata[id];
				}else{
					if(!folder.children){folder.children={};}
					let type = folder.children[id]?.type;
					switch (type) {
						case "folder":
							return await this._getFolder(+id);
						case "file":
							return await this._getFile(+id);
						default:
							return {
								id:-1,
								name: "Error",
								type: "unknown",
								ctime:0,
								mtime:0
							};
					}
				}
			}));
		}else{
			const { res: rootFolderRes, data: rootFolderData } = await request("/disk.folder.getchildren", { id });
			if (rootFolderRes.ok) {
				const out = rootFolderData.result.map((e: any) => this._formatElement(e));
				out.forEach((e: Element)=>{
					this._bigdata[e.id]=e;
					if(!folder.children) {
						folder.children={};
					}
					folder.children[e.id]={
						type:e.type,
						name:e.name
					};
				});
				this._bigdata[folder.id]=folder;
				return out;
			} else {
				throw new Error(`Error get files list: ${rootFolderRes.status}`);
			}
		}
		
	}

	_checkIfInBigData(id: number) {
		return this._bigdata[id];
	}

	_thisIsFileOrFolder(uri: vscode.Uri): "file" | "folder" {
		return "file";
	}
}