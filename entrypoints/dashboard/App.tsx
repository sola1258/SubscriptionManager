import { useMemo, useState } from 'react';
import { deleteFolder, renameFolder, unsortedChannelIds } from '@/lib/folders';
import { channelsItem, foldersItem, lastSyncedAtItem } from '@/lib/store';
import { syncSubscriptions } from '@/lib/sync';
import FeedView from './FeedView';
import ManageView from './ManageView';
import Sidebar from './Sidebar';
import { useStorageItem } from './useStorageItem';

export type Selection = { kind: 'all' } | { kind: 'unsorted' } | { kind: 'folder'; id: string };
export type View = 'feed' | 'manage';

export default function App() {
  const channels = useStorageItem(channelsItem);
  const folders = useStorageItem(foldersItem);
  const lastSyncedAt = useStorageItem(lastSyncedAtItem);
  const [selection, setSelection] = useState<Selection>({ kind: 'all' });
  // 영상은 주로 YouTube 구독 페이지에서 보므로, 여기는 채널 관리부터 연다.
  const [view, setView] = useState<View>('manage');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const channelsById = useMemo(() => new Map((channels ?? []).map((c) => [c.id, c])), [channels]);
  const unsortedIds = useMemo(() => unsortedChannelIds(channels ?? [], folders ?? []), [channels, folders]);

  if (!channels || !folders) return null;

  const selectedFolder = selection.kind === 'folder' ? folders.find((f) => f.id === selection.id) : undefined;
  // 선택했던 폴더가 삭제됐으면 전체로 돌아간다.
  const current: Selection = selection.kind === 'folder' && !selectedFolder ? { kind: 'all' } : selection;

  const title = current.kind === 'unsorted' ? '미분류' : (selectedFolder?.name ?? '전체');
  const channelIds =
    current.kind === 'unsorted' ? unsortedIds : (selectedFolder?.channelIds ?? channels.map((c) => c.id));

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await syncSubscriptions();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }

  function handleRename() {
    if (!selectedFolder) return;
    const name = window.prompt('폴더 이름', selectedFolder.name)?.trim();
    if (name) foldersItem.setValue(renameFolder(folders!, selectedFolder.id, name));
  }

  function handleDelete() {
    if (!selectedFolder) return;
    if (!window.confirm(`"${selectedFolder.name}" 폴더를 삭제할까요? 채널 구독은 그대로 유지됩니다.`)) return;
    foldersItem.setValue(deleteFolder(folders!, selectedFolder.id));
  }

  return (
    <div className="layout">
      <Sidebar
        folders={folders}
        channelCount={channels.length}
        unsortedCount={unsortedIds.length}
        selection={current}
        view={view}
        syncing={syncing}
        syncError={syncError}
        lastSyncedAt={lastSyncedAt ?? null}
        onSelect={(next) => {
          setSelection(next);
          setView('feed');
        }}
        onManage={() => setView('manage')}
        onSync={handleSync}
      />
      <main className="main">
        {channels.length === 0 ? (
          <div className="empty">
            <p>아직 구독 목록이 없습니다.</p>
            <p>YouTube에 로그인한 상태에서 왼쪽의 “구독 동기화”를 눌러주세요.</p>
          </div>
        ) : view === 'manage' ? (
          <ManageView channels={channels} folders={folders} />
        ) : (
          <FeedView
            title={title}
            channelIds={channelIds}
            channelsById={channelsById}
            onRename={selectedFolder ? handleRename : undefined}
            onDelete={selectedFolder ? handleDelete : undefined}
          />
        )}
      </main>
    </div>
  );
}
