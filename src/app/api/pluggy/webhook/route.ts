import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncPluggyItem } from '@/lib/pluggy/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook Pluggy.
 * Eventos relevantes:
 *   - item/created, item/updated, item/error, item/deleted
 *   - transactions/created, transactions/updated, transactions/deleted
 *   - connector/status_updated
 *
 * Validação: Pluggy envia X-Pluggy-Signature (HMAC SHA-256 do body com client_secret).
 * No sandbox pode estar ausente; em prod SEMPRE validar.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text()
  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const db = createServiceClient()

  // Log bruto (idempotência + auditoria)
  const eventId = event.id || event.eventId || `${event.event}-${event.itemId}-${Date.now()}`
  const itemId = event.itemId || event.data?.itemId

  const { data: existing } = await db
    .from('pluggy_webhook_events')
    .select('id, processed')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing?.processed) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const { data: wh } = await db
    .from('pluggy_webhook_events')
    .upsert(
      {
        event_id: eventId,
        event_type: event.event || 'unknown',
        pluggy_item_id: itemId,
        payload: event,
      },
      { onConflict: 'event_id' }
    )
    .select()
    .single()

  try {
    switch (event.event) {
      case 'item/created':
      case 'item/updated':
      case 'transactions/created':
      case 'transactions/updated': {
        if (!itemId) break

        const { data: conn } = await db
          .from('pluggy_connections')
          .select('id_usuario')
          .eq('pluggy_item_id', itemId)
          .maybeSingle()

        if (!conn) break

        await syncPluggyItem(db as any, itemId, conn.id_usuario)
        break
      }

      case 'item/deleted': {
        if (!itemId) break
        await db
          .from('pluggy_connections')
          .update({ status: 'DELETED' })
          .eq('pluggy_item_id', itemId)
        break
      }

      case 'item/error': {
        if (!itemId) break
        await db
          .from('pluggy_connections')
          .update({
            status: 'ERROR',
            error_code: event.data?.code || null,
            error_message: event.data?.message || null,
          })
          .eq('pluggy_item_id', itemId)
        break
      }

      default:
        // evento desconhecido — só loga
        break
    }

    if (wh) {
      await db
        .from('pluggy_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', wh.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('webhook error', err)
    if (wh) {
      await db
        .from('pluggy_webhook_events')
        .update({ error: String(err?.message || err) })
        .eq('id', wh.id)
    }
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'pluggy webhook ok' })
}
