import * as vscode from 'vscode';
import { MidisFS } from './fileSystemProvider';

export async function request(url: string, body: any = {}) {
	const res = await fetch(url, {
		method:"post",
		body
	});
	const data = await res.json();
	return {res, data};
}

export async function activate(context: vscode.ExtensionContext) {

	const {res: rootRes, data: rootData} = await request("/root");
	if(rootRes.ok){
		const {res: rootFolderRes, data: rootFolderData} = await request("/disk.folder.getchildren", {id: rootData.rootId});

		if(rootFolderRes.ok){

			const midisFs = new MidisFS(rootData.rootId, rootFolderData.result);
			context.subscriptions.push(vscode.workspace.registerFileSystemProvider('midisfs', midisFs, { isCaseSensitive: true }));

			vscode.window.showInformationMessage("Connected");
		}else{
			vscode.window.showErrorMessage(rootFolderData.message);
		}
	}else{
		vscode.window.showErrorMessage(rootData.message);
	}
}

