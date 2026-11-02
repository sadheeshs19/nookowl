import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarSpace } from '../../components/GlassTabBar';
import { Icon } from '../../components/icons';
import { GenderAge } from '../../components/GenderAge';
import { Avatar, Button, Card, Empty, T } from '../../components/ui';
import { deleteTopic, getFeed, isAdmin, setOpenToCalls, setProfileImage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCredits } from '../../lib/credits';
import { timeAgo } from '../../lib/format';
import { deleteProfileImage, pickAndUploadProfileImage, profileImageUrl, type ProfileImageKind } from '../../lib/images';
import type { FeedTopic } from '../../lib/types';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const tabSpace = useTabBarSpace(20);
  const { profile, refreshProfile } = useAuth();
  const { credits, openSheet } = useCredits();
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [open, setOpen] = useState(profile?.open_to_calls ?? false);
  const [uploading, setUploading] = useState<ProfileImageKind | null>(null);
  const [admin, setAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setOpen(profile.open_to_calls);
    isAdmin().then(setAdmin, () => {});
    try {
      setTopics(await getFeed(undefined, profile.id));
    } catch {
      // keep what we have
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleOpen = async (v: boolean) => {
    setOpen(v);
    try {
      await setOpenToCalls(v);
      await refreshProfile();
    } catch (e) {
      setOpen(!v);
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const changeImage = async (kind: ProfileImageKind) => {
    if (!profile) return;
    const old = kind === 'avatar' ? profile.avatar_path : profile.cover_path;
    try {
      setUploading(kind);
      const path = await pickAndUploadProfileImage(profile.id, kind);
      if (!path) return;
      await setProfileImage(kind, path);
      await refreshProfile();
      deleteProfileImage(old);
    } catch (e) {
      Alert.alert('Could not update the photo', e instanceof Error ? e.message : '');
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async (kind: ProfileImageKind) => {
    if (!profile) return;
    const old = kind === 'avatar' ? profile.avatar_path : profile.cover_path;
    try {
      await setProfileImage(kind, null);
      await refreshProfile();
      deleteProfileImage(old);
    } catch (e) {
      Alert.alert('Could not remove the photo', e instanceof Error ? e.message : '');
    }
  };

  const imageMenu = (kind: ProfileImageKind) => {
    const has = kind === 'avatar' ? !!profile?.avatar_path : !!profile?.cover_path;
    const label = kind === 'avatar' ? 'Profile picture' : 'Cover image';
    if (!has) return changeImage(kind);
    Alert.alert(label, undefined, [
      { text: 'Choose a new photo', onPress: () => changeImage(kind) },
      { text: 'Remove', style: 'destructive', onPress: () => removeImage(kind) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (t: FeedTopic) =>
    Alert.alert('Delete this topic?', 'Its likes and comments will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTopic(t.id).catch(() => {});
          load();
        },
      },
    ]);

  if (!profile) return null;

  const likes = topics.reduce((a, t) => a + Number(t.like_count), 0);
  const comments = topics.reduce((a, t) => a + Number(t.comment_count), 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: tabSpace }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T variant="title" style={{ flex: 1 }}>Profile</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <Icon name="settings" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profile.cover_path ? 'Change cover image' : 'Add a cover image'}
            onPress={() => imageMenu('cover')}
            style={{ height: 150, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            {profile.cover_path ? (
              <Image source={{ uri: profileImageUrl(profile.cover_path)! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="camera" size={22} color={colors.muted} />
                <T variant="small" muted>Add a cover image</T>
              </View>
            )}
            {uploading === 'cover' ? (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay }}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : profile.cover_path ? (
              <View style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.overlay }}>
                <Icon name="camera" size={14} color="#FFFFFF" />
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: '#FFFFFF' }}>Edit cover</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profile.avatar_path ? 'Change profile picture' : 'Add a profile picture'}
            onPress={() => imageMenu('avatar')}
            style={{ marginTop: -46, marginLeft: 16, alignSelf: 'flex-start' }}
          >
            <View style={{ padding: 4, borderRadius: 50, backgroundColor: colors.bg }}>
              <Avatar name={profile.username} path={profile.avatar_path} size={88} />
              {uploading === 'avatar' ? (
                <View style={{ position: 'absolute', top: 4, left: 4, width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay }}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <View style={{ position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.bg }}>
              <Icon name="camera" size={14} color={colors.onAccent} />
            </View>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: -6 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T variant="heading">{profile.username}</T>
              <GenderAge gender={profile.gender} age={profile.show_age === false ? null : new Date().getFullYear() - profile.birth_year} size="large" />
            </View>
            <T variant="small" muted>
              {[profile.city, profile.languages.length ? `Speaks ${profile.languages.join(', ')}` : null].filter(Boolean).join(' · ')}
            </T>
            {profile.bio ? (
              <T variant="small">{profile.bio}</T>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.push('/edit-profile')}>
                <T variant="small" style={{ color: colors.accentText }}>+ Add a bio so people know what to talk about</T>
              </Pressable>
            )}
          </View>
        </View>

        <Button
          kind="secondary"
          title="Edit profile"
          icon={<Icon name="user" size={18} color={colors.text} />}
          onPress={() => router.push('/edit-profile')}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <View style={{ flex: 1, gap: 3 }}>
            <T variant="label">Open to calls</T>
            <T variant="small" muted>
              {open ? 'People can find you in People and send call requests.' : 'You’re hidden. Turn on when you’re free to talk.'}
            </T>
          </View>
          <Switch accessibilityLabel="Open to calls" value={open} onValueChange={toggleOpen} trackColor={{ true: colors.online }} />
        </View>


        <Pressable
          accessibilityRole="button"
          onPress={() => openSheet()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border }}
        >
          <Icon name="phone" size={22} color={colors.accentText} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label">{credits ? `${Math.floor(credits.total_seconds / 60)} call minutes` : 'Call minutes'}</T>
            <T variant="small" muted>15 free every day · watch an ad for more</T>
          </View>
          <T variant="label" style={{ color: colors.accentText }}>Get more</T>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            ['Topics', topics.length],
            ['Likes', likes],
            ['Comments', comments],
          ].map(([label, n]) => (
            <View key={label} style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.text }}>{n}</Text>
              <T variant="small" muted>{label}</T>
            </View>
          ))}
        </View>

        <T variant="caps" muted>Your topics</T>
        {topics.length === 0 ? (
          <Empty
            title="No topics yet"
            body="Post one and the likes and comments it gets will show up here."
            action={<Button title="Post a topic" onPress={() => router.push('/topic/new')} />}
          />
        ) : (
          topics.map((t) => (
            <Pressable key={t.id} onPress={() => router.push({ pathname: '/topic/[id]', params: { id: t.id } })} onLongPress={() => confirmDelete(t)}>
              <Card style={{ gap: 10 }}>
                <T variant="small" muted>Posted {timeAgo(t.created_at)}</T>
                <T variant="topic" style={{ fontSize: 18 }}>{t.body}</T>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="heart" filled size={18} color={colors.like} />
                    <T variant="label" style={{ color: colors.like }}>{t.like_count} likes</T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="comment" size={18} color={colors.muted} />
                    <T variant="label" muted>{t.comment_count} comments</T>
                  </View>
                </View>
                {t.last_comment_body ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }} numberOfLines={2}>
                    <Text style={{ fontFamily: fonts.bodySemi, color: colors.text }}>{t.last_comment_username} </Text>
                    {t.last_comment_body}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ))
        )}

        {profile.banned ? (
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.warnBg }}>
            <T variant="label" style={{ color: colors.warnFg }}>Your account is suspended</T>
            <T variant="small" style={{ color: colors.warnFg }}>
              A moderator suspended it for breaking the Terms of Use. You can’t post, message or call. Contact Support if you think this is a mistake.
            </T>
          </View>
        ) : null}

        {admin ? (
          <Button kind="secondary" title="Moderation: review reports" icon={<Icon name="flag" size={18} color={colors.text} />} onPress={() => router.push('/admin')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
