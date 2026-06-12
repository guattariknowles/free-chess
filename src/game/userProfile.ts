export type UserProfile = {
  createdAt: string;
  id: string;
  name: string;
  notes?: string;
  updatedAt: string;
};

type CreateUserProfileOptions = {
  createdAt?: string;
  id?: string;
  name: string;
  notes?: string;
};

function createId(now: string): string {
  return `profile-${Date.parse(now)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function createUserProfile({
  createdAt = new Date().toISOString(),
  id,
  name,
  notes,
}: CreateUserProfileOptions): UserProfile {
  const normalizedName = normalizeProfileName(name);

  if (!normalizedName) {
    throw new Error('档案名称不能为空');
  }

  if (normalizedName.length > 24) {
    throw new Error('档案名称最多 24 个字符');
  }

  return {
    createdAt,
    id: id ?? createId(createdAt),
    name: normalizedName,
    notes: notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Partial<UserProfile>;

  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.createdAt === 'string' &&
    typeof profile.updatedAt === 'string' &&
    (profile.notes === undefined || typeof profile.notes === 'string')
  );
}
