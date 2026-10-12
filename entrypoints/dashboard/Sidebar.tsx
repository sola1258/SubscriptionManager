import { useState, type FormEvent } from 'react';
import { createFolder } from '@/lib/folders';
import { foldersItem } from '@/lib/store';
import type { Folder } from '@/lib/types';
import type { Selection, View } from './App';

interface Props {
  folders: Folder[];
  channelCount: number;
  unsortedCount: number;
  selection: Selection;
  view: View;
  syncing: boolean;
  syncError: string | null;
  lastSyncedAt: number | null;
  onSelect: (selection: Selection) => void;
  onManage: () => void;
  onSync: () => void;
}

export default function Sidebar(props: Props) {
  const { folders, selection, view } = props;
  const [newName, setNewName] = useState('');
  const inFeed = view === 'feed';

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    foldersItem.setValue(createFolder(folders, newName));
    setNewName('');
  }

  return (
    <nav className="sidebar">
      <h1>Subscription Manager</h1>

      <ul className="folder-list">
        <FolderItem
          name="전체"
          count={props.channelCount}
          active={inFeed && selection.kind === 'all'}
          onClick={() => props.onSelect({ kind: 'all' })}
        />
        {folders.map((folder) => (
          <FolderItem
            key={folder.id}
            name={folder.name}
            count={folder.channelIds.length}
            active={inFeed && selection.kind === 'folder' && selection.id === folder.id}
            onClick={() => props.onSelect({ kind: 'folder', id: folder.id })}
          />
        ))}
        <FolderItem
          name="미분류"
          count={props.unsortedCount}
          active={inFeed && selection.kind === 'unsorted'}
          onClick={() => props.onSelect({ kind: 'unsorted' })}
        />
      </ul>

      <form className="new-folder" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="새 폴더 이름"
          aria-label="새 폴더 이름"
        />
        <button type="submit" disabled={!newName.trim()}>
          추가
        </button>
      </form>

      <div className="sidebar-actions">
        <button className={view === 'manage' ? 'active' : ''} onClick={props.onManage}>
          채널 관리
        </button>
        <button onClick={props.onSync} disabled={props.syncing}>
          {props.syncing ? '동기화 중…' : '구독 동기화'}
        </button>
        {props.syncError && <p className="error">{props.syncError}</p>}
        {props.lastSyncedAt && (
          <p className="muted">마지막 동기화: {new Date(props.lastSyncedAt).toLocaleString('ko-KR')}</p>
        )}
      </div>
    </nav>
  );
}

function FolderItem(props: { name: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button className={props.active ? 'folder active' : 'folder'} onClick={props.onClick}>
        <span className="folder-name">{props.name}</span>
        <span className="muted">{props.count}</span>
      </button>
    </li>
  );
}
