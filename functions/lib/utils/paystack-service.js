"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const crypto = require("crypto");
class PaystackService {
    /**
     * Retrieves the Paystack Secret Key from environment or fallback
     */
    static getSecretKey() {
        return process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || "";
    }
    /**
     * Verifies the webhook signature using HMAC SHA512
     */
    static verifyWebhookSignature(rawBody, signatureHeader) {
        try {
            const secret = this.getSecretKey();
            if (!secret || !signatureHeader)
                return false;
            const hash = crypto
                .createHmac("sha512", secret)
                .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
                .digest("hex");
            return hash === signatureHeader;
        }
        catch (err) {
            console.error("[PaystackService] Signature verification error:", err);
            return false;
        }
    }
    /**
     * Initializes a Paystack transaction (standard / inline checkout URL)
     */
    static async initializeTransaction(options) {
        const secret = this.getSecretKey();
        const reference = options.reference || `NEXA_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        // Development sandbox simulation if key is placeholder or starts with sandbox_
        if (secret.includes("placeholder") || secret.startsWith("sandbox_")) {
            console.log("[PaystackService] Sandbox mode active for transaction initialization.");
            return {
                authorizationUrl: `https://checkout.paystack.com/sandbox-mock-${reference}`,
                accessCode: `mock_code_${reference}`,
                reference,
            };
        }
        const payload = {
            email: options.email,
            amount: options.amountInKobo,
            reference,
            callback_url: options.callbackUrl,
            metadata: options.metadata || {},
        };
        if (options.plan)
            payload.plan = options.plan;
        if (options.channels)
            payload.channels = options.channels;
        if (options.bearer)
            payload.bearer = options.bearer;
        const response = await fetch(`${this.BASE_URL}/transaction/initialize`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const resJson = (await response.json());
        if (!response.ok || !resJson.status) {
            throw new Error(resJson.message || "Failed to initialize Paystack transaction.");
        }
        return {
            authorizationUrl: resJson.data.authorization_url,
            accessCode: resJson.data.access_code,
            reference: resJson.data.reference,
        };
    }
    /**
     * Verifies a transaction reference with Paystack
     */
    static async verifyTransaction(reference) {
        const secret = this.getSecretKey();
        if (secret.includes("placeholder") || reference.startsWith("NEXA_MOCK_")) {
            console.log("[PaystackService] Mock verifying sandbox reference:", reference);
            return {
                status: "success",
                amount: 6500,
                amountInKobo: 650000,
                paidAt: new Date().toISOString(),
                channel: "card",
                currency: "NGN",
                customer: { email: "merchant@nexastoreos.com" },
                metadata: { targetTier: "professional", storeId: "sandbox-store" },
            };
        }
        const response = await fetch(`${this.BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
        });
        const resJson = (await response.json());
        if (!response.ok || !resJson.status) {
            throw new Error(resJson.message || "Failed to verify Paystack transaction.");
        }
        const data = resJson.data;
        return {
            status: data.status,
            amount: (data.amount || 0) / 100,
            amountInKobo: data.amount,
            paidAt: data.paid_at,
            channel: data.channel,
            currency: data.currency,
            customer: {
                email: data.customer?.email,
                customerCode: data.customer?.customer_code,
            },
            metadata: data.metadata || {},
            authorization: data.authorization
                ? {
                    authorizationCode: data.authorization.authorization_code,
                    cardType: data.authorization.card_type,
                    last4: data.authorization.last4,
                    expMonth: data.authorization.exp_month,
                    expYear: data.authorization.exp_year,
                    bank: data.authorization.bank,
                }
                : undefined,
        };
    }
    /**
     * Resolves a Nigerian 10-digit NUBAN bank account number
     */
    static async resolveAccountNumber(accountNumber, bankCode) {
        const secret = this.getSecretKey();
        if (secret.includes("placeholder") || accountNumber === "0123456789") {
            return {
                accountNumber,
                accountName: "NEXA TEST AGENT ACCOUNT",
                bankId: 1,
            };
        }
        const response = await fetch(`${this.BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${secret}`,
            },
        });
        const resJson = (await response.json());
        if (!response.ok || !resJson.status) {
            throw new Error(resJson.message || "Could not resolve bank account details. Verify account number and bank.");
        }
        return {
            accountNumber: resJson.data.account_number,
            accountName: resJson.data.account_name,
            bankId: resJson.data.bank_id,
        };
    }
    /**
     * Fetches list of supported Nigerian banks
     */
    static async listBanks() {
        const secret = this.getSecretKey();
        try {
            const response = await fetch(`${this.BASE_URL}/bank?country=nigeria&perPage=100`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${secret}`,
                },
            });
            const resJson = (await response.json());
            if (response.ok && resJson.status && Array.isArray(resJson.data)) {
                return resJson.data.map((b) => ({
                    name: b.name,
                    code: b.code,
                    slug: b.slug,
                    id: b.id,
                }));
            }
        }
        catch (e) {
            console.warn("[PaystackService] Falling back to default static bank list", e);
        }
        // Static fallback list of major Nigerian banks
        return [
            { name: "Access Bank", code: "044", slug: "access-bank", id: 1 },
            { name: "Guaranty Trust Bank (GTBank)", code: "058", slug: "gtbank", id: 2 },
            { name: "Zenith Bank", code: "057", slug: "zenith-bank", id: 3 },
            { name: "First Bank of Nigeria", code: "011", slug: "first-bank-of-nigeria", id: 4 },
            { name: "United Bank for Africa (UBA)", code: "033", slug: "united-bank-for-africa", id: 5 },
            { name: "Opay (Paycom)", code: "999992", slug: "opay", id: 6 },
            { name: "PalmPay", code: "999991", slug: "palmpay", id: 7 },
            { name: "Kuda Bank", code: "50211", slug: "kuda-bank", id: 8 },
            { name: "Moniepoint MFB", code: "50515", slug: "moniepoint-mfb", id: 9 },
            { name: "Stanbic IBTC Bank", code: "221", slug: "stanbic-ibtc-bank", id: 10 },
            { name: "Sterling Bank", code: "232", slug: "sterling-bank", id: 11 },
            { name: "Fidelity Bank", code: "070", slug: "fidelity-bank", id: 12 },
            { name: "Wema Bank", code: "035", slug: "wema-bank", id: 13 },
            { name: "Union Bank of Nigeria", code: "032", slug: "union-bank-of-nigeria", id: 14 },
        ];
    }
    /**
     * Creates a Transfer Recipient for payouts
     */
    static async createTransferRecipient(options) {
        const secret = this.getSecretKey();
        if (secret.includes("placeholder") || secret.startsWith("sandbox_")) {
            const mockCode = `RCP_MOCK_${Date.now().toString(36).toUpperCase()}`;
            return {
                recipientCode: mockCode,
                name: options.name,
                accountNumber: options.accountNumber,
                bankCode: options.bankCode,
            };
        }
        const payload = {
            type: "nuban",
            name: options.name,
            account_number: options.accountNumber,
            bank_code: options.bankCode,
            currency: options.currency || "NGN",
            description: options.description || "NEXA Field Agent Payout",
        };
        const response = await fetch(`${this.BASE_URL}/transferrecipient`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const resJson = (await response.json());
        if (!response.ok || !resJson.status) {
            throw new Error(resJson.message || "Failed to create transfer recipient with Paystack.");
        }
        return {
            recipientCode: resJson.data.recipient_code,
            name: resJson.data.name,
            accountNumber: resJson.data.details?.account_number || options.accountNumber,
            bankCode: resJson.data.details?.bank_code || options.bankCode,
        };
    }
    /**
     * Initiates a bank transfer payout
     */
    static async initiateTransfer(options) {
        const secret = this.getSecretKey();
        const reference = options.reference || `TRF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        if (secret.includes("placeholder") || secret.startsWith("sandbox_")) {
            console.log("[PaystackService] Mocking bank transfer payout for reference:", reference);
            return {
                transferCode: `TRF_CODE_MOCK_${reference}`,
                reference,
                status: "success",
                amountInKobo: options.amountInKobo,
            };
        }
        const payload = {
            source: options.source || "balance",
            amount: options.amountInKobo,
            recipient: options.recipientCode,
            reason: options.reason || "Nexa Agent Commission Disbursement",
            reference,
        };
        const response = await fetch(`${this.BASE_URL}/transfer`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const resJson = (await response.json());
        if (!response.ok || !resJson.status) {
            throw new Error(resJson.message || "Failed to initiate transfer via Paystack.");
        }
        return {
            transferCode: resJson.data.transfer_code,
            reference: resJson.data.reference,
            status: resJson.data.status,
            amountInKobo: resJson.data.amount,
        };
    }
}
exports.PaystackService = PaystackService;
PaystackService.BASE_URL = "https://api.paystack.co";
//# sourceMappingURL=paystack-service.js.map