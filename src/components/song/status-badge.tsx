import type { SongStatus } from "@/lib/domain";
import { STATUS_LABEL } from "@/lib/domain";

const STYLES: Record<SongStatus, string> = {
  draft: "bg-line/60 text-ink-soft",
  pending_payment: "bg-gold/20 text-[#8a6d00]",
  paid: "bg-brand/15 text-brand-strong",
  generating: "bg-brand/15 text-brand-strong",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: SongStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
