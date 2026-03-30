import prisma from '../lib/prisma'

export interface ProductInput {
  clientId: string
  name: string
  storeId: string
  unit: string
  isCustom: boolean
  isReminder?: boolean
  isDeleted?: boolean
  updatedAt: string
}

export async function syncProducts(userId: string, products: ProductInput[]) {
  for (const p of products) {
    const existing = await prisma.product.findUnique({
      where: { userId_clientId: { userId, clientId: p.clientId } },
    })

    if (existing) {
      if (new Date(p.updatedAt) > existing.updatedAt) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            storeId: p.storeId,
            unit: p.unit,
            isCustom: p.isCustom,
            isReminder: p.isReminder ?? false,
            isDeleted: p.isDeleted ?? false,
          },
        })
      }
    } else {
      await prisma.product.create({
        data: {
          userId,
          clientId: p.clientId,
          name: p.name,
          storeId: p.storeId,
          unit: p.unit,
          isCustom: p.isCustom,
          isReminder: p.isReminder ?? false,
          isDeleted: p.isDeleted ?? false,
        },
      })
    }
  }

  return prisma.product.findMany({
    where: { userId, isDeleted: false },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })
}

export interface SessionInput {
  clientId: string
  date: string
  items: { productClientId: string; quantity: number }[]
}

export async function syncHistory(userId: string, sessions: SessionInput[]) {
  for (const s of sessions) {
    const existing = await prisma.shoppingSession.findUnique({
      where: { userId_clientId: { userId, clientId: s.clientId } },
    })

    if (!existing) {
      await prisma.shoppingSession.create({
        data: {
          userId,
          clientId: s.clientId,
          date: new Date(s.date),
          items: {
            create: s.items.map((item) => ({
              productClientId: item.productClientId,
              quantity: item.quantity,
            })),
          },
        },
      })
    }
  }

  // Keep max 30, drop oldest
  const allSessions = await prisma.shoppingSession.findMany({
    where: { userId, clientId: { not: 'current' } },
    orderBy: { date: 'desc' },
  })

  if (allSessions.length > 30) {
    const toDelete = allSessions.slice(30).map((s) => s.id)
    await prisma.shoppingSession.deleteMany({ where: { id: { in: toDelete } } })
  }

  return prisma.shoppingSession.findMany({
    where: { userId, clientId: { not: 'current' } },
    include: { items: true },
    orderBy: { date: 'desc' },
    take: 30,
  })
}
