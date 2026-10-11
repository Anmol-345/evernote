# Database Artifacts

Migrations are ordered and version-controlled. Apply them to a development project first. Inspect target project state before applying to any existing database. Run `verification/001_schema_check.sql` after migration. This baseline intentionally does not reset any database.
