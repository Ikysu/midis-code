/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';
import { download, request } from './extension';
export type Element = {
	id: number;
	name: string;
	type: "file" | "folder" | "unknown";
	ctime: number;
	mtime: number;
	children: Record<string, {
		type: "file" | "folder" | "unknown";
		name: string;
		id: number;
	}>;
	parent: number;
};

export class MidisFS implements vscode.FileSystemProvider {
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	_root: number = 0;
	_bigdata: Record<string, Element> = {};
	_decoder: TextDecoder = new TextDecoder('utf8');

	constructor(root: number, elements: any) {
		this._root = root;
		let children: any = {};
		elements.map((e: any) => {
			let element: Element = this._formatElement(e);
			this._bigdata[element.id] = element;
			children[element.id]={
				type:element.id,
				name:element.name,
				id:element.id
			};
		});
		this._bigdata[this._root]={
			id:this._root,
			name:"root",
			type:"folder",
			ctime:0,
			mtime:0,
			children,
			parent: this._root
		};
	}

	_formatElement(data: any): Element {
		return {
			id: data.ID,
			name: data.NAME,
			type: data.TYPE,
			ctime: +new Date(data.CREATE_TIME),
			mtime: +new Date(data.UPDATE_TIME),
			children:{},
			parent: data.PARENT_ID
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
		console.log(`Stat: ${uri.path}`);
		const { type, ctime, mtime } = await this._uriToElement(uri.path);
		return {
			type: this._formatType(type),
			ctime,
			mtime,
			size: 0
		};
	}
	
	async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		console.log(`ReadDIR: ${uri.path}`);
		return (await this._getFilesInFolder((await this._uriToElement(uri.path)).id)).map(element => [element.name, this._formatType(element.type)]);
	}

	async createDirectory(uri: vscode.Uri): Promise<void> {
		console.log(`CreateDIR: ${uri.path}`);
		await this._uriToElement(uri.path, true, false);
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		console.log(`ReadFILE: ${uri.path}`);
		return await download((await this._uriToElement(uri.path)).id);
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): Promise<void> {
		const body = btoa(this._decoder.decode(content));
		const element = await this._uriToElement(uri.path, options.create, true, body);
		this._writeFile(element.parent, [element.name, body], options.overwrite);
	}

	async delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): Promise<void> {
		console.log(`Delete: ${uri.path}`);
		const element = await this._uriToElement(uri.path);
		switch(element.type){
			case "file":
				await this._deleteFile(element.id, uri);
				break;
			case "folder":
				await this._deleteFolder(element.id, uri);
				break;
			default:
				throw vscode.FileSystemError.FileNotFound(uri);
		}
	}

	async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): Promise<void> {
		console.log(`Rename: ${oldUri.path}`);
		if(options.overwrite) {
			await this.delete(newUri, {recursive: true});
		}

		if(oldUri.path.split("/").slice(0,-1).join("/") === newUri.path.split("/").slice(0,-1).join("/")) {
			const element = await this._uriToElement(oldUri.path);
			const parent = await this._uriToElement(newUri.path.split("/").slice(0,-1).join("/"), true);
			const newName: string = newUri.path.split("/").at(-1) ?? `${element.name} copy ${this._simpleName()}`;
			switch(element.type){
				case "file":
					await this._renameFile(element.id, newName, oldUri);
					break;
				case "folder":
					await this._renameFolder(element.id, newName, oldUri);
					break;
				default:
					throw vscode.FileSystemError.FileNotFound(oldUri);
			}
			delete this._bigdata[element.parent].children[element.id];
			this._bigdata[parent.parent].children[element.id]={
				type:element.type,
				name:element.name,
				id:element.id
			};
		}else{
			throw new Error('Увы, но пока что функция недоступна (moveto)');
		}
	}

	copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		console.log(`Copy: ${source.path}`);
		throw new Error('Увы, но пока что функция недоступна'); // disk.folder.copyto || disk.file.copyto
	}

	async _uriToElement(uri: string, creator: boolean = false, isFile: boolean = true, fileData: string = ""): Promise<Element> {
		let path = uri.split("/").filter(e => e !== "");
		if (path.length) {
			let pre: Element = this._bigdata[this._root];
			for (let index = 0; index < path.length; index++) {
				if(!this._bigdata[pre.id]) { this._bigdata[pre.id]=pre; }
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
							throw vscode.FileSystemError.FileNotFound(uri);
					}
				}else{
					if(creator) {
						if(index < path.length-1) {
							pre=await this._createFolder(pre.id, path[index]);
						}else{
							if(isFile) {
								pre=await this._writeFile(pre.id, [path[index], fileData], false);
							}else{
								pre=await this._createFolder(pre.id, path[index]);
							}
						}
						
					}else{
						throw vscode.FileSystemError.FileNotFound(uri);
					}
				}
			}
			return pre;
		} else {
			let rootFolder = await this._getFolder(this._root);
			return rootFolder;
		}
	}

	// ================================

	async _renameFolder(id: number, newName: string, oldUri: vscode.Uri): Promise<boolean> {
		const folder = await this._getFolder(id);
		const { res: renameFolderRes, data: renameFolderData } = await request("/disk.folder.rename", { id, newName });
		if (renameFolderRes.ok) {
			const out = this._formatElement(renameFolderData.result);
			this._bigdata[id].name=out.name;
			this._bigdata[folder.parent].children[id].name=out.name;
			return true;
		} else {
			throw vscode.FileSystemError.FileNotADirectory(oldUri);
		}
	}

	async _recursiveDelete(dirId: number) {
		let out: number[] = [];
		for(const child of (await this._getFilesInFolder(dirId))) {
			if(child.type==='folder') { out.concat(await this._recursiveDelete(child.id)); }
			out.push(child.id);
		}
		return out;
	}

	async _deleteFolder(id: number, uri: vscode.Uri): Promise<boolean> {
		const folder = await this._getFolder(id);
		for(const child of await this._recursiveDelete(folder.id)) {
			delete this._bigdata[child];
		}
		const { res: deleteFolderRes, data: deleteFolderData } = await request("/disk.folder.deletetree", { id });
		if (deleteFolderRes.ok) {
			if(deleteFolderData.result) { delete this._bigdata[id]; }
			return deleteFolderData.result;
		} else {
			throw vscode.FileSystemError.FileNotADirectory(uri);
		}
	}

	async _createFolder(id: number, name: string): Promise<Element> {
		if(await this._getFolder(id)){
			if(!Object.values(this._bigdata[id].children).map(e=>e.name).includes(name)){
				// eslint-disable-next-line @typescript-eslint/naming-convention
				const { res: createFolderRes, data: createFolderData } = await request("/disk.folder.addsubfolder", { id, "data[NAME]": name });
				if (createFolderRes.ok) {
					const out = this._formatElement(createFolderData.result);
					this._bigdata[out.id]=out;
					this._bigdata[id].children[out.id]=out;
					return out;
				} else {
					let err = `Error get folder: ${createFolderRes.status}`;
					try {
						let j = await createFolderRes.json();
						err=j.error_description ?? j.message;
					} catch (error) {}
					throw new Error(err);
				}
			}else{
				throw vscode.FileSystemError.FileExists();
			}
		}else{
			throw vscode.FileSystemError.FileNotFound();
		}
	}

	async _getFolder(id: number): Promise<Element> {
		let folder = this._bigdata[id];
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

	// ================================

	async _writeFile(parentId: number, data: any, overwrite: boolean): Promise<Element> {
		let [name, content]: [name: string, content: string] = data;
		if(content==="") {content="Cg==";} 
		
		const folder = await this._getFolder(parentId);
		const find = Object.values(folder.children).find((e)=>e.name===name);

		if(find && !overwrite) {
			return this._bigdata[find.id];
		}

		//eslint-disable-next-line @typescript-eslint/naming-convention
		const { res: writeFileRes, data: writeFileData } = await request(find?"/disk.file.uploadversion":"/disk.folder.uploadfile", find ? { id:find.id, "fileContent[0]": name, "fileContent[1]":content} : { id:parentId, "fileContent[0]": name, "fileContent[1]":content, "data[NAME]": name });
		
		if (writeFileRes.ok) {
			const out = this._formatElement(writeFileData.result);
			this._bigdata[out.id]=out;
			this._bigdata[out.parent].children[out.id]={
				type:out.type,
				name:out.name,
				id:out.id
			};
			return out;
		} else {
			throw vscode.FileSystemError.FileNotFound();
		}
		

		
		
	}

	async _renameFile(id: number, newName: string, oldUri: vscode.Uri): Promise<boolean> {
		const file = await this._getFile(id);
		const { res: renameFileRes, data: renameFileData } = await request("/disk.file.rename", { id, newName });
		if (renameFileRes.ok) {
			const out = this._formatElement(renameFileData.result);
			this._bigdata[id].name=out.name;
			this._bigdata[file.parent].children[id].name=out.name;
			return true;
		} else {
			throw vscode.FileSystemError.FileIsADirectory(oldUri);
		}
	}

	async _deleteFile(id: number, uri: vscode.Uri): Promise<boolean> {
		const file = await this._getFile(id);
		delete this._bigdata[file.parent].children[file.id];
		const { res: deleteFileRes, data: deleteFileData } = await request("/disk.file.delete", { id });
		if (deleteFileRes.ok) {
			if(deleteFileData.result) { delete this._bigdata[id]; }
			return deleteFileData.result;
		} else {
			throw vscode.FileSystemError.FileIsADirectory(uri);
		}
	}

	async _getFile(id: number): Promise<Element> {
		let file = this._bigdata[id];
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
		if(Object.keys(folder.children).length){
			return Promise.all(Object.keys(folder.children).map(async (childId: string)=>{
				if(this._bigdata[childId]){
					return this._bigdata[childId];
				}else{
					let type = folder.children[childId]?.type;
					switch (type) {
						case "folder":
							return await this._getFolder(+childId);
						case "file":
							return await this._getFile(+childId);
						default:
							return {
								id:-1,
								name: "Error",
								type: "unknown",
								ctime:0,
								mtime:0,
								children:{},
								parent:folder.id
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
					folder.children[e.id]={
						type:e.type,
						name:e.name,
						id:e.id
					};
				});
				this._bigdata[folder.id]=folder;
				return out;
			} else {
				throw new Error(`Error get files list: ${rootFolderRes.status}`);
			}
		}
	}

	// ================================

	_thisIsFileOrFolder(uri: vscode.Uri): "file" | "folder" {
		return "file";
	}

	_simpleName() {
		let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567";
		return new Date().toLocaleTimeString().split(":").map(e=>chars[+e]).join("");
	}
}