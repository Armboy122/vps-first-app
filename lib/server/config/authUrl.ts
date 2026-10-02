/** Preview branch aliases are platform metadata, not attacker-controlled headers. */
export function configurePreviewAuthUrl(env: Record<string, string | undefined> = process.env): void {
    if (env.APP_ENV !== "preview" || env.NEXTAUTH_URL)
        return;
    const hostname = env.VERCEL_BRANCH_URL;
    if (!hostname)
        return; // Root may set the verified URL after the first deploy.
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/i.test(hostname))
        throw new Error("Invalid platform preview authentication alias");
    env.NEXTAUTH_URL = `https://${hostname}`;
}
