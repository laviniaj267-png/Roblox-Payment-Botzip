interface SetupSession {
  channelId?: string;
  productIds: string[];
  message: string;
}

const sessions = new Map<string, SetupSession>();

export function initSetupSession(userId: string, message: string): void {
  sessions.set(userId, { productIds: [], message });
}

export function updateSetupSession(userId: string, data: Partial<SetupSession>): void {
  const existing = sessions.get(userId) ?? { productIds: [], message: "" };
  sessions.set(userId, { ...existing, ...data });
}

export function getSetupSession(userId: string): SetupSession | undefined {
  return sessions.get(userId);
}

export function clearSetupSession(userId: string): void {
  sessions.delete(userId);
}
