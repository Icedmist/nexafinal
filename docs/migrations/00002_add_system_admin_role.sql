-- Migration: Add system_admin role to app_role enum
-- Add system_admin to the app_role enum

ALTER TYPE public.app_role ADD VALUE 'system_admin';