// services/license.js
// Verifies a Pro license key against Gumroad's public License API.
// This is a real, working call, not a stub \u2014 but you must set
// GUMROAD_PRODUCT_ID to your actual product's ID before it will verify
// real purchases.
//
// IMPORTANT: Gumroad's license-verify API requires product_id (not the
// older product_permalink) for any product created on or after January 9,
// 2023 \u2014 which is any new product you set up today. Using the permalink
// alone will fail with "The 'product_id' parameter is required..." Find
// your product_id at Gumroad \u2192 Products \u2192 your product \u2192 Share \u2192 API tab
// (a short alphanumeric string, NOT the URL slug).
//
// Why Gumroad specifically: its License API is a public, unauthenticated
// endpoint designed to be called straight from client code, so it keeps
// the "no backend" BYOK philosophy intact \u2014 no server of your own needed
// just to gate a feature.
window.WriteFlow = window.WriteFlow || {};

const GUMROAD_PRODUCT_ID = "wlUJgn_fuauyHzl6s_Ow9g==";

window.WriteFlow.License = {
  async verify(licenseKey) {
    if (!licenseKey || !licenseKey.trim()) {
      return { valid: false, error: "Enter a license key." };
    }
    if (GUMROAD_PRODUCT_ID === "REPLACE_WITH_YOUR_GUMROAD_PRODUCT_ID") {
      return {
        valid: false,
        error: "License checking isn't configured yet \u2014 set GUMROAD_PRODUCT_ID in services/license.js once your Gumroad product exists (find it under Share \u2192 API on the product page, not the URL slug)."
      };
    }

    try {
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product_id: GUMROAD_PRODUCT_ID,
          license_key: licenseKey.trim()
        })
      });
      const data = await res.json();

      if (!data.success) {
        return { valid: false, error: data.message || "That license key wasn't recognised." };
      }
      if (data.purchase?.refunded || data.purchase?.chargebacked) {
        return { valid: false, error: "This license is no longer active (refunded or disputed)." };
      }
      return { valid: true, purchase: data.purchase };
    } catch (err) {
      return { valid: false, error: "Couldn't reach the license server. Check your connection and try again." };
    }
  }
};
