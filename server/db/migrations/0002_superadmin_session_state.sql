UPDATE "users"
SET "first_login" = false,
    "is_verified" = true
WHERE "role" = 'superadmin';
