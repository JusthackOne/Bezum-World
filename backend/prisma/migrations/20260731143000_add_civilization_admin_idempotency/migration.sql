CREATE UNIQUE INDEX "civilization_admin_audit_idempotency_unique"
ON "civilization_admin_audit_logs" (
  "admin_id",
  "action",
  ("metadata"->>'idempotencyKey')
)
WHERE "metadata" ? 'idempotencyKey';
