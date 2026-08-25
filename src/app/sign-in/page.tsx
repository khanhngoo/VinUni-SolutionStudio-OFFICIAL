import { getProductionEntraConfigurationError } from "../../../auth";
import { developmentIdentityKeys, isDevelopmentAuthenticationEnabled } from "@/auth/development-identities";
import { signInWithDevelopmentIdentity, signInWithMicrosoftEntra } from "./actions";

export default function SignInPage() {
  const developmentEnabled = isDevelopmentAuthenticationEnabled();
  const productionConfigurationError = getProductionEntraConfigurationError();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Sign in to Solutions Studio</h1>
      {developmentEnabled ? (
        <section className="mt-6 rounded-xl border p-5">
          <h2 className="text-lg font-medium">Development-only seeded identities</h2>
          <p className="mt-2 text-sm text-slate-600">Choose an allowlisted local identity. No password or arbitrary email is accepted.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {developmentIdentityKeys.map((identity) => (
              <form action={signInWithDevelopmentIdentity} key={identity}>
                <input name="identity" type="hidden" value={identity} />
                <button className="rounded-md border px-3 py-2 text-sm" type="submit">{identity}</button>
              </form>
            ))}
          </div>
        </section>
      ) : productionConfigurationError ? (
        <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{productionConfigurationError}</p>
      ) : (
        <form action={signInWithMicrosoftEntra} className="mt-6">
          <button className="rounded-md border px-4 py-2" type="submit">Sign in with VinUni Microsoft Entra ID</button>
        </form>
      )}
    </main>
  );
}
