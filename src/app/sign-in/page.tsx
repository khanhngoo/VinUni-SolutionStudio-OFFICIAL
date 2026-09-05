import { getProductionEntraConfigurationError } from "../../../auth";
import {
  developmentIdentityKeys,
  isDevelopmentAuthenticationEnabled,
} from "@/auth/development-identities";
import { Section } from "@/components/ui/section";
import {
  signInWithDevelopmentIdentity,
  signInWithMicrosoftEntra,
} from "./actions";

/**
 * The way in.
 *
 * In development the only accepted identities are the seeded ones, listed
 * explicitly — there is no password field and no arbitrary email, so the
 * allowlist is the whole authentication surface. In production this is a
 * single hand-off to Entra.
 */
export default function SignInPage() {
  const developmentEnabled = isDevelopmentAuthenticationEnabled();
  const productionConfigurationError = getProductionEntraConfigurationError();

  return (
    <main className="max-w-[560px] mx-auto px-6 sm:px-7 py-16 pb-24">
      <h1>Sign in to Solutions Studio</h1>

      {developmentEnabled ? (
        <Section title="Development identities" aside="Local only">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-ink-2 leading-relaxed">
              Pick one of the seeded accounts. No password is accepted, and no
              address outside this list will sign in.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {developmentIdentityKeys.map((identity) => (
                <form action={signInWithDevelopmentIdentity} key={identity}>
                  <input name="identity" type="hidden" value={identity} />
                  <button
                    className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    type="submit"
                  >
                    {identity}
                  </button>
                </form>
              ))}
            </div>
          </div>
        </Section>
      ) : productionConfigurationError ? (
        <div className="mt-6 rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-3 text-ink-2">
          {productionConfigurationError}
        </div>
      ) : (
        <form action={signInWithMicrosoftEntra} className="mt-6">
          <button
            className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            type="submit"
          >
            Sign in with VinUni Microsoft Entra ID
          </button>
          <p className="text-meta text-ink-3 mt-3">
            Your VinUni account decides what you can see — students, faculty and
            partners each land somewhere different.
          </p>
        </form>
      )}
    </main>
  );
}
