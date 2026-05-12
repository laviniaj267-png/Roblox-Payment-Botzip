export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  avatarUrl: string;
}

export async function getRobloxUserByUsername(username: string): Promise<RobloxUser | null> {
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: Array<{ id: number; name: string; displayName: string }> };
    if (!data.data || data.data.length === 0) return null;
    const user = data.data[0];
    const avatarUrl = await getRobloxAvatarUrl(user.id);
    return { id: user.id, name: user.name, displayName: user.displayName, avatarUrl };
  } catch {
    return null;
  }
}

export async function getRobloxAvatarUrl(userId: number): Promise<string> {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
    );
    if (!res.ok) return "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png";
    const data = (await res.json()) as { data: Array<{ imageUrl: string }> };
    return data.data?.[0]?.imageUrl ?? "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png";
  } catch {
    return "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png";
  }
}

export async function checkGamePassOwnership(userId: number, gamePassId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${gamePassId}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { data: unknown[] };
    return Array.isArray(data.data) && data.data.length > 0;
  } catch {
    return false;
  }
}

export async function getGamePassInfo(gamePassId: string): Promise<{ name: string; price: number } | null> {
  try {
    const res = await fetch(`https://economy.roblox.com/v1/game-passes/${gamePassId}/game-pass-product-info`);
    if (!res.ok) return null;
    const data = (await res.json()) as { Name: string; PriceInRobux: number };
    return { name: data.Name, price: data.PriceInRobux };
  } catch {
    return null;
  }
}
