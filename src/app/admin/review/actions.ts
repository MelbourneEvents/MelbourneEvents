"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { EVENT_STATUS } from "@/lib/eventStatus";

export async function approveEvent(id: string) {
  await prisma.event.update({ where: { id }, data: { status: EVENT_STATUS.published } });
  revalidatePath("/admin/review");
  revalidatePath("/");
}

export async function rejectEvent(id: string) {
  // Rejected rows are kept (not deleted) so a future re-scrape of the
  // same source sees externalId already exists and leaves status alone —
  // otherwise a rejected event would just resurface as pending again.
  await prisma.event.update({ where: { id }, data: { status: EVENT_STATUS.rejected } });
  revalidatePath("/admin/review");
}
