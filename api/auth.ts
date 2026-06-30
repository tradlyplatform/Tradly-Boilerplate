import TradlySDK from "tradly";
import { buildSdkPayload } from "@/api/sdk-context";
import { getDeviceUUID } from "@/config/uuid";
import type {
	User,
	SignInInput,
	SignUpInput,
	VerifyOtpInput,
	ForgotPasswordInput,
	SetPasswordInput,
	ResendOtpInput,
	SocialSignInInput,
	TradlySdkResponse,
} from "@/types/auth.types";

// api/auth.ts owns all payload construction.
// uuid injection and SDK envelope shape live here — not in the state layer.

export const signIn = (
	input: SignInInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<{ user: User }>> =>
	TradlySDK.user.login(
		buildSdkPayload(
			{ user: { ...input, uuid: getDeviceUUID() } },
			currency,
			language,
		),
	);

export const signUp = (
	input: SignUpInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<{ verify_id: string }>> =>
	TradlySDK.user.register(
		buildSdkPayload(
			{ user: { ...input, uuid: getDeviceUUID() } },
			currency,
			language,
		),
	);

export const verifyOtp = (
	input: VerifyOtpInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<{ user: User }>> =>
	TradlySDK.user.verify(
		buildSdkPayload(
			{ ...input, uuid: getDeviceUUID() },
			currency,
			language,
		),
	);

export const forgotPassword = (
	input: ForgotPasswordInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<{ verify_id: string }>> =>
	TradlySDK.user.forgotPassword(
		buildSdkPayload(
			{ user: { ...input, uuid: getDeviceUUID() } },
			currency,
			language,
		),
	);

export const setPassword = (
	input: SetPasswordInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<Record<string, never>>> =>
	TradlySDK.user.setPassword(
		buildSdkPayload(
			{ ...input, uuid: getDeviceUUID() },
			currency,
			language,
		),
	);

export const resendOtp = (
	input: ResendOtpInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<{ verify_id: string }>> =>
	TradlySDK.user.resendOTP(
		buildSdkPayload(
			{ user: { ...input, uuid: getDeviceUUID() } },
			currency,
			language,
		),
	);

export const socialSignIn = (
	input: SocialSignInInput,
	currency: string,
	language: string,
): Promise<TradlySdkResponse<{ user: User }>> =>
	TradlySDK.user.social_login(
		buildSdkPayload(
			{ ...input, uuid: getDeviceUUID() },
			currency,
			language,
		),
	);

export const signOut = (
	authKey: string,
	currency: string,
	language: string,
): Promise<void> =>
	TradlySDK.user.logout(
		buildSdkPayload(
			{ authKey, uuid: getDeviceUUID() },
			currency,
			language,
		),
	);

export const refreshAuth = (
	refreshKey: string,
): Promise<
	TradlySdkResponse<{
		auth_key: string;
		refresh_key: string;
		firebase_token?: string;
	}>
> => TradlySDK.init.refreshAPI(refreshKey);

