// Споделени константи за Meta събития (без crypto — ползва се и от сървъра, и от браузъра).

export const STANDARD_EVENTS = [
  "PageView", "ViewContent", "Lead", "CompleteRegistration", "Contact", "StartTrial", "Subscribe", "Purchase",
] as const;

export const CUSTOM_EVENTS = [
  "UserRegistered", "EmailVerified", "CompanyProfileCompleted", "CompanyLogoUploaded",
  "FirstClientCreated", "FirstInvoiceCreated", "SubscriptionSelected", "SubscriptionActivated",
  "SubscriptionUpgraded", "SubscriptionRenewed",
] as const;

export function isCustomEvent(name: string): boolean {
  return (CUSTOM_EVENTS as readonly string[]).includes(name);
}
