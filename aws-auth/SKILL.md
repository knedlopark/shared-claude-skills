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
2. Send device code + verification URL to user:
   ```
   Open this URL and enter the code:
   URL: https://YOUR_ORG.awsapps.com/start/#/device
   Code: XXXX-XXXX
   ```
3. Wait for user to confirm
4. Verify: `aws sts get-caller-identity --profile YOUR_PROFILE`

**Important:**
- Always use `--no-browser --use-device-code` — agent has no browser
- Sessions expire — re-login when commands fail with auth errors
- Never store or display credentials in messages or files

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
