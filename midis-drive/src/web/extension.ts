import * as vscode from 'vscode';
import { MidisFS } from './fileSystemProvider';

export async function request(url: string, body: any = {}) {
	const res = await fetch(url, {
		method:"post",
		headers:{
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"Content-Type":"application/json"
		},
		body:JSON.stringify(body)
	});
	const data = await res.json();
	return {res, data};
}

export async function download(id: number) {
	const res = await fetch(`/download?id=${id}`); // `/dl/${id}/?filename`
	const data = await res.arrayBuffer();
	return new Uint8Array(data);
}

export async function activate(context: vscode.ExtensionContext) {

	const {res: rootRes, data: rootData} = await request("/root");
	if(rootRes.ok){
		const {res: rootFolderRes, data: rootFolderData} = await request("/disk.folder.getchildren", {id: rootData.rootId});

		if(rootFolderRes.ok){

			const midisFs = new MidisFS(rootData.rootId, rootFolderData.result);
			
			const enc = new TextEncoder();

			midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/settings.json`), enc.encode("{}"), {create: true, overwrite: false});
			midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/tasks.json`), enc.encode("{}"), {create: true, overwrite: false});
			midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/launch.json`), enc.encode("{}"), {create: true, overwrite: false});
			midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/extensions.json`), enc.encode(JSON.stringify({
  			"recommendations": ["beardedbear.beardedtheme", "amodio.tsl-problem-matcher", "hediet.vscode-drawio", "dbaeumer.vscode-eslint", "eamodio.gitlens", "PKief.material-icon-theme", "esbenp.prettier-vscode"]
			})), {create: true, overwrite: false});
			
			
			
			context.subscriptions.push(vscode.workspace.registerFileSystemProvider('midisfs', midisFs, { isCaseSensitive: true }));

			

			vscode.window.showInformationMessage("Connection established");
		}else{
			vscode.window.showInformationMessage(rootFolderData.message);
		}
	}else{
		vscode.window.showInformationMessage(rootData.message);
	}
}

