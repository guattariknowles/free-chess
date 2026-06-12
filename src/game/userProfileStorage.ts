import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type UserProfile,
  isUserProfile,
} from './userProfile';

const STORAGE_KEY = '@free-chess/user-profiles/v1';

export async function loadUserProfiles(): Promise<UserProfile[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isUserProfile)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

async function writeProfiles(
  profiles: UserProfile[],
): Promise<UserProfile[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}

export async function saveUserProfile(
  profile: UserProfile,
): Promise<UserProfile[]> {
  const profiles = await loadUserProfiles();
  const nextProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = profiles.findIndex(
    (item) => item.id === profile.id,
  );

  if (existingIndex === -1) {
    return writeProfiles([...profiles, nextProfile]);
  }

  return writeProfiles(
    profiles.map((item) =>
      item.id === profile.id ? nextProfile : item,
    ),
  );
}

export async function deleteUserProfile(
  id: string,
): Promise<UserProfile[]> {
  const profiles = await loadUserProfiles();
  return writeProfiles(profiles.filter((profile) => profile.id !== id));
}
