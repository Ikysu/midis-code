/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export class ExtensionInformation {
  constructor(metadata: ExtensionMetadata, name: string, publisher: string, version: string) {
    this.metadata = metadata;
    this.name = name;
    this.publisher = publisher;
    this.version = version;
  }

  public static fromJSON(text: string) {
    try {
      const obj = JSON.parse(text);
      const meta = new ExtensionMetadata(
        obj.meta.galleryApiUrl,
        obj.meta.id,
        obj.meta.downloadUrl,
        obj.meta.publisherId,
        obj.meta.publisherDisplayName,
        obj.meta.date
      );
      const item = new ExtensionInformation(meta, obj.name, obj.publisher, obj.version);
      return item;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  public static fromJSONList(text: string) {
    const extList: ExtensionInformation[] = [];
    try {
      const list = JSON.parse(text);
      list.forEach((obj: any) => {
        const meta = new ExtensionMetadata(
          obj.metadata.galleryApiUrl,
          obj.metadata.id,
          obj.metadata.downloadUrl,
          obj.metadata.publisherId,
          obj.metadata.publisherDisplayName,
          obj.metadata.date
        );
        const item = new ExtensionInformation(meta, obj.name, obj.publisher, obj.version);

        if (item.name !== "code-settings-sync") {
          extList.push(item);
        }
      });
    } catch (err: any) {
      throw new Error(err);
    }

    return extList;
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
    .filter(ext => !ext.packageJSON.isBuiltin)
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
    })
    .filter(ext => ext.name !== "midis-drive");
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
  missingExtensions: ExtensionInformation[]
): Promise<ExtensionInformation[]> {
  const addedExtensions: ExtensionInformation[] = [];
  for (const ext of missingExtensions) {
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