import * as vscode from 'vscode';
import { MidisFS } from './fileSystemProvider';
import { Syncer } from './sync';

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
	if(!res.ok) { throw vscode.FileSystemError.FileNotFound(); }
	const data = await res.arrayBuffer();
	return new Uint8Array(data);
}

export async function activate(context: vscode.ExtensionContext) {

	let userInfo: vscode.StatusBarItem = vscode.window.createStatusBarItem("logout", vscode.StatusBarAlignment.Left, Infinity);
	userInfo.text="Выйти";
	context.subscriptions.push(userInfo);
	userInfo.show();
	userInfo.command="midis-drive.logout";
	userInfo.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

	const {res: rootRes, data: rootData} = await request("/root");
	if(rootRes.ok){
		const {res: rootFolderRes, data: rootFolderData} = await request("/disk.folder.getchildren", {id: rootData.rootId});

		if(rootFolderRes.ok){
			const midisFs = new MidisFS(rootData.rootId, rootFolderData.result);
			await midisFs.readDirectory(vscode.Uri.parse("midisfs:/"));
			
			// const enc = new TextEncoder();

			// midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/settings.json`), enc.encode("{}"), {create: true, overwrite: false});
			// midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/tasks.json`), enc.encode("{}"), {create: true, overwrite: false});
			// midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/launch.json`), enc.encode("{}"), {create: true, overwrite: false});
			// midisFs.writeFile(vscode.Uri.parse(`midisfs:/.vscode/extensions.json`), enc.encode(JSON.stringify({
  		// 	"recommendations": ["beardedbear.beardedtheme", "amodio.tsl-problem-matcher", "hediet.vscode-drawio", "dbaeumer.vscode-eslint", "eamodio.gitlens", "PKief.material-icon-theme", "esbenp.prettier-vscode"]
			// })), {create: true, overwrite: false});
			
			await (new Syncer(midisFs)).init();

			context.subscriptions.push(vscode.workspace.registerFileSystemProvider('midisfs', midisFs, { isCaseSensitive: true }));

			vscode.window.showInformationMessage("Midis: Done!");

		}else{
			vscode.window.showInformationMessage(rootFolderData.message);
		}
	}else{
		vscode.window.showInformationMessage(rootData.message);
	}
}

