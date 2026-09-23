# AWS Authorization Skill

How to authenticate with AWS for deployments and resource management.

## Authentication Methods

### A) AWS SSO (interactive — recommended for direct mode)

**Setup (one-time):**
Configure SSO profile in `~/.aws/config`:
```ini
[profile YOUR_PROFILE]
sso_start_url = https://YOUR_ORG.awsapps.com/start
sso_region = YOUR_REGION
sso_account_id = YOUR_ACCOUNT_ID
sso_role_name = AdministratorAccess
region = YOUR_REGION
```

**Login flow:**
1. Run: `aws sso login --profile YOUR_PROFILE --no-browser --use-device-code`
2. Send the user a single clickable link with the code pre-filled — don't make them type it. The
   CLI's own printed output only gives `verification_uri` and `user_code` as two separate pieces:
   ```
   Open this URL and enter the code:
   URL: https://YOUR_ORG.awsapps.com/start/#/device
   Code: XXXX-XXXX
   ```
   but the underlying AWS SSO-OIDC API call the CLI makes under the hood
   (`StartDeviceAuthorization`) actually returns a `verificationUriComplete` field too — verified
   directly 2026-09-23 by calling `aws sso-oidc register-client` + `aws sso-oidc
   start-device-authorization` against a real org and reading the JSON response. It follows this
   exact pattern (query string appended after the `#` fragment, parsed client-side by the SSO
   portal's router):
   ```
   https://YOUR_ORG.awsapps.com/start/#/device?user_code=XXXX-XXXX
   ```
   The plain `aws sso login` CLI wrapper just doesn't surface this field in its human-readable
   output — it's not that the portal lacks support for it. Concatenate `verification_uri` +
   `?user_code=` + the code yourself and send that one link. Only fall back to the split
   URL+code form if you have reason to think the pre-filled version isn't working for the user.
3. Wait for the login process itself to finish — see note below on how, and why you shouldn't need a separate chat confirmation from the user for this
4. Verify: `aws sts get-caller-identity --profile YOUR_PROFILE`

**Important:**
- Always use `--no-browser --use-device-code` — agent has no browser
- Sessions expire — re-login when commands fail with auth errors
- Never store or display credentials in messages or files

**Critical — how you wait matters:**

Step 1 blocks on the OAuth device-code poll until the user approves (or it times out — typically several minutes). If your agent runtime ends its turn / tears down its process between sending the code (step 2) and the user's approval, an ordinary backgrounded shell command is very likely to be killed with it — the code then silently expires unused, even though the user's approval was valid. This is easy to miss because each retry *looks* like a fresh, unrelated failure, when it's really the same lifecycle bug every time.

Two ways to avoid it, depending on what your agent runtime offers:
- **Keep the wait inside one live turn.** Run step 1 synchronously (or via a background job you actively poll without ending your turn) for the duration of the device-code TTL, so the process stays alive until the token exchange completes.
- **Use a durable/detached background-task mechanism**, if your runtime has one, that survives your own process ending and can wake your agent back up on completion — as opposed to a plain "run in background" flag that's scoped to the current process/session.

With the second option you don't need to ask the user to separately confirm in chat that they clicked approve — the device-code login process itself only exits once AWS has registered the approval, so the task's own completion notification *is* the confirmation. Waiting on a redundant "confirmed" message from the user just adds a second, unnecessary synchronization point that can itself go stale (e.g. a user's confirmation crossing with a retry).

Don't assume a repeated device-code failure is a fluke or a user-error ("they clicked too slowly") before ruling this out.

### B) IAM User (non-interactive — for always-on agents)

**Setup (one-time):**
Configure credentials in `~/.aws/credentials`:
```ini
[profile YOUR_PROFILE]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```
And region in `~/.aws/config`:
```ini
[profile YOUR_PROFILE]
region = YOUR_REGION
```

**Usage:** No login needed — credentials are always available.

### C) CI/CD Pipeline (for pipeline mode)

AWS credentials stored in CI secrets (GitHub Secrets, GitLab CI Variables).
Authentication handled by the pipeline, not by the agent.
Options:
- OIDC federation (recommended — no long-lived credentials)
- IAM role with access key

## Using with SST

```bash
# Set profile for all SST commands
export AWS_PROFILE=YOUR_PROFILE

# Deploy
sst deploy --stage dev
sst deploy --stage dev --target MyResource

# Dev mode (hot reload)
sst dev

# Secrets
sst secret set MyApiKey <value> --stage dev
```

## Choosing Auth Method

| Scenario | Method |
|---|---|
| Personal use, interactive | SSO |
| Always-on agent, no user present | IAM User |
| Team/production, code review required | Pipeline (CI/CD) |
