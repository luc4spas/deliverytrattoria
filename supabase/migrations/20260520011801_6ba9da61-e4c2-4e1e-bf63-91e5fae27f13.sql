
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;

-- Replace broad public SELECT on storage.objects with no list (objects still accessible by direct URL since bucket is public)
drop policy if exists "public read menu images" on storage.objects;
