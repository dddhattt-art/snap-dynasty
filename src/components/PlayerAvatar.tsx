import { useState } from 'react';
import { playerThumb, teamLogoUrl } from '../api/sleeper';

const POS_COLOR: Record<string, string> = {
  QB: '#e8500a', RB: '#1c6b46', WR: '#1a6fa8', TE: '#8b5e0a',
  K: '#6b1c6b', DEF: '#1a5fa8',
};

interface Props {
  playerId: string;
  position?: string | null;
  team?: string | null;
  size?: number;
}

export default function PlayerAvatar({ playerId, position, team, size = 30 }: Props) {
  const [failed, setFailed] = useState(false);
  const color = POS_COLOR[position ?? ''] ?? '#64748b';

  const src = position === 'DEF' && team
    ? teamLogoUrl(team)
    : playerThumb(playerId);

  if (failed) {
    return (
      <div
        className="player-av-fallback"
        style={{ width: size, height: size, background: color + '18', color, fontSize: size * 0.38 }}
      >
        {position ?? '?'}
      </div>
    );
  }

  return (
    <img
      loading="lazy"
      src={src}
      alt=""
      className="player-av"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
