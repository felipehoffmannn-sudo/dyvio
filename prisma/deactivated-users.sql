-- Users matched by md5(lower(email)) so addresses stay out of the public repo.
UPDATE "User"
SET "deletedAt" = now()
WHERE "deletedAt" IS NULL
  AND md5(lower(email)) IN (
    '431cccc1d65e6a4e22c3496a1e27e3e5'
  );
