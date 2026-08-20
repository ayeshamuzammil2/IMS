import { client } from '../client';
import { endpoints } from '../endpoints';

export interface NotificationDto {
  id: number;
  title: string;
  body: string;
  type: string;
  category: string;
  actionRoute: string | null;
  isRead: boolean;
  createdAtUtc: string;
}

export interface NotificationListResponse {
  items: NotificationDto[];
  totalCount: number;
}

export const notificationsApi = {
  list: (unreadOnly = false, page = 1, pageSize = 50) =>
    client
      .get<NotificationListResponse>(endpoints.notifications.list, { params: { unreadOnly, page, pageSize } })
      .then((r) => r.data),

  unreadCount: () => client.get<{ count: number }>(endpoints.notifications.unreadCount).then((r) => r.data.count),

  markRead: (id: number) => client.put(endpoints.notifications.markRead(id)),

  markAllRead: () => client.put(endpoints.notifications.markAllRead),
};
