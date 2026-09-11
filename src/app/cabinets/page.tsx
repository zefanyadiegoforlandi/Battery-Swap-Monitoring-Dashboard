"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CabinetsTable from "./CabinetsTable";

type Cabinet = {
    id: string;
    code: string;
    branch_name: string;
    status: string;
    occupied_slots: number;
    total_slots: number;
    swap_24h: number;
    last_heartbeat_at: string | null;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
};

export default function CabinetsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

    const pageParam = Number(searchParams.get("page") || 1);
    const page =
        Number.isInteger(pageParam) && pageParam >= 1
            ? pageParam
            : 1;

    const [search, setSearch] = useState(q);
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [pagination, setPagination] =
        useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setSearch(q);

        let ignore = false;

        async function loadCabinets() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `/api/cabinets?q=${encodeURIComponent(
                        q,
                    )}&status=${encodeURIComponent(
                        status,
                    )}&sort=${encodeURIComponent(
                        sort,
                    )}&page=${page}`,
                );

                if (!response.ok) {
                    throw new Error();
                }

                const result = await response.json();

                if (!ignore) {
                    setCabinets(result.data);
                    setPagination(result.pagination);
                }
            } catch {
                if (!ignore) {
                    setError(
                        "Gagal mengambil data cabinet. Coba muat ulang halaman.",
                    );
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadCabinets();

        return () => {
            ignore = true;
        };
    }, [q, status, sort, page]);

    function updateParams(
        next: Record<string, string | null>,
    ) {
        const params = new URLSearchParams(
            searchParams.toString(),
        );

        for (const [key, value] of Object.entries(next)) {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }

        router.push(`/cabinets?${params.toString()}`);
    }

    function searchCabinet() {
        updateParams({
            q: search || null,
            page: "1",
        });
    }

    function changeStatus(value: string) {
        updateParams({
            status: value || null,
            page: "1",
        });
    }

    function changeSort(value: "asc" | "desc") {
        updateParams({
            sort: value,
            page: "1",
        });
    }

    function changePage(value: number) {
        updateParams({
            page: String(value),
        });
    }

    return (
        <main className="min-h-screen bg-[#E8F5E9] px-6 py-12 text-[#1B5E20] md:px-12 md:py-16 lg:px-20">
            <div className="mx-auto max-w-6xl">
                <div className="grid grid-cols-1 gap-8 border-b border-[#A5D6A7] pb-10 md:grid-cols-12 md:items-end md:gap-6">
                    <div className="md:col-span-7">
                        <p className="mb-3 text-sm text-[#1B5E20]/60">
                            Monitoring jaringan
                        </p>

                        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                            Battery Swap Cabinets
                        </h1>
                    </div>

                    <div className="flex flex-col gap-4 md:col-span-5">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label
                                    htmlFor="cabinet-search"
                                    className="mb-1 block text-sm text-[#1B5E20]/60"
                                >
                                    Cari kode atau cabang
                                </label>

                                <input
                                    id="cabinet-search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            searchCabinet();
                                        }
                                    }}
                                    placeholder="Contoh: CAB-014"
                                    className="w-full border-b border-[#1B5E20]/30 bg-transparent py-2 text-base outline-none placeholder:text-[#1B5E20]/30 focus:border-[#66BB6A]"
                                />
                            </div>

                            <button
                                onClick={searchCabinet}
                                className="shrink-0 border-b border-[#1B5E20] py-2 text-sm hover:border-[#66BB6A] hover:text-[#66BB6A]"
                            >
                                Cari
                            </button>
                        </div>

                        <div>
                            <label
                                htmlFor="cabinet-status"
                                className="mb-1 block text-sm text-[#1B5E20]/60"
                            >
                                Status
                            </label>

                            <select
                                id="cabinet-status"
                                value={status}
                                onChange={(event) =>
                                    changeStatus(event.target.value)
                                }
                                className="w-full border-b border-[#1B5E20]/30 bg-transparent py-2 text-base outline-none focus:border-[#66BB6A]"
                            >
                                <option value="">
                                    Semua status
                                </option>

                                <option value="ONLINE">
                                    Online
                                </option>

                                <option value="OFFLINE">
                                    Offline
                                </option>

                                <option value="MAINTENANCE">
                                    Maintenance
                                </option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="cabinet-sort"
                                className="mb-1 block text-sm text-[#1B5E20]/60"
                            >
                                Urutkan swap 24 jam
                            </label>

                            <select
                                id="cabinet-sort"
                                value={sort}
                                onChange={(event) =>
                                    changeSort(
                                        event.target.value as
                                            | "asc"
                                            | "desc",
                                    )
                                }
                                className="w-full border-b border-[#1B5E20]/30 bg-transparent py-2 text-base outline-none focus:border-[#66BB6A]"
                            >
                                <option value="desc">
                                    Terbanyak ke tersedikit
                                </option>

                                <option value="asc">
                                    Tersedikit ke terbanyak
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-10">
                    <CabinetsTable
                        cabinets={cabinets}
                        pagination={pagination}
                        page={page}
                        loading={loading}
                        error={error}
                        onPageChange={changePage}
                    />
                </div>
            </div>
        </main>
    );
}