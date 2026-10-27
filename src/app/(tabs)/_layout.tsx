import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from '../../components/icons';
import { getCallRequests, listConversations } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useRealtime } from '../../lib/useRealtime';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

function useBadges(userId: string | undefined) {
  const [requests, setRequests] = useState(0);
  const [inbox, setInbox] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [r, convs] = await Promise.all([getCallRequests(), listConversations()]);
      setRequests(r.received.length);
      // Message requests waiting for this user's answer.
      setInbox(convs.filter((c) => c.status === 'request' && c.created_by !== userId).length);
    } catch {
      // badges are best-effort
    }
  }, [userId]);

  useEffect(() => {
    // Fetching on mount; state is only set after the network call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  useRealtime('badges', [{ table: 'call_requests' }, { table: 'conversations' }], refresh, !!userId);
  return { requests, inbox };
}

export default function TabsLayout() {
  const { ready, session, profile } = useAuth();
  const { colors } = useTheme();
  const badges = useBadges(session?.user.id);

  if (ready && !session) return <Redirect href="/welcome" />;
  if (ready && session && !profile) return <Redirect href="/onboarding" />;

  const icon = (name: IconName) =>
    function TabIcon({ color }: { color: unknown }) {
      return <Icon name={name} color={typeof color === 'string' ? color : colors.muted} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent, fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Topics', tabBarIcon: icon('mic') }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: icon('people') }} />
      <Tabs.Screen
        name="requests"
        options={{ title: 'Requests', tabBarIcon: icon('phoneIn'), tabBarBadge: badges.requests || undefined }}
      />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: icon('chat'), tabBarBadge: badges.inbox || undefined }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
