import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const result = paramsSchema.safeParse({ id });

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid cabinet id" },
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
      branches(name)
    `)
    .eq("id", id)
    .single();

  if (cabinetError) {
    return NextResponse.json(
      { error: "Cabinet not found" },
      { status: 404 },
    );
  }

  const { data: slots, error: slotsError } = await supabase
    .from("slots")
    .select("slot_number, state, soc_percent")
    .eq("cabinet_id", id)
    .order("slot_number");

  if (slotsError) {
    return NextResponse.json(
      { error: slotsError.message },
      { status: 500 },
    );
  }

  const { data: transactions, error: transactionError } =
    await supabase
      .from("swap_transactions")
      .select("id, slot_number, swapped_at, battery_id")
      .eq("cabinet_id", id)
      .order("swapped_at", { ascending: false })
      .limit(20);

  if (transactionError) {
    return NextResponse.json(
      { error: transactionError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    cabinet,
    slots,
    transactions,
  });
}