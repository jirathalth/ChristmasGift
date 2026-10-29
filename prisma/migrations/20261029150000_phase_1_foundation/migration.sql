CREATE TYPE "RoomStatus" AS ENUM ('DRAFT', 'READY', 'DRAWN', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3),
    "budget" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'THB',
    "status" "RoomStatus" NOT NULL DEFAULT 'DRAFT',
    "drawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Room_budget_check" CHECK ("budget" IS NULL OR "budget" >= 0)
);

CREATE TABLE "Participant" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "invitationTokenHash" VARCHAR(64),
    "invitationIssuedAt" TIMESTAMP(3),
    "invitationExpiresAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Participant_names_not_blank_check" CHECK (length(btrim("displayName")) > 0 AND length("normalizedName") > 0)
);

CREATE TABLE "ExcludedPair" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "participantAId" UUID NOT NULL,
    "participantBId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExcludedPair_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExcludedPair_canonical_check" CHECK ("participantAId" < "participantBId")
);

CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "giverId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Assignment_no_self_check" CHECK ("giverId" <> "receiverId")
);

CREATE TABLE "ParticipantSession" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
CREATE INDEX "Room_organizerId_status_idx" ON "Room"("organizerId", "status");
CREATE INDEX "Participant_invitationTokenHash_idx" ON "Participant"("invitationTokenHash");
CREATE UNIQUE INDEX "Participant_roomId_normalizedName_key" ON "Participant"("roomId", "normalizedName");
CREATE UNIQUE INDEX "Participant_roomId_id_key" ON "Participant"("roomId", "id");
CREATE INDEX "ExcludedPair_roomId_idx" ON "ExcludedPair"("roomId");
CREATE UNIQUE INDEX "ExcludedPair_roomId_participantAId_participantBId_key" ON "ExcludedPair"("roomId", "participantAId", "participantBId");
CREATE UNIQUE INDEX "Assignment_giverId_key" ON "Assignment"("giverId");
CREATE UNIQUE INDEX "Assignment_receiverId_key" ON "Assignment"("receiverId");
CREATE INDEX "Assignment_roomId_idx" ON "Assignment"("roomId");
CREATE UNIQUE INDEX "Assignment_roomId_giverId_key" ON "Assignment"("roomId", "giverId");
CREATE UNIQUE INDEX "Assignment_roomId_receiverId_key" ON "Assignment"("roomId", "receiverId");
CREATE UNIQUE INDEX "ParticipantSession_tokenHash_key" ON "ParticipantSession"("tokenHash");
CREATE INDEX "ParticipantSession_participantId_idx" ON "ParticipantSession"("participantId");
CREATE INDEX "ParticipantSession_expiresAt_idx" ON "ParticipantSession"("expiresAt");

ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExcludedPair" ADD CONSTRAINT "ExcludedPair_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExcludedPair" ADD CONSTRAINT "ExcludedPair_roomId_participantAId_fkey" FOREIGN KEY ("roomId", "participantAId") REFERENCES "Participant"("roomId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExcludedPair" ADD CONSTRAINT "ExcludedPair_roomId_participantBId_fkey" FOREIGN KEY ("roomId", "participantBId") REFERENCES "Participant"("roomId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_roomId_giverId_fkey" FOREIGN KEY ("roomId", "giverId") REFERENCES "Participant"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_roomId_receiverId_fkey" FOREIGN KEY ("roomId", "receiverId") REFERENCES "Participant"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
