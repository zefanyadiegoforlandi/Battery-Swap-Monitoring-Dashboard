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
    sort: z.enum(["asc", "desc"]).optional().default("desc"),
    page: z.coerce.number().int().min(1).default(1),
});

type CabinetRow = {
    id: string;
    code: string;
    branch_name: string;
    status: string;
    occupied_slots: number;
    total_slots: number;
    swap_24h: number;
    last_heartbeat_at: string | null;
    total_count: number;
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

    const { q, status, sort, page } = validation.data;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc("search_cabinets", {
        p_q: q || null,
        p_status: status || null,
        p_sort_dir: sort,
        p_limit: limit,
        p_offset: offset,
    });

    if (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Gagal mengambil data cabinet" },
            { status: 500 },
        );
    }
    const rows = (data ?? []) as CabinetRow[];
    const total = rows.length > 0 ? rows[0].total_count : 0;

    const result = rows.map((row) => ({
        id: row.id,
        code: row.code,
        branch_name: row.branch_name,
        status: row.status,
        occupied_slots: row.occupied_slots,
        total_slots: row.total_slots,
        swap_24h: row.swap_24h,
        last_heartbeat_at: row.last_heartbeat_at,
    }));

    return NextResponse.json({
        data: result,
        pagination: {
            page,
            limit,
            total,
        },
    });
}