-- Add 'i2i_kontext' to the jobtype enum.
--
-- New job type for the Flux Kontext dev + Nudify LoRA true-I2I pipeline (bot
-- "Photos" tab / Undress template), served by a dedicated worker on its own
-- Vast.ai pod so it never competes with the existing i2i_1 (SD1.5 Photo
-- Fantasy) worker's job types. Purely additive — existing rows/workers are
-- unaffected. Applied idempotently by deploy-web.sh. Also applied
-- idempotently by PintuV3/migrations/016_i2i_kontext_job_type.sql against
-- the same shared Postgres DB.

ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'i2i_kontext';
