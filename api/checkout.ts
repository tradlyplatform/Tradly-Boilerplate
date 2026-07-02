import TradlySDK from "tradly";
import {
	buildAppMutationPayload,
	buildAppDirectPayload,
	buildAppQueryPayload,
} from "@/api/sdk-context";
import { getDeviceUUID } from "@/config/uuid";
import { AppConfig } from "@/config/app.config";
import type { FullCheckoutPayload } from "@/types/checkout.types";
import type {
	DirectCheckoutInput,
	CheckoutResponse,
	TradlyOrderSdkResponse,
} from "@/types/order.types";

export interface PaymentIntentResponse {
	client_secret: string;
	ephemeral_key?: string;
}

// Cart checkout
// SDK expects: { data: { order: { payment_method_id, ... }, cart?: { uuid } }, authKey, ... }
export const checkout = (
	input: FullCheckoutPayload,
	authKey: string,
	currency: string,
	language: string,
): Promise<TradlyOrderSdkResponse<CheckoutResponse>> => {
	// Extract cart ref from flat payload; everything else goes under `order`
	const { cart: cartRef, ...orderFields } = input;

	const sdkPayload: Record<string, unknown> = {
		order: orderFields,
		...(cartRef ? { cart: cartRef } : {}),
	};

	// Inject guest UUID automatically when not authenticated
	if (!authKey) {
		sdkPayload.cart = {
			...((sdkPayload.cart as object) ?? {}),
			uuid: getDeviceUUID(),
		};
	}

	return (TradlySDK as any).app.checkout(
		buildAppMutationPayload(sdkPayload, authKey, currency, language),
	);
};

// Stripe payment intent — call after checkout, navigate to /payment
export const getPaymentIntent = (
	orderReference: string,
	authKey: string,
	currency: string,
	language: string,
): Promise<TradlyOrderSdkResponse<PaymentIntentResponse>> =>
	(TradlySDK as any).app.getPaymentIntentKey(
		buildAppMutationPayload(
			{ order_reference: orderReference },
			authKey,
			currency,
			language,
		),
	);

// Ephemeral key (Stripe SDK flow — call on page mount)
export const getEphemeralKey = (
	authKey: string,
	currency: string,
	language: string,
	guestEmail?: string,
): Promise<TradlyOrderSdkResponse<PaymentIntentResponse>> =>
	(TradlySDK as any).app.getEphemeralKey(
		buildAppMutationPayload(
			guestEmail ? { guest_email: guestEmail } : {},
			authKey,
			currency,
			language,
		),
	);

// ── Payment URL builders ──────────────────────────────────────────────────────

// Pattern A — paymentIntent window.open redirect
// Used by: stripe_web | razorpay | billplz | payulatam | paydunya | mangopay | opp
// Opens in a new tab; app navigates to /thank-you immediately.
export const PAYMENT_INTENT_TYPES = [
	"stripe_web",
	"razorpay",
	"billplz",
	"payulatam",
	"paydunya",
	"mangopay",
	"opp",
] as const;

export const buildPaymentIntentUrl = (
	orderReference: string,
	paymentMethodId: number,
	authKey: string,
	guestEmail?: string,
): string => {
	const base = `${AppConfig.apiBaseUrl}/v1/payments/web/paymentIntent`;
	const authParam =
		!authKey && guestEmail
			? `&guest_email=${encodeURIComponent(guestEmail)}`
			: `&auth_key=${encodeURIComponent(authKey)}`;
	return `${base}?order_reference=${orderReference}&payment_method_id=${paymentMethodId}&agent=web&domain=${AppConfig.domain}${authParam}`;
};

// Pattern B — external_checkout full-tab redirect
// Used by: pawapay | korapay | paystack | flutterwave | checkoutcom | commercepay
// App stores order ref in localStorage, redirects user, then /payment-return verifies result.
export const EXTERNAL_CHECKOUT_TYPES = [
	"pawapay",
	"korapay",
	"paystack",
	"flutterwave",
	"checkoutcom",
	"commercepay",
] as const;

export const buildExternalCheckoutUrl = (
	orderReference: string,
	authKey: string,
	guestEmail?: string,
): string => {
	const redirectUri =
		import.meta.env.VITE_REDIRECT_URI || window.location.origin;
	const params = new URLSearchParams({
		domain: AppConfig.domain,
		redirect_uri: `${redirectUri}/payment-return`,
		order_reference: orderReference,
		...(authKey ? { token: authKey } : {}),
		...(!authKey && guestEmail ? { guest_email: guestEmail } : {}),
	});
	return `https://${AppConfig.domain}/external_checkout?${params.toString()}`;
};

// Legacy alias kept for any existing imports
export const buildWebPaymentUrl = buildExternalCheckoutUrl;

// Direct checkout — buy a listing without going through the cart
export const directCheckout = (
	listingId: number,
	input: DirectCheckoutInput,
	authKey: string,
	currency: string,
	language: string,
): Promise<TradlyOrderSdkResponse<CheckoutResponse>> =>
	(TradlySDK as any).app.listingDirectCheckout(
		buildAppDirectPayload(
			{ id: listingId, data: input },
			authKey,
			currency,
			language,
		),
	);
