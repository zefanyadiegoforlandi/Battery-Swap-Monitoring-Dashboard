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

export default function CabinetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const page = Number(searchParams.get("page") || 1);

  const [search, setSearch] = useState(q);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/cabinets?q=${q}&status=${status}&page=${page}`,
        );

        if (!response.ok) {
          throw new Error();
        }

        const result = await response.json();
        setCabinets(result.data);
      } catch {
        setError("Gagal mengambil data cabinet");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [q, status, page]);

  function updateUrl(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.set("page", "1");
    router.push(`/cabinets?${params.toString()}`);
  }

  if (loading) return <p className="p-6">Loading...</p>;

  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Cabinets</h1>

      <div className="mb-6 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode atau cabang"
          className="border p-2"
        />

        <button
          onClick={() => updateUrl("q", search)}
          className="bg-black px-4 text-white"
        >
          Search
        </button>

        <select
          value={status}
          onChange={(e) => updateUrl("status", e.target.value)}
          className="border p-2"
        >
          <option value="">Semua</option>
          <option value="ONLINE">ONLINE</option>
          <option value="OFFLINE">OFFLINE</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
        </select>
      </div>

      {cabinets.length === 0 ? (
        <p>Cabinet tidak ditemukan.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Kode</th>
              <th className="p-2">Cabang</th>
              <th className="p-2">Status</th>
              <th className="p-2">Slot</th>
              <th className="p-2">Swap 24h</th>
              <th className="p-2">Heartbeat</th>
            </tr>
          </thead>

          <tbody>
            {cabinets.map((cabinet) => (
              <tr key={cabinet.id} className="border-b">
                <td className="p-2">{cabinet.code}</td>
                <td className="p-2">{cabinet.branch_name}</td>
                <td className="p-2">{cabinet.status}</td>
                <td className="p-2">{cabinet.total_slots}</td>
                <td className="p-2">{cabinet.swap_24h}</td>
                <td className="p-2">
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
      )}

      <div className="mt-4 flex gap-2">
        <button
          disabled={page === 1}
          onClick={() =>
            router.push(
              `/cabinets?q=${q}&status=${status}&page=${page - 1}`,
            )
          }
          className="border px-3 py-1 disabled:opacity-50"
        >
          Previous
        </button>

        <span className="p-1">Page {page}</span>

        <button
          disabled={cabinets.length < 10}
          onClick={() =>
            router.push(
              `/cabinets?q=${q}&status=${status}&page=${page + 1}`,
            )
          }
          className="border px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </main>
  );
}