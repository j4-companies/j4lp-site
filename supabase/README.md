# J4LP Supabase deployment

The property-intake functions are public web-form boundaries and must be deployed with JWT verification disabled. Their own code enforces origin, Turnstile, validation, private tokens, rate limits, and the monitor secret.

From the repository root:

```sh
supabase link --project-ref rqnvfruyhkkmsqvzqdli
supabase db push --linked
supabase functions deploy manage-property-intake --project-ref rqnvfruyhkkmsqvzqdli --no-verify-jwt
supabase functions deploy submit-property-intake --project-ref rqnvfruyhkkmsqvzqdli --no-verify-jwt
supabase functions deploy resend-intake-webhook --project-ref rqnvfruyhkkmsqvzqdli --no-verify-jwt
supabase functions deploy maintain-property-intake --project-ref rqnvfruyhkkmsqvzqdli --no-verify-jwt
```

The five-minute reconciliation workflow also requires the same random `INTAKE_MONITOR_SECRET` in Supabase Edge Function secrets and GitHub Actions secrets. Never commit the value.

Resend delivery, bounce, suppression, and failure events post to `https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/resend-intake-webhook`. Store its signing secret only as the Supabase `RESEND_WEBHOOK_SECRET`.
