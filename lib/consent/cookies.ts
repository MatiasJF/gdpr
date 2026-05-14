export const NORTHGATE_CONTROLLER_DID = "did:bsv:demo-northgate-market";

export const NORTHGATE_COOKIE_POLICY = `Northgate Market — Cookie Policy (Demo, v1)

We use cookies to operate the site and improve your experience. Cookies are
grouped into the categories listed below. Strictly necessary cookies are
always active. You can grant, customise, or withdraw consent for the other
categories at any time using the controls in the footer.

Categories:
- functional: remember your preferences (cart, region, theme).
- analytics: anonymised usage measurement to improve the catalog.
- advertising: personalised recommendations and partner advertising.

Your choice is recorded as a 1Sat Ordinal consent token in your own wallet.`;

export type CookieCategory =
  | "strictly_necessary"
  | "functional"
  | "analytics"
  | "advertising";

export const COOKIE_CATEGORIES: Array<{
  id: CookieCategory;
  label: string;
  description: string;
  required: boolean;
}> = [
  {
    id: "strictly_necessary",
    label: "Strictly necessary",
    description: "Required for the site to work. Always on.",
    required: true,
  },
  {
    id: "functional",
    label: "Functional",
    description: "Remember preferences such as cart, region, theme.",
    required: false,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Anonymised usage measurement to improve the catalog.",
    required: false,
  },
  {
    id: "advertising",
    label: "Advertising",
    description: "Personalised recommendations and partner advertising.",
    required: false,
  },
];

export type CookieSelection = Record<Exclude<CookieCategory, "strictly_necessary">, boolean>;

export const DEFAULT_SELECTION: CookieSelection = {
  functional: false,
  analytics: false,
  advertising: false,
};

export function selectionToPurposeIds(selection: CookieSelection): string[] {
  const ids = ["cookies:strictly_necessary"];
  if (selection.functional) ids.push("cookies:functional");
  if (selection.analytics) ids.push("cookies:analytics");
  if (selection.advertising) ids.push("cookies:advertising");
  return ids;
}

export function purposeIdsToSelection(purposeIds: string[]): CookieSelection {
  return {
    functional: purposeIds.includes("cookies:functional"),
    analytics: purposeIds.includes("cookies:analytics"),
    advertising: purposeIds.includes("cookies:advertising"),
  };
}

export function isCookieConsent(controller: string, purposeIds: string[]): boolean {
  return controller === NORTHGATE_CONTROLLER_DID && purposeIds.some((p) => p.startsWith("cookies:"));
}
