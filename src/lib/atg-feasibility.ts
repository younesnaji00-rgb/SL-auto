// Time the agent needs on site for a stop: park, find the vehicle, introduce
// themselves, take the photos. Applied once per distinct address in the chain.
export const ATG_SERVICE_TIME_MIN = 30;
// When the next planification is at the SAME address (several vehicles at one
// garage, a fleet at a company car park, ...), the agent is already there and
// introduced: only the photo/inspection time of the extra vehicle is added.
export const ATG_SAME_STOP_TIME_MIN = 10;

const ATG_SERVICE_TIME_SEC = ATG_SERVICE_TIME_MIN * 60;
const ATG_SAME_STOP_TIME_SEC = ATG_SAME_STOP_TIME_MIN * 60;

export interface ChainStop {
  id: string;
  address: string;
  rdvMs: number;
  label: string;
  isOrigin?: boolean;
}

export interface FeasibilityConflict {
  fromStopIdx: number;
  toStopIdx: number;
  fromLabel: string;
  toLabel: string;
  fromAddress: string;
  toAddress: string;
  fromIsOrigin: boolean;
  /** true when both stops share the same address (10 min rule instead of 30). */
  sameStop: boolean;
  toRdvMs: number;
  arrivalMs: number;
  travelSeconds: number;
  serviceSeconds: number;
  availableSeconds: number;
  shortfallSeconds: number;
}

/**
 * Loose address equality: case/accents/punctuation/whitespace-insensitive so
 * "12, Bd Zerktouni – Casablanca" and "12 bd zerktouni casablanca" count as the
 * same stop. Free-text addresses typed by different gestionnaires rarely match
 * byte-for-byte.
 */
export function normalizeAddress(address: string): string {
  return address
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isSameStop(a: ChainStop, b: ChainStop): boolean {
  if (a.isOrigin || b.isOrigin) return false;
  const na = normalizeAddress(a.address);
  const nb = normalizeAddress(b.address);
  return na.length > 0 && na === nb;
}

/** Seconds the agent must spend at stop `i` before leaving for stop `i + 1`. */
export function serviceTimeSec(chain: ChainStop[], i: number): number {
  if (chain[i].isOrigin) return 0;
  return isSameStop(chain[i], chain[i + 1]) ? ATG_SAME_STOP_TIME_SEC : ATG_SERVICE_TIME_SEC;
}

/**
 * Walk the day's chain and flag every leg where travel + on-site time does not
 * fit between two consecutive RDVs.
 *
 * `legDurationsSec[i]` is the driving time from stop i to stop i+1. A leg whose
 * value is not a finite number (Distance Matrix returned NOT_FOUND, etc.) is
 * skipped. A leg of 0 s is legitimate for same-address stops and is still
 * evaluated, because the on-site time alone can make the slot infeasible.
 */
export function evaluateChain(
  chain: ChainStop[],
  legDurationsSec: number[],
): FeasibilityConflict[] {
  const conflicts: FeasibilityConflict[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const sameStop = isSameStop(chain[i], chain[i + 1]);
    const raw = legDurationsSec[i];
    let travel: number;
    if (sameStop) {
      travel = 0;
    } else if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      travel = raw;
    } else {
      continue;
    }
    const available = Math.floor((chain[i + 1].rdvMs - chain[i].rdvMs) / 1000);
    const fromIsOrigin = chain[i].isOrigin === true;
    const serviceTime = serviceTimeSec(chain, i);
    const required = travel + serviceTime;
    if (required > available) {
      conflicts.push({
        fromStopIdx: i,
        toStopIdx: i + 1,
        fromLabel: chain[i].label,
        toLabel: chain[i + 1].label,
        fromAddress: chain[i].address,
        toAddress: chain[i + 1].address,
        fromIsOrigin,
        sameStop,
        toRdvMs: chain[i + 1].rdvMs,
        arrivalMs: chain[i].rdvMs + serviceTime * 1000 + travel * 1000,
        travelSeconds: travel,
        serviceSeconds: serviceTime,
        availableSeconds: available,
        shortfallSeconds: required - available,
      });
    }
  }
  return conflicts;
}

export function formatDurationFr(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}
