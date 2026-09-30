-- Preserve every existing assignment while moving from one role to many roles.
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

INSERT INTO "UserRole" ("userId", "roleId")
SELECT "id", "roleId" FROM "User";

CREATE TABLE "RoleAudit" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "previousRoles" TEXT[] NOT NULL,
    "newRoles" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
CREATE INDEX "RoleAudit_createdAt_idx" ON "RoleAudit"("createdAt");
CREATE INDEX "RoleAudit_actorUserId_createdAt_idx" ON "RoleAudit"("actorUserId", "createdAt");
CREATE INDEX "RoleAudit_targetUserId_createdAt_idx" ON "RoleAudit"("targetUserId", "createdAt");

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAudit" ADD CONSTRAINT "RoleAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoleAudit" ADD CONSTRAINT "RoleAudit_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";
DROP INDEX "User_roleId_idx";
ALTER TABLE "User" DROP COLUMN "roleId";
