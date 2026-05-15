export const ATG_SERVICE_TIME_MIN = 30;
const ATG_SERVICE_TIME_SEC = ATG_SERVICE_TIME_MIN * 60;

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
  toRdvMs: number;
  arrivalMs: number;
  travelSeconds: number;
  availableSeconds: number;
  shortfallSeconds: number;
}

export function evaluateChain(
  chain: ChainStop[],
  legDurationsSec: number[],
): FeasibilityConflict[] {
  const conflicts: FeasibilityConflict[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const travel = legDurationsSec[i];
    if (typeof travel !== 'number' || !Number.isFinite(travel) || travel <= 0) continue;
    const available = Math.floor((chain[i + 1].rdvMs - chain[i].rdvMs) / 1000);
    const fromIsOrigin = chain[i].isOrigin === true;
    const serviceTime = fromIsOrigin ? 0 : ATG_SERVICE_TIME_SEC;
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
        toRdvMs: chain[i + 1].rdvMs,
        arrivalMs: chain[i].rdvMs + serviceTime * 1000 + travel * 1000,
        travelSeconds: travel,
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
