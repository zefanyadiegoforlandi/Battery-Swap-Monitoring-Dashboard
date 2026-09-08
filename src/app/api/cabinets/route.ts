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
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

type Swap = {
  cabinet_id: string;
  swap_24h: number;
};

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(
    request.nextUrl.searchParams,
  );

  const validation = querySchema.safeParse(params);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Query tidak valid" },
      { status: 400 },
    );
  }

  const q = validation.data.q || "";
  const status = validation.data.status;
  const page = validation.data.page;
  const limit = 10;

  let branchIds: string[] = [];

  if (q) {
    const { data: branches, error: branchError } = await supabase
      .from("branches")
      .select("id")
      .ilike("name", `%${q}%`);

    if (branchError) {
      return NextResponse.json(
        { error: "Gagal mencari cabang" },
        { status: 500 },
      );
    }

    branchIds = branches.map((branch) => branch.id);
  }

  let query = supabase.from("cabinets").select(`
    id,
    code,
    status,
    total_slots,
    last_heartbeat_at,
    branch_id
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

  const { data: cabinets, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data cabinet" },
      { status: 500 },
    );
  }

  const cabinetIds = cabinets.map((cabinet) => cabinet.id);

  const { data: swaps, error: swapError } = await supabase.rpc(
    "get_swap_count_24h",
    {
      cabinet_ids: cabinetIds,
    },
  );

  if (swapError) {
    return NextResponse.json(
      { error: "Gagal menghitung swap 24 jam" },
      { status: 500 },
    );
  }

  const swapList = (swaps ?? []) as Swap[];

  const result = cabinets.map((cabinet) => {
    const swap = swapList.find(
      (item: Swap) => item.cabinet_id === cabinet.id,
    );

    return {
      ...cabinet,
      swap_24h: swap ? Number(swap.swap_24h) : 0,
    };
  });

  result.sort((a, b) => b.swap_24h - a.swap_24h);

  const start = (page - 1) * limit;
  const data = result.slice(start, start + limit);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: result.length,
    },
  });
}