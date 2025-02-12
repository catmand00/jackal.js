import IFileHandlerCore from '@/interfaces/classes/IFileHandlerCore'
import { IChildDirInfo, IFileMetaHashMap, IFolderChildFiles, IFolderFileFrame } from '@/interfaces'

export default interface IFolderHandler extends IFileHandlerCore {

  getWhoOwnsMe (): string
  getMerklePath (): Promise<string>
  getFolderDetails (): IFolderFileFrame
  getChildDirs (): string[]
  getChildFiles (): IFolderChildFiles
  addChildDirs (dirs: string[]): void

  makeChildDirInfo (childName: string): IChildDirInfo
  addChildFiles (newFiles: IFileMetaHashMap): void
  removeChildDirs (toRemove: string[]): void
  removeChildFiles (toRemove: string[]): void
  getFullMerkle (): Promise<string>
  getChildMerkle (child: string): Promise<string>

}
