-- 15 free call minutes a day (was 30). Ads still add 5 minutes, up to 10 a day.
create or replace function public.credit_settings()
returns table (free_seconds int, ad_seconds int, max_ads_per_day int)
language sql immutable as $$ select 900, 300, 10 $$;

alter table public.credits alter column free_seconds set default 900;

-- Today's free minutes above the new daily amount come down to it; ad minutes are untouched.
update public.credits
set free_seconds = least(free_seconds, 900)
where free_day = (now() at time zone 'Asia/Kolkata')::date;
