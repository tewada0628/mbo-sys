import { SendEmailCommand, SESv2Client } from 'npm:@aws-sdk/client-sesv2';

type NotificationEmailPayload = {
  to: string;
  recipientName: string;
  subject: string;
  message: string;
  type: string;
  notificationId: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNotificationEmailPayload(value: unknown): value is NotificationEmailPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    isString(payload.to) &&
    isString(payload.recipientName) &&
    isString(payload.subject) &&
    isString(payload.message) &&
    isString(payload.type) &&
    isString(payload.notificationId)
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const awsRegion = Deno.env.get('AWS_REGION') ?? Deno.env.get('AWS_DEFAULT_REGION');
  const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const awsSessionToken = Deno.env.get('AWS_SESSION_TOKEN');
  const fromEmail = Deno.env.get('SES_FROM_EMAIL');
  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL');

  if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey || !fromEmail) {
    return jsonResponse({ error: 'AWS SES environment variables are not configured.' }, 500);
  }

  const payload = await req.json().catch(() => null);
  if (!isNotificationEmailPayload(payload)) {
    return jsonResponse({ error: 'Invalid payload' }, 400);
  }

  const safeRecipientName = escapeHtml(payload.recipientName);
  const safeMessage = escapeHtml(payload.message);
  const notificationUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/notifications` : null;

  const html = `
    <p>${safeRecipientName}さん</p>
    <p>MBO System に新しい通知があります。</p>
    <p>${safeMessage}</p>
    ${notificationUrl ? `<p><a href="${notificationUrl}">通知を確認する</a></p>` : ''}
  `;

  const sesClient = new SESv2Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      sessionToken: awsSessionToken,
    },
  });

  try {
    await sesClient.send(new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: {
        ToAddresses: [payload.to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: payload.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: `${payload.recipientName}さん\n\nMBO System に新しい通知があります。\n\n${payload.message}`,
              Charset: 'UTF-8',
            },
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
          },
        },
      },
    }));
  } catch (error) {
    return jsonResponse({
      error: 'AWS SES request failed',
      detail: error instanceof Error ? error.message : String(error),
    }, 502);
  }

  return jsonResponse({ success: true });
});
