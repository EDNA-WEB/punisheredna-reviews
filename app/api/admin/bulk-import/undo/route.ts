import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { undoBulkImportBatch } from '@/lib/bulkImportLog';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { batchId } = await req.json();
  if (typeof batchId !== 'string' || !batchId) {
    return NextResponse.json({ error: 'Chýba batchId.' }, { status: 400 });
  }

  const result = await undoBulkImportBatch(batchId);
  return NextResponse.json(result);
}
