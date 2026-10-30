import { supabase } from './supabase';

export type ProfileImageKind = 'avatar' | 'cover';

const BUCKET = 'profile-images';

/** Public web address of a profile picture or cover image. */
export function profileImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const SHAPE: Record<ProfileImageKind, { aspect: [number, number]; width: number }> = {
  avatar: { aspect: [1, 1], width: 512 },
  cover: { aspect: [16, 9], width: 1280 },
};

/**
 * Lets the person pick a photo, crops it to the right shape, shrinks it and
 * uploads it to their own folder. Returns the stored path, or null if they cancelled.
 */
export async function pickAndUploadProfileImage(userId: string, kind: ProfileImageKind): Promise<string | null> {
  const shape = SHAPE[kind];
  // Loaded only when needed, so an older app build without these native parts
  // still opens; it just can't change photos until it's updated.
  let ImagePicker: typeof import('expo-image-picker');
  let Manip: typeof import('expo-image-manipulator');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ImagePicker = require('expo-image-picker');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Manip = require('expo-image-manipulator');
  } catch {
    throw new Error('Update Nooks Owl to the latest version to change photos.');
  }
  const { ImageManipulator, SaveFormat } = Manip;
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: shape.aspect,
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];

  // Shrink big photos so uploads are quick and cheap to show.
  const ctx = ImageManipulator.manipulate(asset.uri);
  if ((asset.width ?? 0) > shape.width) ctx.resize({ width: shape.width });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  const bytes = await (await fetch(saved.uri)).arrayBuffer();
  const path = `${userId}/${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return path;
}

/** Removes an old image file. Best effort: a leftover file is harmless. */
export async function deleteProfileImage(path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]).then(
    () => {},
    () => {},
  );
}
