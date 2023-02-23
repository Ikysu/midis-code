/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export class ExtensionInformation {
  constructor(metadata: ExtensionMetadata, name: string, publisher: string, version: string) {
    this.metadata = metadata;
    this.name = name;
    this.publisher = publisher;
    this.version = version;
  }

  public metadata: ExtensionMetadata;
  public name: string;
  public version: string;
  public publisher: string;
}

export class ExtensionMetadata {
  constructor(
    public galleryApiUrl: string,
    public id: string,
    public downloadUrl: string,
    public publisherId: string,
    public publisherDisplayName: string,
    public date: string
  ) {}
}

export function CreateExtensionList() {
  return vscode.extensions.all
    .filter(ext => !ext.packageJSON.isBuiltin && ext.packageJSON.name !== "midis-drive")
    .map(ext => {
      const meta = ext.packageJSON.__metadata || {
        id: ext.packageJSON.uuid,
        publisherId: ext.id,
        publisherDisplayName: ext.packageJSON.publisher
      };
      const data = new ExtensionMetadata(
        meta.galleryApiUrl,
        meta.id,
        meta.downloadUrl,
        meta.publisherId,
        meta.publisherDisplayName,
        meta.date
      );
      const info = new ExtensionInformation(data, ext.packageJSON.name, ext.packageJSON.publisher, ext.packageJSON.version);
      return info;
    });
}

export function GetMissingExtensions(
  remoteList: ExtensionInformation[],
  ignoredExtensions: string[]
) {
  const localList = CreateExtensionList();

  return remoteList.filter(
    ext =>
      !ignoredExtensions.includes(ext.name) &&
      !localList.map(e => e.name).includes(ext.name)
  );
}

export async function InstallExtensions(
  extensions: ExtensionInformation[],
  ignoredExtensions: string[]
): Promise<ExtensionInformation[]> {
  let addedExtensions: ExtensionInformation[] = [];
  const missingExtensions = GetMissingExtensions(
    extensions,
    ignoredExtensions
  );
  if (missingExtensions.length === 0) {
    return [];
  }
  addedExtensions = await InstallWithAPI(
    missingExtensions
  );
  return addedExtensions;
}

export async function InstallWithAPI(
  extensions: ExtensionInformation[]
): Promise<ExtensionInformation[]> {
  const addedExtensions: ExtensionInformation[] = [];
  for (const ext of extensions) {
    const name = ext.publisher + "." + ext.name;
    try {
      await vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        name
      );
      addedExtensions.push(ext);
    } catch (err: any) {
      throw new Error(err);
    }
  }
  return addedExtensions;
}