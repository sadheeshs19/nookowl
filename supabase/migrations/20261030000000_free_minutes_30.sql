-- 30 free call minutes a day (was 10). Ads still add 5 minutes, up to 10 a day.
create or replace function public.credit_settings()
returns table (free_seconds int, ad_seconds int, max_ads_per_day int)
language sql immutable as $$ select 1800, 300, 10 $$;

alter table public.credits alter column free_seconds set default 1800;

-- Give everyone the extra 20 minutes today too, instead of waiting for tomorrow's reset.
update public.credits
set free_seconds = free_seconds + 1200
where free_day = (now() at time zone 'Asia/Kolkata')::date;
