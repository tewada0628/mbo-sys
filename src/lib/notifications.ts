import 'server-only';

import type { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';

type NotificationClient = PrismaClient | Prisma.TransactionClient;

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type CreateNotificationInput = {
  employeeId: string;
  type: string;
  message: string;
  sendEmail?: boolean;
  emailSubject?: string;
  client?: NotificationClient;
};

type NotificationEmailPayload = {
  to: string;
  recipientName: string;
  subject: string;
  message: string;
  type: string;
  notificationId: string;
};

export type NotificationEmailResult =
  | { sent: true }
  | { sent: false; skipped: true; reason: string };

function getNotificationEdgeFunctionUrl() {
  if (process.env.NOTIFICATION_EDGE_FUNCTION_URL) {
    return process.env.NOTIFICATION_EDGE_FUNCTION_URL;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification-email`;
  }

  return null;
}

function getNotificationEdgeFunctionToken() {
  return process.env.NOTIFICATION_EDGE_FUNCTION_TOKEN ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export async function sendNotificationEmail(
  payload: NotificationEmailPayload,
): Promise<NotificationEmailResult> {
  const url = getNotificationEdgeFunctionUrl();
  const token = getNotificationEdgeFunctionToken();

  if (!url || !token) {
    return {
      sent: false,
      skipped: true,
      reason: 'Notification Edge Function URL or token is not configured.',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Notification email failed: ${response.status} ${body}`);
  }

  return { sent: true };
}

export async function createNotification({
  employeeId,
  type,
  message,
  sendEmail = false,
  emailSubject = 'MBO System 通知',
  client = prisma,
}: CreateNotificationInput) {
  const notification = await client.notification.create({
    data: {
      employeeId,
      type,
      message,
    },
  });

  if (!sendEmail) {
    return notification;
  }

  const recipient = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { email: true, name: true },
  });

  if (!recipient) {
    return notification;
  }

  await sendNotificationEmail({
    to: recipient.email,
    recipientName: recipient.name,
    subject: emailSubject,
    message,
    type,
    notificationId: notification.id,
  }).catch((error) => {
    console.error('Error sending notification email:', error);
  });

  return notification;
}

export async function createNotifications(
  inputs: Omit<CreateNotificationInput, 'sendEmail' | 'emailSubject' | 'client'>[],
  client: NotificationClient = prisma,
) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  return client.notification.createMany({
    data: inputs.map(({ employeeId, type, message }) => ({
      employeeId,
      type,
      message,
    })),
  });
}
