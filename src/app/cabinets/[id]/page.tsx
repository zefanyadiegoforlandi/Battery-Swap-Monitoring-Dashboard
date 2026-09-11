"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CabinetDetailContent from "./CabinetDetailContent";

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

type ApiResponse = {
    data: CabinetDetail;
};

export default function CabinetDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [data, setData] = useState<CabinetDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;

        async function loadCabinet(): Promise<void> {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `/api/cabinets/${id}`,
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("not_found");
                    }

                    throw new Error("fetch_failed");
                }

                const result: ApiResponse =
                    await response.json();

                if (!ignore) {
                    setData(result.data);
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err instanceof Error &&
                            err.message === "not_found"
                            ? "Cabinet tidak ditemukan."
                            : "Gagal mengambil data cabinet. Coba muat ulang halaman.",
                    );
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadCabinet();

        return () => {
            ignore = true;
        };
    }, [id]);

    return (
        <CabinetDetailContent
            data={data}
            loading={loading}
            error={error}
        />
    );
}