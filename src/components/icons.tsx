import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'mic'
  | 'people'
  | 'phoneIn'
  | 'chat'
  | 'user'
  | 'phone'
  | 'heart'
  | 'comment'
  | 'message'
  | 'plus'
  | 'search'
  | 'close'
  | 'back'
  | 'more'
  | 'send'
  | 'play'
  | 'pause'
  | 'speaker'
  | 'micOff'
  | 'hangup'
  | 'flag'
  | 'chevronDown'
  | 'settings'
  | 'filter'
  | 'stop'
  | 'check';

export function Icon({
  name,
  size = 22,
  color = 'currentColor',
  filled = false,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'mic' && <Path {...common} d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3" />}
      {name === 'micOff' && (
        <>
          <Path {...common} d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3" />
          <Path {...common} d="M4 4l16 16" />
        </>
      )}
      {name === 'people' && (
        <>
          <Rect {...common} x={5} y={3} width={14} height={18} rx={3} />
          <Circle {...common} cx={12} cy={10} r={3} />
          <Path {...common} d="M8 17a4 4 0 0 1 8 0" />
        </>
      )}
      {name === 'phoneIn' && (
        <Path {...common} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2M15 3v6h6" />
      )}
      {name === 'phone' && (
        <Path {...common} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
      )}
      {name === 'chat' && <Path {...common} d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />}
      {name === 'comment' && <Path {...common} d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />}
      {name === 'message' && <Path {...common} d="M4 6h16v10H8l-4 4z" />}
      {name === 'user' && (
        <>
          <Circle {...common} cx={12} cy={8} r={4} />
          <Path {...common} d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
      {name === 'heart' && (
        <Path {...common} fill={filled ? color : 'none'} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      )}
      {name === 'plus' && <Path {...common} d="M12 5v14M5 12h14" />}
      {name === 'search' && (
        <>
          <Circle {...common} cx={11} cy={11} r={7} />
          <Path {...common} d="M20 20l-4-4" />
        </>
      )}
      {name === 'check' && <Path {...common} d="M5 12.5l4.5 4.5L19 7.5" />}
      {name === 'close' && <Path {...common} d="M6 6l12 12M18 6L6 18" />}
      {name === 'back' && <Path {...common} d="M15 6l-6 6 6 6" />}
      {name === 'chevronDown' && <Path {...common} d="M6 9l6 6 6-6" />}
      {name === 'more' && <Path {...common} strokeWidth={2.6} d="M12 5h.01M12 12h.01M12 19h.01" />}
      {name === 'send' && <Path {...common} d="M4 12l16-8-6 16-3-7z" />}
      {name === 'play' && <Path fill={color} d="M7 4.5v15l13-7.5z" />}
      {name === 'pause' && <Path fill={color} d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
      {name === 'stop' && <Rect fill={color} x={6} y={6} width={12} height={12} rx={2} />}
      {name === 'speaker' && <Path {...common} d="M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8" />}
      {name === 'hangup' && <Path {...common} d="M3 15c5-5 13-5 18 0l-2.5 2.5-3.5-1.5v-3a10 10 0 0 0-6 0v3L5.5 17.5z" />}
      {name === 'flag' && <Path {...common} d="M4 21V4h12l-2 4 2 4H4" />}
      {name === 'filter' && <Path {...common} d="M4 6h16M7 12h10M10 18h4" />}
      {name === 'settings' && (
        <>
          <Circle {...common} cx={12} cy={12} r={3} />
          <Path {...common} d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
        </>
      )}
    </Svg>
  );
}
