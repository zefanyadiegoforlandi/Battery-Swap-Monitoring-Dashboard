"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Slot = {
    id: string;
    slot_number: number;
    state: "EMPTY" | "CHARGING" | "FULL" | "LOCKED" | "FAULT";
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

type ApiResponse = {
    data: {
        cabinet: Cabinet;
        slots: Slot[];
        hourly_swaps: HourlySwap[];
        transactions: Transaction[];
    };
};

const slotColors = {
    EMPTY: "bg-gray-200",
    CHARGING: "bg-yellow-300",
    FULL: "bg-green-400",
    LOCKED: "bg-blue-400",
    FAULT: "bg-red-400",
};

export default function CabinetDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [data, setData] = useState<ApiResponse["data"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCabinet() {
            try {
                const response = await fetch(`/api/cabinets/${id}`);

                if (!response.ok) {
                    throw new Error();
                }

                const result: ApiResponse = await response.json();

                setData(result.data);
            } catch {
                setError("Gagal mengambil data cabinet");
            } finally {
                setLoading(false);
            }
        }

        loadCabinet();
    }, [id]);

    if (loading) {
        return <p className="p-6">Loading...</p>;
    }

    if (error) {
        return <p className="p-6 text-red-500">{error}</p>;
    }

    if (!data) {
        return <p className="p-6">Data cabinet tidak ditemukan.</p>;
    }

    const maxSwap = Math.max(
        ...data.hourly_swaps.map((item) => item.total),
        1,
    );

    return (
        <main className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">
                    {data.cabinet.code}
                </h1>

                <p className="text-gray-500">
                    {data.cabinet.branch_name}
                </p>

                <p>
                    Status: {data.cabinet.status}
                </p>
            </div>

            <section>
                <h2 className="mb-4 text-xl font-semibold">
                    Slot
                </h2>

                {data.slots.length === 0 ? (
                    <p>Tidak ada data slot.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
                        {data.slots.map((slot) => (
                            <div
                                key={slot.id}
                                className={`rounded p-4 ${slotColors[slot.state]}`}
                            >
                                <p className="font-semibold">
                                    Slot {slot.slot_number}
                                </p>

                                <p>{slot.state}</p>

                                <p>
                                    SOC:{" "}
                                    {slot.soc_percent !== null
                                        ? `${slot.soc_percent}%`
                                        : "-"}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">
                    Swap 24 Jam
                </h2>

                {data.hourly_swaps.length === 0 ? (
                    <p>Tidak ada data swap.</p>
                ) : (
                    <div className="flex h-64 items-end gap-2">
                        {data.hourly_swaps.map((item) => (
                            <div
                                key={item.hour}
                                className="flex h-full flex-1 items-end"
                            >
                                <div
                                    className="w-full rounded-t bg-black"
                                    style={{
                                        height: `${(item.total / maxSwap) * 100}%`,
                                    }}
                                    title={`${item.total} swap`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-4 text-xl font-semibold">
                    Transaksi Swap Terakhir
                </h2>

                {data.transactions.length === 0 ? (
                    <p>Tidak ada transaksi swap.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="p-3">
                                        Slot
                                    </th>
                                    <th className="p-3">
                                        Battery
                                    </th>
                                    <th className="p-3">
                                        Waktu
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.transactions.map(
                                    (transaction) => (
                                        <tr
                                            key={transaction.id}
                                            className="border-b"
                                        >
                                            <td className="p-3">
                                                {transaction.slot_number}
                                            </td>

                                            <td className="p-3">
                                                {transaction.battery_id}
                                            </td>

                                            <td className="p-3">
                                                {new Date(
                                                    transaction.swapped_at,
                                                ).toLocaleString()}
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}