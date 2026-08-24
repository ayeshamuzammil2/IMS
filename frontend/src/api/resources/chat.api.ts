import { client } from '../client';
import { endpoints } from '../endpoints';

export interface ChatContactDto {
  userId: number;
  fullName: string;
  email: string;
  role: 'Admin' | 'Mentor' | 'Intern';
  lastMessageBody: string | null;
  lastMessageAtUtc: string | null;
  unreadCount: number;
}

export interface ChatMessageDto {
  id: number;
  senderUserId: number;
  recipientUserId: number;
  body: string;
  sentAtUtc: string;
  isMine: boolean;
}

export const chatApi = {
  getContacts: () => client.get<ChatContactDto[]>(endpoints.chat.contacts).then((r) => r.data),

  getMessages: (otherUserId: number) => client.get<ChatMessageDto[]>(endpoints.chat.messages(otherUserId)).then((r) => r.data),

  sendMessage: (otherUserId: number, body: string) =>
    client.post<ChatMessageDto>(endpoints.chat.messages(otherUserId), { body }).then((r) => r.data),
};
