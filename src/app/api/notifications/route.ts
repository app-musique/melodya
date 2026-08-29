import { json, requireUser } from "@/lib/api";
import { listNotifications, unreadCount } from "@/lib/notifications";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  const [items, unread] = await Promise.all([
    listNotifications(user!.id),
    unreadCount(user!.id),
  ]);
  return json({ items, unread });
}
