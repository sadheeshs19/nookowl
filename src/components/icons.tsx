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
  | 'check'
  | 'camera'
  | 'owl'
  | 'female'
  | 'male'
  | 'nonbinary'
  | 'lock'
  | 'cake'
  | 'moon'
  | 'doc'
  | 'help'
  | 'shield'
  | 'logout'
  | 'trash'
  | 'chevronRight'
  | 'card'
  | 'rooms'
  | 'hand'
  | 'link';

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
      {name === 'lock' && (
        <>
          <Rect {...common} x={5} y={11} width={14} height={10} rx={2} />
          <Path {...common} d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      )}
      {name === 'cake' && <Path {...common} d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z" />}
      {name === 'moon' && <Path {...common} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
      {name === 'doc' && <Path {...common} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" />}
      {name === 'help' && (
        <>
          <Circle {...common} cx={12} cy={12} r={9} />
          <Path {...common} d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
        </>
      )}
      {name === 'shield' && <Path {...common} d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />}
      {name === 'logout' && <Path {...common} d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />}
      {name === 'trash' && <Path {...common} d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />}
      {name === 'chevronRight' && <Path {...common} d="M9 6l6 6-6 6" />}
      {name === 'card' && (
        <>
          <Rect {...common} x={4} y={5} width={16} height={14} rx={3} />
          <Path {...common} d="M8 15h5M8 11h8" />
        </>
      )}
      {name === 'rooms' && (
        <>
          <Circle {...common} cx={12} cy={12} r={2.5} />
          <Path {...common} d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
        </>
      )}
      {name === 'hand' && (
        <Path {...common} d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3.6 16a1.6 1.6 0 0 1 2.4-2.1L8 15.5" />
      )}
      {name === 'link' && <Path {...common} d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />}
      {name === 'female' && (
        <>
          <Circle cx={12} cy={4.2} r={2.6} fill={color} />
          <Path
            fill={color}
            d="M12 7.8c-1.9 0-3 1-3.5 2.6L6.6 16.3h3v5.2h1.7v-5.2h1.4v5.2h1.7v-5.2h3l-1.9-5.9C15 8.8 13.9 7.8 12 7.8z"
          />
        </>
      )}
      {name === 'male' && (
        <>
          <Circle cx={12} cy={4.2} r={2.6} fill={color} />
          <Path
            fill={color}
            d="M9.4 7.9h5.2c1 0 1.8.8 1.8 1.8v6.2h-1.8v5.6h-1.8v-5.4h-1.6v5.4H9.4v-5.6H7.6V9.7c0-1 .8-1.8 1.8-1.8z"
          />
        </>
      )}
      {name === 'nonbinary' && (
        <>
          <Circle cx={12} cy={6.5} r={3.5} fill={color} />
          <Path fill={color} d="M4.5 21c0-4.4 3.4-7.5 7.5-7.5s7.5 3.1 7.5 7.5z" />
        </>
      )}
      {name === 'owl' && (
        <>
          <Path {...common} d="M6 4l2.5 3h7L18 4v9a6 6 0 0 1-12 0z" />
          <Circle {...common} cx={9.5} cy={11} r={1.8} />
          <Circle {...common} cx={14.5} cy={11} r={1.8} />
          <Path {...common} d="M11.2 14.2L12 15.4l.8-1.2" />
        </>
      )}
      {name === 'camera' && (
        <>
          <Path {...common} d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <Circle {...common} cx={12} cy={13} r={3.5} />
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
