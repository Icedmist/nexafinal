/**
 * Service class handling Token Introspection and programmatic Webhook Subscription
 * for Moniepoint B2B Integration inside NEXA Store OS.
 */
export class MoniepointIntegrationService {
  private static readonly INTROSPECT_URL = "https://api.moniepoint.com/v1/introspect";
  private static readonly WEBHOOK_GROUP_URL = "https://api.moniepoint.com/v1/webhook-subscription-groups";

  /**
   * Validates an API token with Moniepoint's Introspection endpoint.
   * Supports sandbox tokens for local development.
   */
  public static async introspectToken(token: string): Promise<{
    merchantReference: string;
    businessName: string;
    scopes: string[];
  }> {
    const isSandboxToken = token.startsWith("sandbox_") || token === "nexa_moniepoint_test_token_2026";

    if (isSandboxToken) {
      console.log("[MoniepointService] Sandbox Mode active: Bypassing real API call.");
      return {
        merchantReference: `MP-MERCH-${token.substring(8, 14) || "7712"}`,
        businessName: token === "nexa_moniepoint_test_token_2026" 
          ? "NEXA Demo Retailers Ltd" 
          : `Nexa Sandbox Business (${token.substring(8, 16) || "Dev"})`,
        scopes: ["transaction:read", "transaction:write"],
      };
    }

    try {
      console.log("[MoniepointService] Forwarding token server-side for introspection...");
      const response = await fetch(this.INTROSPECT_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[MoniepointService] Introspection response failure:", errorText);
        throw new Error("Token validation failed with Moniepoint API.");
      }

      const data = (await response.json()) as any;
      
      // Validation check: Verify scopes
      const scopes = Array.isArray(data.scopes) ? data.scopes : (data.allowedScopes || []);
      const hasReadScope = scopes.includes("transaction:read");

      if (!hasReadScope) {
        throw new Error("API Token lacks required 'transaction:read' scope.");
      }

      if (data.active === false || data.expired === true) {
        throw new Error("API Token is inactive or expired.");
      }

      return {
        merchantReference: data.merchantReference || data.merchantId || "",
        businessName: data.businessName || data.name || "Linked Moniepoint Merchant",
        scopes,
      };
    } catch (error: any) {
      console.error("[MoniepointService] Introspection Error:", error);
      throw new Error(error.message || "Failed to introspect Moniepoint token.");
    }
  }

  /**
   * Registers a new webhook subscription group with Moniepoint.
   * Returns the registered group's ID.
   */
  public static async registerWebhookGroup(
    decryptedToken: string,
    storeTenantId: string
  ): Promise<string> {
    const isSandboxToken = decryptedToken.startsWith("sandbox_") || decryptedToken === "nexa_moniepoint_test_token_2026";
    const webhookSecretKey = process.env.MONIEPOINT_WEBHOOK_SECRET_KEY || "nexa-moniepoint-webhook-secret-key-2026";

    if (isSandboxToken) {
      console.log("[MoniepointService] Sandbox Mode active: Generating mock webhook group.");
      return `MP-WH-GRP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }

    try {
      console.log("[MoniepointService] Registering webhook group at Moniepoint...");
      
      const payload = {
        url: "https://api.nexastore.os/api/v1/webhooks/moniepoint",
        events: ["transaction.success", "transaction.failed", "transaction.reversed"],
        authType: "BASIC",
        secretKey: webhookSecretKey,
      };

      const response = await fetch(this.WEBHOOK_GROUP_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${decryptedToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[MoniepointService] Webhook lifecycle registration failed:", errorText);
        throw new Error("Failed to register webhook subscription with Moniepoint.");
      }

      const data = (await response.json()) as any;
      return data.webhookGroupId || data.id || `wh_grp_${storeTenantId.substring(0, 8)}`;
    } catch (error: any) {
      console.error("[MoniepointService] Webhook Registration Error:", error);
      throw new Error(error.message || "Failed to programmatically link webhook at Moniepoint.");
    }
  }
}
