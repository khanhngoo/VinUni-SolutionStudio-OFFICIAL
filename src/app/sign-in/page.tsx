import {
  getProductionEntraConfigurationError,
  isMicrosoftEntraAuthenticationConfigured,
} from "../../../auth";
import {
  developmentIdentityKeys,
  isDevelopmentAuthenticationEnabled,
} from "@/auth/development-identities";
import { isSelfServiceAuthenticationEnabled } from "@/auth/self-service-authentication";
import { Section } from "@/components/ui/section";
import {
  signInWithDevelopmentIdentity,
  signInWithMicrosoftEntra,
} from "./actions";
import { SelfServiceAuthenticationForms } from "./self-service-forms";

/**
 * The way in.
 *
 * The explicitly enabled internal-demo credential path creates basic users
 * without profiles or organization authority. Seeded personas remain a
 * separate local E2E affordance; Entra remains the institutional provider.
 */
export default function SignInPage() {
  const developmentEnabled = isDevelopmentAuthenticationEnabled();
  const selfServiceEnabled = isSelfServiceAuthenticationEnabled();
  const entraEnabled = isMicrosoftEntraAuthenticationConfigured();
  const productionConfigurationError = getProductionEntraConfigurationError();

  return (
    <main className="mx-auto max-w-[920px] px-6 py-16 pb-24 sm:px-7">
      <h1>Sign in to Solutions Studio</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-ink-2">
        Use an internal-demo account, a seeded testing persona, or institutional
        sign-in when it is configured.
      </p>

      {selfServiceEnabled ? (
        <Section title="Email account" aside="Internal demo">
          <SelfServiceAuthenticationForms />
        </Section>
      ) : null}

      {entraEnabled ? (
        <Section title="Institutional account" aside="VinUni SSO">
          <div className="rounded-card border border-line bg-card p-5">
            <form action={signInWithMicrosoftEntra}>
              <button
                className="inline-flex h-10 items-center rounded-card bg-brand px-5 font-semibold text-white hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                type="submit"
              >
                Sign in with VinUni Microsoft Entra ID
              </button>
            </form>
          </div>
        </Section>
      ) : null}

      {developmentEnabled ? (
        <Section title="Development identities" aside="Local only">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="text-ink-2 leading-relaxed">
              Use a seeded account for role-specific and E2E scenarios. These
              identities are unavailable in production mode.
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
      ) : null}

      {!selfServiceEnabled && !entraEnabled && productionConfigurationError ? (
        <div className="mt-7 rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-3 text-ink-2">
          {productionConfigurationError}
        </div>
      ) : null}
    </main>
  );
}
