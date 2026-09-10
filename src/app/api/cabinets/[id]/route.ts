import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
);

const schema = z.object({
    id: z.string().min(1),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const validation = schema.safeParse({ id });

    if (!validation.success) {
        return NextResponse.json(
            { error: "ID cabinet tidak valid" },
            { status: 400 },
        );
    }

    const { data: cabinet, error: cabinetError } = await supabase
        .from("cabinets")
        .select(`
            id,
            code,
            status,
            total_slots,
            last_heartbeat_at,
            branch:branches(name)
        `)
        .eq("id", id)
        .single();

    if (cabinetError || !cabinet) {
        return NextResponse.json(
            { error: "Cabinet tidak ditemukan" },
            { status: 404 },
        );
    }

    const { data: slots, error: slotError } = await supabase
        .from("slots")
        .select(`
            id,
            slot_number,
            state,
            soc_percent
        `)
        .eq("cabinet_id", id)
        .order("slot_number");

    if (slotError) {
        return NextResponse.json(
            { error: "Gagal mengambil data slot" },
            { status: 500 },
        );
    }

    const { data: transactions, error: transactionError } =
        await supabase
            .from("swap_transactions")
            .select(`
                id,
                slot_number,
                swapped_at,
                battery_id
            `)
            .eq("cabinet_id", id)
            .order("swapped_at", { ascending: false })
            .limit(20);

    if (transactionError) {
        return NextResponse.json(
            { error: "Gagal mengambil transaksi swap" },
            { status: 500 },
        );
    }

    const { data: hourlySwaps, error: hourlyError } =
        await supabase.rpc(
            "get_hourly_swap_count",
            {
                cabinet_id: id,
            },
        );

    if (hourlyError) {
        console.error(hourlyError);
        return NextResponse.json(
            { error: "Gagal mengambil data swap per jam" },
            { status: 500 },
        );
    }

    return NextResponse.json({
        data: {
            cabinet: {
                id: cabinet.id,
                code: cabinet.code,
                branch_name: cabinet.branch?.[0]?.name || "-",
                status: cabinet.status,
                total_slots: cabinet.total_slots,
                last_heartbeat_at: cabinet.last_heartbeat_at,
            },
            slots: slots ?? [],
            hourly_swaps: hourlySwaps ?? [],
            transactions: transactions ?? [],
        },
    });
}