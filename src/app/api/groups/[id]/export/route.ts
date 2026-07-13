import { NextRequest, NextResponse } from "next/server"
import { exportGroupCSV } from "@/lib/export-actions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const csv = await exportGroupCSV(params.id)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=leiaute-grupo-${params.id}.csv`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
}
