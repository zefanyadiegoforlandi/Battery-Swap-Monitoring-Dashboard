"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Cabinet = {
    id: string;
    code: string;
    branch_name: string;
    status: string;
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
    const page = Number(searchParams.get("page") || 1);

    const [search, setSearch] = useState(q);
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setSearch(q);

        async function loadCabinets() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `/api/cabinets?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${page}`,
                );

                if (!response.ok) {
                    throw new Error();
                }

                const result = await response.json();

                setCabinets(result.data);
                setPagination(result.pagination);
            } catch {
                setError("Gagal mengambil data cabinet");
            } finally {
                setLoading(false);
            }
        }

        loadCabinets();
    }, [q, status, page]);

    function searchCabinet() {
        const params = new URLSearchParams(searchParams.toString());

        if (search) {
            params.set("q", search);
        } else {
            params.delete("q");
        }

        params.set("page", "1");

        router.push(`/cabinets?${params.toString()}`);
    }

    function changeStatus(value: string) {
        const params = new URLSearchParams(searchParams.toString());

        if (value) {
            params.set("status", value);
        } else {
            params.delete("status");
        }

        params.set("page", "1");

        router.push(`/cabinets?${params.toString()}`);
    }

    function changePage(value: number) {
        const params = new URLSearchParams(searchParams.toString());

        params.set("page", String(value));

        router.push(`/cabinets?${params.toString()}`);
    }

    if (loading) {
        return <p className="p-6">Loading...</p>;
    }

    if (error) {
        return <p className="p-6 text-red-500">{error}</p>;
    }

    return (
        <main className="p-6">
            <h1 className="mb-6 text-2xl font-bold">
                Battery Swap Cabinets
            </h1>

            <div className="mb-6 flex gap-2">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            searchCabinet();
                        }
                    }}
                    placeholder="Cari kode atau cabang"
                    className="rounded border px-3 py-2"
                />

                <button
                    onClick={searchCabinet}
                    className="rounded bg-black px-4 py-2 text-white"
                >
                    Search
                </button>

                <select
                    value={status}
                    onChange={(event) => changeStatus(event.target.value)}
                    className="rounded border px-3 py-2"
                >
                    <option value="">Semua Status</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
            </div>

            {cabinets.length === 0 ? (
                <p>Cabinet tidak ditemukan.</p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full border">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="p-3">Kode</th>
                                    <th className="p-3">Cabang</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Slot</th>
                                    <th className="p-3">Swap 24 Jam</th>
                                    <th className="p-3">Heartbeat</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cabinets.map((cabinet) => (
                                    <tr
                                        key={cabinet.id}
                                        className="border-b"
                                    >
                                        <td className="p-3">
                                            {cabinet.code}
                                        </td>
                                        <td className="p-3">
                                            {cabinet.branch_name}
                                        </td>
                                        <td className="p-3">
                                            {cabinet.status}
                                        </td>
                                        <td className="p-3">
                                            {cabinet.total_slots}
                                        </td>
                                        <td className="p-3">
                                            {cabinet.swap_24h}
                                        </td>
                                        <td className="p-3">
                                            {cabinet.last_heartbeat_at
                                                ? new Date(
                                                      cabinet.last_heartbeat_at,
                                                  ).toLocaleString()
                                                : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && (
                        <div className="mt-4 flex items-center gap-3">
                            <button
                                disabled={page <= 1}
                                onClick={() => changePage(page - 1)}
                                className="rounded border px-3 py-1 disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <span>
                                Page {page}
                            </span>

                            <button
                                disabled={
                                    page >=
                                    Math.ceil(
                                        pagination.total /
                                            pagination.limit,
                                    )
                                }
                                onClick={() => changePage(page + 1)}
                                className="rounded border px-3 py-1 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}