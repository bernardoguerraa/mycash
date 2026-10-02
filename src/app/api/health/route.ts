import { NextResponse } from 'next/server'

/**
 * Sonda de liveness para o orquestrador.
 *
 * Responde se o processo Node subiu e esta aceitando requisicao HTTP. E o que
 * o `HEALTHCHECK` do Dockerfile consulta, e o que o compose usa em
 * `condition: service_healthy` — sem isso, "pronto" significaria apenas que o
 * PID 1 nasceu, que e justamente o momento em que o Next ainda nao atende.
 *
 * De proposito NAO toca no Supabase. Health check que depende de servico
 * externo transforma indisponibilidade de terceiro em reinicio em laco: o
 * orquestrador mata um contentor saudavel porque o banco de outra empresa
 * esta fora. Dependencia externa e assunto de readiness, nao de liveness.
 *
 * `dynamic = 'force-dynamic'` impede o Next de responder isto como rota
 * estatica pre-renderizada — um timestamp congelado no build nao diria nada
 * sobre o processo que esta rodando agora.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
