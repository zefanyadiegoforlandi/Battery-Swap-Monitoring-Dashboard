"use client";

import { useRouter } from "next/navigation";

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

type CabinetsTableProps = {
    cabinets: Cabinet[];
    pagination: Pagination | null;
    page: number;
    loading: boolean;
    error: string;
    onPageChange: (page: number) => void;
};

const STATUS_DOT: Record<string, string> = {
    ONLINE: "bg-[#66BB6A]",
    MAINTENANCE: "bg-[#FFB74D]",
    OFFLINE: "bg-[#9E9E9E]",
};

export default function CabinetsTable({
    cabinets,
    pagination,
    page,
    loading,
    error,
    onPageChange,
}: CabinetsTableProps) {
    const router = useRouter();

    const totalPages = pagination
        ? Math.max(
              1,
              Math.ceil(
                  pagination.total / pagination.limit,
              ),
          )
        : 1;

    function getPageItems(
        currentPage: number,
        pages: number,
    ): (number | "...")[] {
        if (pages <= 3) {
            return Array.from(
                { length: pages },
                (_, index) => index + 1,
            );
        }

        if (
            currentPage === 1 ||
            currentPage === pages
        ) {
            return [1, "...", pages];
        }

        return [
            1,
            "...",
            currentPage,
            "...",
            pages,
        ];
    }

    const pageItems = getPageItems(
        page,
        totalPages,
    );

    const rangeStart = pagination
        ? (page - 1) * pagination.limit + 1
        : 0;

    const rangeEnd = pagination
        ? Math.min(
              page * pagination.limit,
              pagination.total,
          )
        : 0;

    if (loading) {
        return (
            <p className="text-[#1B5E20]/60">
                Memuat data cabinet…
            </p>
        );
    }

    if (error) {
        return (
            <p className="text-[#1B5E20]">
                {error}
            </p>
        );
    }

    if (cabinets.length === 0) {
        return (
            <p className="text-[#1B5E20]/60">
                Tidak ada cabinet yang cocok dengan
                pencarian ini.
            </p>
        );
    }

    return (
        <>
            {pagination && (
                <p className="mb-4 text-sm text-[#1B5E20]/60">
                    Menampilkan {rangeStart}–{rangeEnd} dari{" "}
                    {pagination.total} cabinet
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                        <tr className="border-b border-[#1B5E20]/20 text-sm text-[#1B5E20]/60">
                            <th className="py-3 pr-4 font-normal">
                                Kode
                            </th>

                            <th className="py-3 pr-4 font-normal">
                                Cabang
                            </th>

                            <th className="py-3 pr-4 font-normal">
                                Status
                            </th>

                            <th className="py-3 pr-4 font-normal">
                                Slot terisi
                            </th>

                            <th className="hidden py-3 pr-4 font-normal md:table-cell">
                                Swap 24 jam
                            </th>
                            <th className="hidden py-3 pr-4 font-normal lg:table-cell">
                                Heartbeat
                            </th>
                            <th className="py-3 font-normal">
                                Aksi
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {cabinets.map((cabinet) => (
                            <tr
                                key={cabinet.id}
                                className="border-b border-[#1B5E20]/10 hover:bg-[#A5D6A7]/15"
                            >
                                <td className="py-4 pr-4 font-medium">
                                    {cabinet.code}
                                </td>

                                <td className="py-4 pr-4">
                                    {cabinet.branch_name}
                                </td>

                                <td className="py-4 pr-4">
                                    <span className="inline-flex items-center gap-2">
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                STATUS_DOT[
                                                    cabinet.status
                                                ] ??
                                                "bg-[#1B5E20]/30"
                                            }`}
                                        />

                                        {cabinet.status}
                                    </span>
                                </td>

                                <td className="py-4 pr-4">
                                    {cabinet.occupied_slots} /{" "}
                                    {cabinet.total_slots}
                                </td>

                                <td className="hidden py-4 pr-4 md:table-cell">
                                    {cabinet.swap_24h}
                                </td>

                                <td className="hidden py-4 pr-4 text-[#1B5E20]/70 lg:table-cell">
                                    {cabinet.last_heartbeat_at
                                        ? new Date(
                                              cabinet.last_heartbeat_at,
                                          ).toLocaleString(
                                              "id-ID",
                                          )
                                        : "—"}
                                </td>

                                <td className="py-4">
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/cabinets/${cabinet.id}`,
                                            )
                                        }
                                        className="border-b border-transparent text-sm hover:border-[#66BB6A] hover:text-[#66BB6A]"> Detail
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="mt-8 flex items-center justify-center gap-6 text-sm">
                    <button
                        disabled={page <= 1}
                        onClick={() =>
                            onPageChange(page - 1)
                        }
                        className="border-b border-[#1B5E20] pb-0.5 hover:border-[#66BB6A] hover:text-[#66BB6A] disabled:border-transparent disabled:text-[#1B5E20]/30"
                    >
                        Sebelumnya
                    </button>

                    <div className="flex items-center gap-3">
                        {pageItems.map((item, index) =>
                            item === "..." ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="text-[#1B5E20]/40"
                                >
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={item}
                                    onClick={() =>
                                        onPageChange(item)
                                    }
                                    className={`min-w-6 text-center ${
                                        item === page
                                            ? "font-semibold text-[#1B5E20]"
                                            : "text-[#1B5E20]/60 hover:text-[#66BB6A]"
                                    }`}
                                >
                                    {item}
                                </button>
                            ),
                        )}
                    </div>

                    <button
                        disabled={
                            page >= totalPages
                        }
                        onClick={() =>
                            onPageChange(page + 1)
                        }
                        className="border-b border-[#1B5E20] pb-0.5 hover:border-[#66BB6A] hover:text-[#66BB6A] disabled:border-transparent disabled:text-[#1B5E20]/30"
                    >
                        Selanjutnya
                    </button>
                </div>
            )}
        </>
    );
}