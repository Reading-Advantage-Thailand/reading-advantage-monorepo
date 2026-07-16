/**
 * Loads the Stripe SDK dynamically from a product app.
 * @returns Imported Stripe module namespace.
 */
export async function loadStripeProvider() {
  return import("stripe");
}
