"use client";

import { useRouter } from "next/navigation";

type SlotState =
    | "EMPTY"
    | "CHARGING"
    | "FULL"
    | "LOCKED"
    | "FAULT";

type Slot = {
    id: string;
    slot_number: number;
    state: SlotState;
    soc_percent: number | null;
};

type Transaction = {
    id: string;
    slot_number: number;
    swapped_at: string;
    battery_id: string;
};

type Cabinet = {
    id: string;
    code: string;
    branch_name: string;
    status: string;
    total_slots: number;
    last_heartbeat_at: string | null;
};

type HourlySwap = {
    hour: string;
    total: number;
};

type CabinetDetail = {
    cabinet: Cabinet;
    slots: Slot[];
    hourly_swaps: HourlySwap[];
    transactions: Transaction[];
};

type CabinetDetailContentProps = {
    data: CabinetDetail | null;
    loading: boolean;
    error: string;
};

const SLOT_STYLES: Record<
    SlotState,
    { dot: string }
> = {
    EMPTY: {
        dot: "border border-[#1B5E20]/30 bg-transparent",
    },
    CHARGING: {
        dot: "bg-[#FFB74D]",
    },
    FULL: {
        dot: "bg-[#66BB6A]",
    },
    LOCKED: {
        dot: "bg-[#78909C]",
    },
    FAULT: {
        dot: "bg-[#E57373]",
    },
};

const STATUS_DOT: Record<string, string> = {
    ONLINE: "bg-[#66BB6A]",
    MAINTENANCE: "bg-[#FFB74D]",
    OFFLINE:
        "border border-[#1B5E20] bg-transparent",
};

export default function CabinetDetailContent({
    data,
    loading,
    error,
}: CabinetDetailContentProps) {
    const router = useRouter();

    const maxSwap = data
        ? Math.max(
              ...data.hourly_swaps.map(
                  (item) => item.total,
              ),
              1,
          )
        : 1;

    return (
        <main className="min-h-screen bg-[#E8F5E9] px-6 py-12 text-[#1B5E20] md:px-12 md:py-16 lg:px-20">
            <div className="mx-auto max-w-6xl">
                <button
                    onClick={() =>
                        router.push("/cabinets")
                    }
                    className="mb-8 border-b border-transparent text-sm text-[#1B5E20]/60 hover:border-[#66BB6A] hover:text-[#66BB6A]"
                >
                    ← Semua cabinet
                </button>

                {loading && (
                    <p className="text-[#1B5E20]/60">
                        Memuat data cabinet…
                    </p>
                )}

                {!loading && error && (
                    <p className="text-[#1B5E20]">
                        {error}
                    </p>
                )}

                {!loading &&
                    !error &&
                    !data && (
                        <p className="text-[#1B5E20]/60">
                            Data cabinet tidak ditemukan.
                        </p>
                    )}

                {!loading &&
                    !error &&
                    data && (
                        <>
                            <div className="grid grid-cols-1 gap-8 border-b border-[#A5D6A7] pb-10 md:grid-cols-12 md:items-end md:gap-6">
                                <div className="md:col-span-7">
                                    <p className="mb-3 text-sm text-[#1B5E20]/60">
                                        {
                                            data.cabinet
                                                .branch_name
                                        }
                                    </p>

                                    <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                                        {
                                            data.cabinet
                                                .code
                                        }
                                    </h1>
                                </div>

                                <div className="flex flex-col gap-2 md:col-span-5 md:items-end">
                                    <span className="inline-flex items-center gap-2 text-base">
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                STATUS_DOT[
                                                    data
                                                        .cabinet
                                                        .status
                                                ] ??
                                                "bg-[#1B5E20]/30"
                                            }`}
                                        />

                                        {
                                            data.cabinet
                                                .status
                                        }
                                    </span>

                                    <span className="text-sm text-[#1B5E20]/60">
                                        Heartbeat terakhir:{" "}
                                        {data.cabinet
                                            .last_heartbeat_at
                                            ? new Date(
                                                  data.cabinet.last_heartbeat_at,
                                              ).toLocaleString(
                                                  "id-ID",
                                              )
                                            : "—"}
                                    </span>
                                </div>
                            </div>

                            <section className="border-b border-[#A5D6A7] py-10">
                                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                    <h2 className="text-xl font-semibold">
                                        Slot baterai
                                    </h2>

                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#1B5E20]/60">
                                        {(
                                            Object.keys(
                                                SLOT_STYLES,
                                            ) as SlotState[]
                                        ).map(
                                            (
                                                state,
                                            ) => (
                                                <span
                                                    key={
                                                        state
                                                    }
                                                    className="inline-flex items-center gap-1.5"
                                                >
                                                    <span
                                                        className={`h-2 w-2 rounded-full ${SLOT_STYLES[state].dot}`}
                                                    />

                                                    {
                                                        state
                                                    }
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>

                                {data.slots.length ===
                                0 ? (
                                    <p className="text-[#1B5E20]/60">
                                        Tidak ada data slot
                                        untuk cabinet ini.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                                        {data.slots.map(
                                            (slot) => (
                                                <div
                                                    key={
                                                        slot.id
                                                    }
                                                    className="border border-[#1B5E20]/15 bg-white/40 p-3"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="text-sm font-medium">
                                                            {
                                                                slot.slot_number
                                                            }
                                                        </span>

                                                        <span
                                                            className={`h-2 w-2 rounded-full ${SLOT_STYLES[slot.state].dot}`}
                                                        />
                                                    </div>

                                                    <p className="text-xs text-[#1B5E20]/60">
                                                        {
                                                            slot.state
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-sm">
                                                        {slot.soc_percent !==
                                                        null
                                                            ? `${slot.soc_percent}%`
                                                            : "—"}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="border-b border-[#A5D6A7] py-10">
                                <h2 className="mb-6 text-xl font-semibold">
                                    Swap per jam, 24 jam
                                    terakhir
                                </h2>

                                {data.hourly_swaps
                                    .length === 0 ? (
                                    <p className="text-[#1B5E20]/60">
                                        Tidak ada data swap.
                                    </p>
                                ) : (
                                    <div className="flex h-48 items-end gap-1.5">
                                        {data.hourly_swaps.map(
                                            (item) => (
                                                <div
                                                    key={
                                                        item.hour
                                                    }
                                                    className="group flex h-full flex-1 flex-col items-center justify-end"
                                                >
                                                    <span className="mb-1 text-[10px] text-[#1B5E20]/0 group-hover:text-[#1B5E20]/60">
                                                        {
                                                            item.total
                                                        }
                                                    </span>

                                                    <div
                                                        className="w-full bg-[#66BB6A]"
                                                        style={{
                                                            height: `${(item.total / maxSwap) * 100}%`,
                                                            minHeight:
                                                                item.total >
                                                                0
                                                                    ? "2px"
                                                                    : "1px",
                                                        }}
                                                        title={`${new Date(item.hour).toLocaleTimeString(
                                                            "id-ID",
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            },
                                                        )} — ${item.total} swap`}
                                                    />
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="py-10">
                                <h2 className="mb-6 text-xl font-semibold">
                                    20 transaksi swap
                                    terakhir
                                </h2>

                                {data.transactions
                                    .length === 0 ? (
                                    <p className="text-[#1B5E20]/60">
                                        Belum ada transaksi
                                        swap.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[480px] border-collapse text-left">
                                            <thead>
                                                <tr className="border-b border-[#1B5E20]/20 text-sm text-[#1B5E20]/60">
                                                    <th className="py-3 pr-4 font-normal">
                                                        Slot
                                                    </th>

                                                    <th className="py-3 pr-4 font-normal">
                                                        Baterai
                                                    </th>

                                                    <th className="py-3 font-normal">
                                                        Waktu
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {data.transactions.map(
                                                    (
                                                        transaction,
                                                    ) => (
                                                        <tr
                                                            key={
                                                                transaction.id
                                                            }
                                                            className="border-b border-[#1B5E20]/10"
                                                        >
                                                            <td className="py-3 pr-4">
                                                                {
                                                                    transaction.slot_number
                                                                }
                                                            </td>

                                                            <td className="py-3 pr-4">
                                                                {
                                                                    transaction.battery_id
                                                                }
                                                            </td>

                                                            <td className="py-3 text-[#1B5E20]/70">
                                                                {new Date(
                                                                    transaction.swapped_at,
                                                                ).toLocaleString(
                                                                    "id-ID",
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
            </div>
        </main>
    );
}