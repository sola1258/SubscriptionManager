import { useState } from 'react';
import { assignChannel } from '@/lib/folders';
import { foldersItem } from '@/lib/store';
import type { Channel, Folder } from '@/lib/types';

interface Props {
  channels: Channel[];
  folders: Folder[];
}

export default function ManageView({ channels, folders }: Props) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? channels.filter((c) => c.title.toLowerCase().includes(needle) || c.handle?.toLowerCase().includes(needle))
    : channels;

  return (
    <>
      <header className="main-header">
        <h2>채널 관리</h2>
        <span className="muted">채널 {channels.length}개</span>
        <span className="spacer" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="채널 검색"
          aria-label="채널 검색"
        />
      </header>

      {folders.length === 0 && <p className="muted">먼저 왼쪽에서 폴더를 만들어주세요.</p>}

      <ul className="channel-list">
        {filtered.map((channel) => (
          <li key={channel.id} className="channel-row">
            <img src={channel.thumbnail} alt="" loading="lazy" />
            <div className="channel-info">
              <div>{channel.title}</div>
              {channel.handle && <div className="muted">{channel.handle}</div>}
            </div>
            <div className="chips">
              {folders.map((folder) => {
                const selected = folder.channelIds.includes(channel.id);
                return (
                  // 선택된 폴더를 다시 누르면 미분류로 돌아간다.
                  <button
                    key={folder.id}
                    className={selected ? 'chip checked' : 'chip'}
                    aria-pressed={selected}
                    onClick={() =>
                      foldersItem.setValue(assignChannel(folders, channel.id, selected ? null : folder.id))
                    }
                  >
                    {folder.name}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
