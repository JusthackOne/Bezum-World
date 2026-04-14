DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Account"
    GROUP BY "username"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique Account.username: duplicate usernames already exist';
  END IF;
END $$;

CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");
