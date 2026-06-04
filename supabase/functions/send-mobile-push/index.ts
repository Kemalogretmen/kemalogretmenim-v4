import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotificationEvent = {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type PushToken = {
  id: string;
  expo_push_token: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('MOBILE_PUSH_CRON_SECRET') || '';
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Missing Supabase function environment' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';

  let query = supabase
    .from('mobile_notification_events')
    .select('id,recipient_id,title,body,data')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);

  if (eventId) {
    query = query.eq('id', eventId);
  }

  const { data: events, error: eventError } = await query;
  if (eventError) {
    return json({ error: eventError.message }, 500);
  }

  const rows = (events || []) as NotificationEvent[];
  const result = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const event of rows) {
    result.processed += 1;

    const { data: tokens, error: tokenError } = await supabase
      .from('device_push_tokens')
      .select('id,expo_push_token')
      .eq('user_id', event.recipient_id)
      .eq('active', true);

    if (tokenError) {
      await supabase
        .from('mobile_notification_events')
        .update({
          status: 'failed',
          attempts: 1,
          last_error: tokenError.message,
        })
        .eq('id', event.id);
      result.failed += 1;
      continue;
    }

    const activeTokens = ((tokens || []) as PushToken[]).filter((token) => token.expo_push_token.startsWith('ExponentPushToken['));
    if (!activeTokens.length) {
      await supabase
        .from('mobile_notification_events')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: 'No active device token',
        })
        .eq('id', event.id);
      result.skipped += 1;
      continue;
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activeTokens.map((token) => ({
        to: token.expo_push_token,
        title: event.title,
        body: event.body,
        data: event.data || {},
        sound: 'default',
      }))),
    });

    const expoJson = await expoResponse.json().catch(() => ({}));
    if (!expoResponse.ok) {
      await supabase
        .from('mobile_notification_events')
        .update({
          status: 'failed',
          attempts: 1,
          last_error: JSON.stringify(expoJson).slice(0, 500),
        })
        .eq('id', event.id);
      result.failed += 1;
      continue;
    }

    const tickets = Array.isArray(expoJson.data) ? expoJson.data : [];
    const invalidTokenIds = tickets
      .map((ticket: Record<string, unknown>, index: number) => (
        ticket.status === 'error' && ticket.details && (ticket.details as Record<string, unknown>).error === 'DeviceNotRegistered'
          ? activeTokens[index]?.id
          : ''
      ))
      .filter(Boolean);

    if (invalidTokenIds.length) {
      await supabase
        .from('device_push_tokens')
        .update({ active: false })
        .in('id', invalidTokenIds);
    }

    await supabase
      .from('mobile_notification_events')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        attempts: 1,
        last_error: '',
      })
      .eq('id', event.id);
    result.sent += activeTokens.length;
  }

  return json(result);
});
