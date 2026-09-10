import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
);

const querySchema = z.object({
    q: z.string().optional(),
    status: z
        .enum(["ONLINE", "OFFLINE", "MAINTENANCE"])
        .optional()
        .or(z.literal("")),
    page: z.coerce.number().int().min(1).default(1),
});

type Swap = {
    cabinet_id: string;
    swap_24h: number;
};

type Slot = {
    cabinet_id: string;
    state: string;
};

export async function GET(request: NextRequest) {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const validation = querySchema.safeParse(params);

    if (!validation.success) {
        return NextResponse.json(
            { error: "Query tidak valid" },
            { status: 400 },
        );
    }

    const q = validation.data.q || "";
    const status = validation.data.status || "";
    const page = validation.data.page;
    const limit = 10;

    let branchIds: string[] = [];

    if (q) {
        const { data: branches, error } = await supabase
            .from("branches")
            .select("id")
            .ilike("name", `%${q}%`);

        if (error) {
            return NextResponse.json(
                { error: "Gagal mencari cabang" },
                { status: 500 },
            );
        }

        branchIds = branches.map((branch) => branch.id);
    }

    let query = supabase
        .from("cabinets")
        .select(`
            id,
            code,
            status,
            total_slots,
            last_heartbeat_at,
            branch:branches(name)
        `);

    if (status) {
        query = query.eq("status", status);
    }

    if (q) {
        if (branchIds.length > 0) {
            query = query.or(
                `code.ilike.%${q}%,branch_id.in.(${branchIds.join(",")})`,
            );
        } else {
            query = query.ilike("code", `%${q}%`);
        }
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json(
            { error: "Gagal mengambil data cabinet" },
            { status: 500 },
        );
    }

    const cabinets = data ?? [];
    const cabinetIds = cabinets.map((cabinet) => cabinet.id);

    const { data: swaps, error: swapError } = await supabase.rpc(
        "get_swap_count_24h",
        { cabinet_ids: cabinetIds },
    );

    if (swapError) {
        return NextResponse.json(
            { error: "Gagal menghitung swap 24 jam" },
            { status: 500 },
        );
    }

    const { data: slots, error: slotError } = await supabase
        .from("slots")
        .select("cabinet_id, state")
        .in("cabinet_id", cabinetIds);

    if (slotError) {
        return NextResponse.json(
            { error: "Gagal menghitung slot terisi" },
            { status: 500 },
        );
    }

    const swapList = (swaps ?? []) as Swap[];
    const slotList = (slots ?? []) as Slot[];

    const swapMap = new Map(
        swapList.map((item) => [
            item.cabinet_id,
            Number(item.swap_24h),
        ]),
    );

    const occupiedSlotMap = new Map<string, number>();

    for (const slot of slotList) {
        if (slot.state !== "EMPTY") {
            occupiedSlotMap.set(
                slot.cabinet_id,
                (occupiedSlotMap.get(slot.cabinet_id) ?? 0) + 1,
            );
        }
    }

    const result = cabinets
        .map((cabinet) => ({
            id: cabinet.id,
            code: cabinet.code,
            branch_name: cabinet.branch?.[0]?.name || "-",
            status: cabinet.status,
            occupied_slots: occupiedSlotMap.get(cabinet.id) ?? 0,
            total_slots: cabinet.total_slots,
            swap_24h: swapMap.get(cabinet.id) ?? 0,
            last_heartbeat_at: cabinet.last_heartbeat_at,
        }))
        .sort((a, b) => b.swap_24h - a.swap_24h);

    const start = (page - 1) * limit;

    return NextResponse.json({
        data: result.slice(start, start + limit),
        pagination: {
            page,
            limit,
            total: result.length,
        },
    });
}