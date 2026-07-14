-- ============================================================================
-- Fix Migration: Make workers.user_id nullable + add phone to users
-- Run this in Supabase SQL Editor AFTER setup.sql
-- ============================================================================

-- 1. Make user_id nullable on workers table
-- (Office staff creates worker profiles; the worker can sign up later)
ALTER TABLE workers ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add phone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
