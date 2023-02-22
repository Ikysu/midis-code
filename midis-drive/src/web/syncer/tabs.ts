import * as vscode from "vscode";

export function getTabs() {
  //@ts-ignore
  const activePath = vscode.window.tabGroups.activeTabGroup.activeTab?.input?.uri?.path  ?? "";
  return vscode.window.tabGroups.activeTabGroup?.tabs?.map(tab=>{
    //@ts-ignore
    const path: string = tab?.input?.uri?.path ?? "";
    return {path, preview: path===activePath};
  });
}