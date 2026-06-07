import { FdBooking, FdMatch } from '../../services/football-data.service';

// ── Helpers puros de la página de ligas (sin estado de componente) ───────────
// Extraídos del componente para mantenerlo más pequeño y testeable por separado.

/**
 * Mapea la posición en inglés de football-data.org al vocabulario español
 * que usa `JugadorService` para validar posiciones.
 *
 * La API devuelve valores exactos ('Goalkeeper', 'Defender', 'Midfielder',
 * 'Attacker') pero también puede enviar `null` para jugadores sin posición
 * registrada. El switch-case exacto más keyword fallback cubre ambos casos.
 */
export function mapFdPosicion(position: string | null | undefined): string {
  if (!position) return 'Centrocampista';
  switch (position) {
    case 'Goalkeeper': return 'Portero';
    case 'Defender':   return 'Defensa';
    case 'Midfielder': return 'Centrocampista';
    case 'Attacker':   return 'Delantero';
    default: {
      // Keyword fallback for unexpected / future API values.
      const p = position.toLowerCase();
      if (p.includes('goal') || p.includes('keeper') || p.includes('portero'))
        return 'Portero';
      if (p.includes('defend') || p.includes('back') || p.includes('defens'))
        return 'Defensa';
      if (p.includes('attack') || p.includes('forward') || p.includes('winger') ||
          p.includes('striker') || p.includes('delan'))
        return 'Delantero';
      return 'Centrocampista';
    }
  }
}

/**
 * Separa el nombre completo que devuelve football-data.org (p.ej.
 * "Robert Lewandowski") en nombre + apellidos para que la API los almacene
 * correctamente. La primera palabra es el nombre; el resto, los apellidos.
 */
export function splitNombre(full: string | null | undefined): { nombre: string; apellidos?: string } {
  const limpio = (full ?? '').trim().replace(/\s+/g, ' ');
  if (!limpio) return { nombre: 'Sin nombre' };
  const partes = limpio.split(' ');
  if (partes.length === 1) return { nombre: partes[0] };
  return { nombre: partes[0], apellidos: partes.slice(1).join(' ') };
}

export interface MatchStats {
  amarillas: number;
  rojas: number;
  minutos: number;
}

/**
 * Agrega tarjetas y minutos jugados de una lista de partidos finalizados,
 * desde la perspectiva del equipo con ID `fdTeamId`.
 *
 * Fuente de datos (campos de `FdMatch` documentados en football-data.org):
 *   · `bookings[]`            → tarjetas amarillas/rojas por jugador
 *   · `homeTeam.lineup[]`     → alineación titular (90 min si no fue sustituido)
 *   · `substitutions[]`       → minuto de salida/entrada para calcular tiempo exacto
 *
 * Cálculo de minutos por partido:
 *   · Titular no sustituido          → 90 min
 *   · Titular sustituido en minuto X → X min
 *   · Suplente que entra en minuto X → (90 − X) min
 *
 * Todos los arrays se tratan como opcionales: si la API no los devuelve
 * (plan gratuito o partido sin datos detallados), se usa `?? []`.
 */
export function agregarStatsDePartidos(
  partidos: FdMatch[],
  fdTeamId: number,
): Map<number, MatchStats> {
  const mapa = new Map<number, MatchStats>();

  function obtener(id: number): MatchStats {
    if (!mapa.has(id)) mapa.set(id, { amarillas: 0, rojas: 0, minutos: 0 });
    return mapa.get(id)!;
  }

  for (const match of partidos) {
    // ── Tarjetas (bookings) ─────────────────────────────────────────────────
    for (const b of (match.bookings ?? []) as FdBooking[]) {
      if (b.team?.id !== fdTeamId || !b.player?.id) continue;
      const stats = obtener(b.player.id);
      if (b.card === 'YELLOW') {
        stats.amarillas++;
      } else if (b.card === 'RED' || b.card === 'YELLOW_RED') {
        stats.rojas++;
      }
    }

    // ── Minutos jugados (lineup + substitutions) ────────────────────────────
    const ourTeam = match.homeTeam.id === fdTeamId ? match.homeTeam : match.awayTeam;
    const subs    = (match.substitutions ?? []).filter(s => s.team?.id === fdTeamId);

    for (const player of (ourTeam.lineup ?? [])) {
      const subOut = subs.find(s => s.playerOut?.id === player.id);
      obtener(player.id).minutos += subOut ? subOut.minute : 90;
    }

    for (const sub of subs) {
      if (!sub.playerIn?.id) continue;
      obtener(sub.playerIn.id).minutos += Math.max(0, 90 - sub.minute);
    }
  }

  return mapa;
}
