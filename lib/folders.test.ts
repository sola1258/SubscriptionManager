import { describe, expect, it } from 'vitest';
import {
  assignChannel,
  createFolder,
  dedupeChannels,
  deleteFolder,
  renameFolder,
  unsortedChannelIds,
} from './folders';
import type { Channel, Folder } from './types';

const folders: Folder[] = [
  { id: 'f1', name: '게임', channelIds: ['UC1'] },
  { id: 'f2', name: '음악', channelIds: [] },
];

const channel = (id: string): Channel => ({ id, title: id, thumbnail: '' });

describe('folders', () => {
  it('폴더를 끝에 추가하고 이름 앞뒤 공백을 지운다', () => {
    const result = createFolder(folders, '  요리 ');
    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({ name: '요리', channelIds: [] });
    expect(result[2]!.id).not.toBe('');
  });

  it('해당 폴더만 이름을 바꾼다', () => {
    expect(renameFolder(folders, 'f2', 'J-POP').map((f) => f.name)).toEqual(['게임', 'J-POP']);
  });

  it('폴더를 삭제한다', () => {
    expect(deleteFolder(folders, 'f1').map((f) => f.id)).toEqual(['f2']);
  });

  it('미분류 채널을 폴더에 넣는다', () => {
    const result = assignChannel(folders, 'UC2', 'f1');
    expect(result[0]!.channelIds).toEqual(['UC1', 'UC2']);
    expect(result[1]).toBe(folders[1]);
  });

  it('다른 폴더로 옮기면 원래 폴더에서 빠진다', () => {
    const result = assignChannel(folders, 'UC1', 'f2');
    expect(result.map((f) => f.channelIds)).toEqual([[], ['UC1']]);
  });

  it('이미 있는 폴더에 다시 넣어도 중복되지 않는다', () => {
    expect(assignChannel(folders, 'UC1', 'f1')[0]!.channelIds).toEqual(['UC1']);
  });

  it('null로 지정하면 미분류로 돌아간다', () => {
    expect(assignChannel(folders, 'UC1', null).map((f) => f.channelIds)).toEqual([[], []]);
  });

  it('여러 폴더에 든 채널은 앞쪽 폴더에만 남긴다', () => {
    const duplicated: Folder[] = [
      { id: 'f1', name: '게임', channelIds: ['UC1', 'UC2'] },
      { id: 'f2', name: '음악', channelIds: ['UC2', 'UC3', 'UC1'] },
      { id: 'f3', name: '요리', channelIds: ['UC4'] },
    ];
    const result = dedupeChannels(duplicated);
    expect(result.map((f) => f.channelIds)).toEqual([['UC1', 'UC2'], ['UC3'], ['UC4']]);
    expect(result[2]).toBe(duplicated[2]);
  });

  it('어느 폴더에도 없는 채널을 찾는다', () => {
    expect(unsortedChannelIds([channel('UC1'), channel('UC2'), channel('UC3')], folders)).toEqual(['UC2', 'UC3']);
  });
});
