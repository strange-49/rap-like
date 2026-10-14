-- Customer-to-admin support chat. RideChatMessage remains separate.
CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'General support',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportConversation_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupportConversation_customerId_updatedAt_idx"
  ON "SupportConversation"("customerId", "updatedAt");
CREATE INDEX "SupportConversation_status_updatedAt_idx"
  ON "SupportConversation"("status", "updatedAt");

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupportMessage_senderId_fkey"
      FOREIGN KEY ("senderId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupportMessage_conversationId_createdAt_idx"
  ON "SupportMessage"("conversationId", "createdAt");
CREATE INDEX "SupportMessage_senderId_idx" ON "SupportMessage"("senderId");
