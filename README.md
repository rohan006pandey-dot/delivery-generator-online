# Delivery Studio Online

This is the online starter for the delivery-photo template generator.

## Free architecture
GitHub -> Vercel -> Supabase.

## Before deployment
1. Create a Supabase project.
2. In Supabase Authentication, create the first Owner user.
3. Run `supabase-schema.sql` in Supabase SQL Editor.
4. Insert the Owner's auth UUID into `public.profiles` using the commented SQL example.
5. Create `.env` from `.env.example` with the Supabase project URL and ANON key.
6. Push this folder to GitHub and import it into Vercel.
7. Add the same two environment variables in Vercel.

## Important security
Do NOT put the Supabase service-role key in frontend code. Owner-created staff accounts should be created through a Supabase Edge Function or another server-side endpoint that checks the current user is an Owner.

## Current starter limitation
The UI is connected to Supabase for login, profiles, and generated-design records. Staff account creation is intentionally blocked until the secure server-side function is added. This prevents accidentally exposing the service-role key.

## Exact design
The starter includes a placeholder Hyundai template. To reproduce the supplied image exactly, the final template asset and exact photo/text coordinates need to be configured.
