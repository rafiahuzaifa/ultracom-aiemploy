import { prisma } from "@/lib/db";

export async function notifyUser(args: { userId: string; title: string; body?: string; href?: string }) {
  await prisma.notification.create({
    data: {
      userId: args.userId,
      title: args.title,
      body: args.body,
      href: args.href,
    },
  });
}
