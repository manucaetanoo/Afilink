export const META_PIXEL_ID = "3610569409082578";

// Extend this allowlist when adding events. Never pass form values or user data.
export type MetaPixelEvent = "PageView" | "CompleteRegistration";

type PixelCommand =
  | ["init", string]
  | ["set", "autoConfig", boolean, string]
  | ["trackSingle", string, MetaPixelEvent];
type CommerceEvent = "ViewContent" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase";

type CommerceCommand = ["trackSingle", string, CommerceEvent, { content_ids: string[]; content_type: "product"; currency: "UYU"; value?: number }, { eventID: string }?];
type PixelQueue = {
  (...args: PixelCommand | CommerceCommand): void;
  callMethod?: (...args: PixelCommand | CommerceCommand) => void;
  queue: (PixelCommand | CommerceCommand)[];
  push: PixelQueue;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: PixelQueue;
    _fbq?: PixelQueue;
  }
}

let initialized = false;
let lastPage: string | undefined;

export function isMetaPixelExcludedPath(pathname: string) {
  return /^\/(verify-email|reset-password)(\/|$)/.test(pathname);
}

function initializePixel() {
  if (typeof window === "undefined") return;
  if (isMetaPixelExcludedPath(window.location.pathname)) return;

  if (!window.fbq) {
    const fbq: PixelQueue = Object.assign(
      (...args: PixelCommand | CommerceCommand) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      },
      { queue: [] as (PixelCommand | CommerceCommand)[], loaded: true, version: "2.0" },
    ) as PixelQueue;
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq ??= fbq;
  }

  if (!initialized) {
    // Disable automatic event/form detection; no advanced matching data in init.
    window.fbq("set", "autoConfig", false, META_PIXEL_ID);
    window.fbq("init", META_PIXEL_ID);
    initialized = true;
  }
  return window.fbq;
}

/** Queues events even when the external script has not finished loading. */
export function trackMetaEvent(event: MetaPixelEvent) {
  initializePixel()?.("trackSingle", META_PIXEL_ID, event);
}

export function trackMetaCommerce(event: CommerceEvent, productId: string, value?: number, eventId?: string) {
  const command: CommerceCommand = ["trackSingle", META_PIXEL_ID, event,
    { content_ids: [productId], content_type: "product", currency: "UYU", ...(value !== undefined ? { value } : {}) }];
  if (eventId) command.push({ eventID: eventId });
  initializePixel()?.(...command);
}

/** Consecutive route deduplication survives Strict Mode and component remounts. */
export function trackMetaPageView(route: string) {
  if (typeof window === "undefined" || lastPage === route) return;
  if (isMetaPixelExcludedPath(route.split("?")[0])) {
    // Returning from an excluded page to the previous page is a new visit.
    lastPage = undefined;
    return;
  }
  trackMetaEvent("PageView");
  // The route is only a local deduplication key, never an event parameter.
  lastPage = route;
}

/** Accept only the server's explicit confirmation of a newly created affiliate. */
export function trackAffiliateRegistration(status: number, body: unknown) {
  if (
    status === 201 &&
    typeof body === "object" &&
    body !== null &&
    "created" in body && body.created === true &&
    "role" in body && body.role === "AFFILIATE"
  ) {
    trackMetaEvent("CompleteRegistration");
  }
}
