CREATE TABLE "SharedSession" (
  "id"        TEXT NOT NULL,
  "shareCode" TEXT NOT NULL,
  "ownerId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SharedSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SharedSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SharedSession_shareCode_key" ON "SharedSession"("shareCode");
