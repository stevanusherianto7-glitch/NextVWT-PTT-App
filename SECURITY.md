# Security and release checklist for NextVWT

This document explains how to produce and configure the Android signing fingerprint used by the runtime security checks, where to store secrets for CI/hosting, and how to verify the checks locally and in CI.

## Summary
- Do NOT commit signing keys or production secrets to the repository.
- Produce the SHA‑256 fingerprint from your Android release keystore and save it as a secret named `VITE_EXPECTED_SIGNING_HASH` in your CI/hosting provider (GitHub Actions, Vercel, etc.).
- Ensure CI injects `VITE_EXPECTED_SIGNING_HASH` into the production build so the client bundle includes the expected fingerprint for runtime verification.

## Generate SHA‑256 fingerprint from keystore
1. Using keytool (JDK):

   keytool -list -v -keystore release.keystore -alias <alias>

   - Enter keystore password when prompted.
   - Find the `SHA256` / `SHA-256` fingerprint in the output. It looks like:

     SHA256: 8F:3A:C4:DE:0F:7B:1A:...:9A:8B

2. Normalize format:
   - The code compares values using exact string equality. To avoid mismatches, store the fingerprint in uppercase with colon separators (the same format printed by keytool). Example:

     8F:3A:C4:DE:0F:7B:1A:E2:B4:...:9A:8B

## Where to store the secret
- GitHub: Repository → Settings → Secrets → Actions (or repository environment). Name it `VITE_EXPECTED_SIGNING_HASH`.
- Vercel / Netlify: Add it to Environment Variables for the Production environment.
- Supabase (server-side secrets): Keep server-only secrets (e.g., `SUPABASE_SERVICE_ROLE_KEY`) in Supabase Dashboard → Project → Settings → Edge Function Secrets or in your hosting provider.

## CI: inject the secret into build
- The client reads `import.meta.env.VITE_EXPECTED_SIGNING_HASH` at build time. Ensure your CI build step provides `VITE_EXPECTED_SIGNING_HASH` in the environment when running the production build.

Example (GitHub Actions step):

```yaml
- name: Build production
  env:
    VITE_EXPECTED_SIGNING_HASH: ${{ secrets.VITE_EXPECTED_SIGNING_HASH }}
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
  run: pnpm run build
```

## Verification (post-release)
1. Install the signed APK on a real device (not emulator).
2. Open the app and check logs (adb logcat) for `[AppSecurity] Signing certificate verification passed successfully.` or errors reported by `performSecurityAudit()`.
3. If verification fails, ensure:
   - The CI secret `VITE_EXPECTED_SIGNING_HASH` matches the keystore used to sign the APK.
   - The native AppSecurity plugin returns the fingerprint in the expected format. If the plugin returns a fingerprint without colons or in lower-case, normalize it in native side or in the compare logic.

## Development notes
- During development and testing, keep `VITE_EXPECTED_SIGNING_HASH` empty — app will warn but not block. In production builds, make sure the secret is set—otherwise runtime will report `SIGNING_HASH_NOT_CONFIGURED` and impose a small penalty to the security score.
- Do NOT expose signing hash in public repositories, logs, or client‑side source maps.

## Troubleshooting
- If you see `SIGNING_HASH_FETCH_FAILED` in logs: ensure the native AppSecurity plugin is installed and properly registered in the native Android project.
- If you get `INVALID_SIGNATURE` but you expect a valid build: double-check the keystore used for signing vs the fingerprint you stored in CI.

