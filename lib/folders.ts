import type { Channel, Folder } from './types';

export function createFolder(folders: Folder[], name: string): Folder[] {
  return [...folders, { id: crypto.randomUUID(), name: name.trim(), channelIds: [] }];
}

export function renameFolder(folders: Folder[], folderId: string, name: string): Folder[] {
  return folders.map((folder) => (folder.id === folderId ? { ...folder, name: name.trim() } : folder));
}

export function deleteFolder(folders: Folder[], folderId: string): Folder[] {
  return folders.filter((folder) => folder.id !== folderId);
}

/** 채널을 한 폴더로 옮긴다. 채널은 한 폴더에만 속할 수 있다. folderId가 null이면 미분류로 돌린다. */
export function assignChannel(folders: Folder[], channelId: string, folderId: string | null): Folder[] {
  return folders.map((folder) => {
    const has = folder.channelIds.includes(channelId);
    if (folder.id === folderId) return has ? folder : { ...folder, channelIds: [...folder.channelIds, channelId] };
    return has ? { ...folder, channelIds: folder.channelIds.filter((id) => id !== channelId) } : folder;
  });
}

/** 여러 폴더에 들어 있는 채널을 앞쪽 폴더 하나에만 남긴다. 다중 선택을 허용하던 때의 데이터를 정리하는 데 쓴다. */
export function dedupeChannels(folders: Folder[]): Folder[] {
  const taken = new Set<string>();
  return folders.map((folder) => {
    const channelIds = folder.channelIds.filter((id) => {
      if (taken.has(id)) return false;
      taken.add(id);
      return true;
    });
    return channelIds.length === folder.channelIds.length ? folder : { ...folder, channelIds };
  });
}

/** 어느 폴더에도 속하지 않은 채널 ID */
export function unsortedChannelIds(channels: Channel[], folders: Folder[]): string[] {
  const sorted = new Set(folders.flatMap((folder) => folder.channelIds));
  return channels.filter((channel) => !sorted.has(channel.id)).map((channel) => channel.id);
}
