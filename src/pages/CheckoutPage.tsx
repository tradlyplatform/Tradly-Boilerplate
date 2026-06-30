import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import {
	useGetCartQuery,
	useGetCartWithCommissionsQuery,
	useApplyCouponMutation,
	useRemoveCouponMutation,
	cartApi,
} from "@/state/cart/api";
import {
	useCheckoutMutation,
	usePaymentIntentMutation,
} from "@/state/orders/api";
import {
	useGetAddressesQuery,
	useGetStorageHubAddressesQuery,
	useAddAddressMutation,
} from "@/state/addresses/api";
import {
	useGetShippingMethodsQuery,
	useGetSendCloudShipmentMethodsQuery,
	useGetExternalShipmentMethodsQuery,
} from "@/state/shipping-methods/api";
import { useGetPaymentMethodsQuery } from "@/state/payment-methods/api";
import {
	useGetCartCommissionsQuery,
	useGetDemandCommissionsQuery,
} from "@/state/commissions/api";
import { useGetSchedulesQuery } from "@/state/schedules/api";
import { useAuthSelector } from "@/state/auth/selectors";
import { AppConfig } from "@/config/app.config";
import {
	buildPaymentIntentUrl,
	buildExternalCheckoutUrl,
	PAYMENT_INTENT_TYPES,
	EXTERNAL_CHECKOUT_TYPES,
} from "@/api/checkout";
import Layout from "../components/Layout";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { Loader2 } from "lucide-react";
import type {
	FullCheckoutPayload,
	Address,
	StorageHubAddress,
	ShippingMethod,
	ShipmentMethod,
	PaymentMethod,
	Commission,
	CartCommissionEntry,
} from "@/types/checkout.types";
import type { SchedulesPerDay, ScheduleSlot } from "@/api/schedules";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIAL_TYPES = ["events", "appointments", "donation"];
const SCHEDULE_TYPES = ["events", "appointments"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RadioCard({
	checked,
	onChange,
	children,
	extra,
}: {
	checked: boolean;
	onChange: () => void;
	children: React.ReactNode;
	extra?: React.ReactNode;
}) {
	return (
		<label
			className={`flex items-start gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
				checked
					? "border-coffee-accent bg-coffee-secondary/20"
					: "border-border bg-card hover:bg-muted/50"
			}`}
		>
			<input
				type="radio"
				className="mt-0.5 flex-shrink-0 accent-coffee-accent"
				checked={checked}
				onChange={onChange}
			/>
			<div className="flex-1">{children}</div>
			{extra}
		</label>
	);
}

function SectionBox({
	title,
	action,
	children,
}: {
	title: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-card border border-border rounded-xl p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
				{action}
			</div>
			{children}
		</div>
	);
}

// ─── Add address inline form ──────────────────────────────────────────────────

function AddAddressForm({
	onSaved,
	onCancel,
}: {
	onSaved: (addr: Address) => void;
	onCancel: () => void;
}) {
	const [addAddress, { isLoading }] = useAddAddressMutation();
	const [form, setForm] = useState({
		name: "",
		phone_number: "",
		address_line_1: "",
		address_line_2: "",
		city: "",
		state: "",
		country: "",
		post_code: "",
		type: "shipping",
	});
	const [err, setErr] = useState("");
	const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setForm((v) => ({ ...v, [f]: e.target.value }));
	const req = ["name", "address_line_1", "city", "country"] as const;

	const handleSave = async () => {
		if (req.some((k) => !form[k])) {
			setErr("Fill in all required fields.");
			return;
		}
		const result = await addAddress(form);
		if ("error" in result) {
			setErr("Failed to save address.");
			return;
		}
		onSaved((result as any).data?.address);
	};

	const fields: [string, string][] = [
		["name", "Full name *"],
		["phone_number", "Phone"],
		["address_line_1", "Address line 1 *"],
		["address_line_2", "Address line 2"],
		["city", "City *"],
		["state", "State / Province"],
		["post_code", "Postal code"],
		["country", "Country *"],
	];

	return (
		<div className="bg-muted/50 border border-border rounded-lg p-5 mt-3">
			<h3 className="text-sm font-bold text-foreground mb-4">Add new address</h3>
			{err && <p className="text-xs text-destructive mb-3">{err}</p>}
			<div className="grid grid-cols-2 gap-3">
				{fields.map(([key, label]) => (
					<div key={key} className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground">{label}</label>
						<input
							className="px-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
							value={(form as any)[key]}
							onChange={set(key)}
							placeholder={label.replace(" *", "")}
						/>
					</div>
				))}
			</div>
			<div className="flex gap-3 mt-4">
				<Button size="sm" className="btn-hero" onClick={handleSave} disabled={isLoading}>
					{isLoading ? "Saving…" : "Save address"}
				</Button>
				<Button size="sm" variant="outline" className="btn-secondary" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	);
}

// ─── Cart commission row ──────────────────────────────────────────────────────

function CartCommissionRow({
	commission,
	applied,
	onApply,
}: {
	commission: Commission;
	applied?: CartCommissionEntry;
	onApply: (entry: CartCommissionEntry) => void;
}) {
	const [amount, setAmount] = useState(
		applied?.amount ?? commission.commission_data.min_amount,
	);
	const [err, setErr] = useState("");
	const { min_amount, max_amount } = commission.commission_data;

	const handleApply = () => {
		if (amount < min_amount || amount > max_amount) {
			setErr(`Enter an amount between ${min_amount} and ${max_amount}`);
			return;
		}
		setErr("");
		onApply({ id: commission.id, amount });
	};

	return (
		<div className="flex flex-col gap-1.5 pb-4 border-b border-border last:border-0 last:pb-0">
			<div>
				<p className="text-sm font-semibold text-foreground">
					{commission.title}
					{!commission.commission_data.optional && <span className="text-destructive ml-1">*</span>}
				</p>
				{commission.description && <p className="text-xs text-muted-foreground mt-0.5">{commission.description}</p>}
				<p className="text-[11px] text-muted-foreground mt-0.5">Min: {min_amount} · Max: {max_amount}</p>
			</div>
			<div className="flex gap-2 items-center">
				<input
					type="number"
					className="w-24 px-2.5 py-1.5 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					value={amount}
					onChange={(e) => setAmount(Number(e.target.value))}
					placeholder="Amount"
				/>
				<Button size="sm" className="btn-hero h-8 text-xs" onClick={handleApply}>Apply</Button>
			</div>
			{err && <p className="text-xs text-destructive">{err}</p>}
			{applied && <span className="text-xs text-green-600 font-semibold">✓ Applied ({applied.amount})</span>}
		</div>
	);
}

// ─── Demand commission toggle ─────────────────────────────────────────────────

function DemandCommissionRow({
	commission,
	enabled,
	onToggle,
}: {
	commission: Commission;
	enabled: boolean;
	onToggle: (id: number) => void;
}) {
	return (
		<div className="flex justify-between items-center gap-3">
			<div>
				<p className="text-sm font-semibold text-foreground">{commission.title}</p>
				{commission.description && <p className="text-xs text-muted-foreground mt-0.5">{commission.description}</p>}
			</div>
			<button
				onClick={() => onToggle(commission.id)}
				className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
					enabled
						? "bg-coffee-accent text-coffee-accent-foreground border-coffee-accent"
						: "bg-card text-muted-foreground border-border hover:border-coffee-accent"
				}`}
			>
				{enabled ? "On" : "Off"}
			</button>
		</div>
	);
}

// ─── Schedule selector ────────────────────────────────────────────────────────

function ScheduleSelector({
	dates,
	schedulesPerDay,
	selectedDateIdx,
	onSelectDate,
	selectedSlotIdx,
	onSelectSlot,
}: {
	dates: string[];
	schedulesPerDay: SchedulesPerDay[];
	selectedDateIdx: number;
	onSelectDate: (i: number) => void;
	selectedSlotIdx: number | null;
	onSelectSlot: (i: number) => void;
}) {
	const today = schedulesPerDay[selectedDateIdx];
	return (
		<div>
			{/* Date row */}
			<div className="flex gap-2 overflow-x-auto pb-3">
				{dates.map((d, i) => (
					<button
						key={d}
						onClick={() => onSelectDate(i)}
						className={`flex flex-col items-center px-3 py-2 border rounded-lg cursor-pointer min-w-[52px] gap-0.5 transition-colors ${
							i === selectedDateIdx
								? "border-coffee-accent bg-coffee-secondary/20"
								: "border-border bg-card hover:bg-muted"
						}`}
					>
						<span className="text-[10px] text-muted-foreground uppercase">{dayjs(d).format("ddd")}</span>
						<span className="text-base font-bold text-foreground">{dayjs(d).format("D")}</span>
						<span className="text-[10px] text-muted-foreground">{dayjs(d).format("MMM")}</span>
					</button>
				))}
			</div>

			{/* Time slots */}
			{today ? (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 mt-3">
					{today.schedules.map((slot, i) => {
						const isUnavailable = !slot.available || (slot.stocks_left !== undefined && slot.stocks_left <= 0);
						return (
							<button
								key={i}
								disabled={isUnavailable}
								onClick={() => !isUnavailable && onSelectSlot(i)}
								className={`px-3 py-2.5 border rounded-lg text-center transition-colors ${
									i === selectedSlotIdx
										? "border-coffee-accent bg-coffee-secondary/20"
										: "border-border bg-card hover:bg-muted"
								} ${isUnavailable ? "opacity-40 cursor-not-allowed bg-muted" : "cursor-pointer"}`}
							>
								<span className="text-xs font-semibold text-foreground block">{slot.start_time} – {slot.end_time}</span>
								{slot.stocks_left !== undefined && (
									<span className="text-[11px] text-muted-foreground mt-0.5 block">{slot.stocks_left} left</span>
								)}
							</button>
						);
					})}
				</div>
			) : (
				<p className="text-xs text-muted-foreground italic mt-2">No available slots for this date.</p>
			)}
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const isAuthenticated = useAuthSelector((st) => st.isAuthenticated);
	const authKey = useAuthSelector((st) => st.authKey ?? "");
	const useAccountShipping = AppConfig.enableShippingMethodsPreference;

	// Declared early so useGetCartWithCommissionsQuery can use it as arg
	const [cartCommEntries, setCartCommEntries] = useState<CartCommissionEntry[]>([]);

	// ── Cart ──
	const { data: cartData, isLoading: cartLoading } = useGetCartQuery();
	const { data: commCartData } = useGetCartWithCommissionsQuery(
		cartCommEntries,
		{ skip: cartCommEntries.length === 0 },
	);
	// When commissions are active, use the commission-priced cart for display
	const activeCartData = cartCommEntries.length > 0 && commCartData ? commCartData : cartData;
	const items = activeCartData?.cart_details ?? [];
	const summary = activeCartData?.cart ?? null;

	const checkoutType = (items[0] as any)?.listing?.order_type ?? "listings";
	const isSpecialType = SPECIAL_TYPES.includes(checkoutType);
	const isScheduleType = SCHEDULE_TYPES.includes(checkoutType);
	const isDonation = checkoutType === "donation";
	const isDigital = checkoutType === "digital";
	const needsShipping = !isSpecialType && !isDigital;
	const sellerAccountId = (items[0] as any)?.listing?.account?.id;

	// ── Shipping methods — two patterns ──
	const { data: tenantShipping, isLoading: tenantShippingLoading } =
		useGetShippingMethodsQuery(
			{ type: "tenant" },
			{ skip: !needsShipping || useAccountShipping },
		);
	const { data: accountShipping, isLoading: accountShippingLoading } =
		useGetShippingMethodsQuery(
			{ type: "account", account_id: sellerAccountId },
			{ skip: !needsShipping || !useAccountShipping || !sellerAccountId },
		);
	const shippingData = useAccountShipping ? accountShipping : tenantShipping;
	const shippingMethods = shippingData?.shipping_methods?.filter((m: any) => m.active) ?? [];
	const shippingLoading = useAccountShipping ? accountShippingLoading : tenantShippingLoading;

	// ── Addresses ──
	const { data: addressData } = useGetAddressesQuery(undefined, { skip: !isAuthenticated });
	const { data: hubData } = useGetStorageHubAddressesQuery();
	const addresses = addressData?.addresses ?? [];
	const storageHubAddresses = (hubData as any)?.addresses ?? [];

	// ── Payment ──
	const { data: paymentData, isLoading: paymentLoading } = useGetPaymentMethodsQuery();
	const paymentMethods = paymentData?.payment_methods?.filter((m: any) => m.active) ?? [];

	// ── Commissions ──
	const { data: cartCommData } = useGetCartCommissionsQuery();
	const { data: demandCommData } = useGetDemandCommissionsQuery(undefined, { skip: !isAuthenticated });
	const cartCommissions = cartCommData?.commissions ?? [];
	const demandCommissions = demandCommData?.commissions ?? [];

	// ── Mutations ──
	const [applyCoupon, { isLoading: isApplyingCoupon }] = useApplyCouponMutation();
	const [removeCoupon, { isLoading: isRemovingCoupon }] = useRemoveCouponMutation();
	const [checkout, { isLoading: isPlacing }] = useCheckoutMutation();
	const [paymentIntent, { isLoading: isCreatingIntent }] = usePaymentIntentMutation();

	// ── Selections ──
	const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
	const [selectedHub, setSelectedHub] = useState<StorageHubAddress | null>(null);
	const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
	const [selectedShipment, setSelectedShipment] = useState<ShipmentMethod | null>(null);
	const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
	const [demandCommIds, setDemandCommIds] = useState<number[]>([]);

	// ── Schedule ──
	const startDate = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
	const [selectedDateIdx, setSelectedDateIdx] = useState(0);
	const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);

	const { data: scheduleData } = useGetSchedulesQuery(
		{
			listingId: (items[0] as any)?.listing?.id,
			startAt: startDate,
			days: 30,
		},
		{ skip: !isScheduleType || !items[0] },
	);
	const schedulesPerDay: SchedulesPerDay[] = (scheduleData?.schedules_per_day ?? []).filter(
		(s) => s.schedules.length > 0,
	);
	const dates = schedulesPerDay.map((s) => s.day);

	useEffect(() => { setSelectedSlotIdx(null); }, [selectedDateIdx]);

	// ── Guest ──
	const [guestEmail, setGuestEmail] = useState("");
	const [guestName, setGuestName] = useState("");
	const [guestPhone, setGuestPhone] = useState("");
	const [guestAddress1, setGuestAddress1] = useState("");
	const [guestAddress2, setGuestAddress2] = useState("");
	const [guestCity, setGuestCity] = useState("");
	const [guestState, setGuestState] = useState("");
	const [guestCountry, setGuestCountry] = useState("");
	const [guestPostCode, setGuestPostCode] = useState("");

	// ── Coupon ──
	const [couponInput, setCouponInput] = useState("");
	const [couponMsg, setCouponMsg] = useState("");

	// ── Misc ──
	const [showAddForm, setShowAddForm] = useState(false);
	const [isDonateAnon, setIsDonateAnon] = useState(false);
	const [error, setError] = useState("");
	const [isRedirecting, setIsRedirecting] = useState(false);

	// ── Sub-shipment (SendCloud / external) ──
	const isSendCloud = selectedShipping?.channel === "sendcloud";
	const isExternal = !!(
		selectedShipping?.metadata?.extension_id &&
		selectedShipping?.metadata?.price_list !== false
	);

	const { data: sendCloudData } = useGetSendCloudShipmentMethodsQuery(
		{
			shipping_method_id: selectedShipping!?.id,
			country: (selectedAddress as any)?.country_code ?? "",
		},
		{ skip: !isSendCloud || !selectedAddress },
	);
	const { data: externalData } = useGetExternalShipmentMethodsQuery(
		{
			shipping_method_id: selectedShipping!?.id,
			shipping_address_id: selectedAddress!?.id,
		},
		{ skip: !isExternal || !selectedAddress?.id },
	);
	const subMethods = isSendCloud
		? (sendCloudData?.shipment_methods ?? [])
		: isExternal
			? (externalData?.shipment_methods ?? [])
			: [];

	useEffect(() => { setSelectedShipment(null); }, [selectedShipping?.id, selectedAddress?.id]);

	// ── Auto-selects ──
	useEffect(() => {
		if (selectedAddress || !addresses.length) return;
		setSelectedAddress(addresses.find((a: any) => a.default) ?? addresses[0]);
	}, [addresses.length]);

	useEffect(() => {
		if (selectedShipping?.type !== "storage_hub") return;
		if (selectedHub || !storageHubAddresses.length) return;
		setSelectedHub(storageHubAddresses[0]);
	}, [selectedShipping?.type, storageHubAddresses.length]);

	useEffect(() => {
		if (selectedShipping || !shippingMethods.length) return;
		setSelectedShipping(shippingMethods[0]);
	}, [shippingMethods.length]);

	useEffect(() => {
		if (selectedPayment || !paymentMethods.length) return;
		setSelectedPayment(paymentMethods[0]);
	}, [paymentMethods.length]);

	useEffect(() => {
		if (!cartLoading && items.length === 0) navigate("/cart", { replace: true });
	}, [cartLoading, items.length]);

	// ── Coupon ──
	const handleApplyCoupon = async () => {
		if (!couponInput.trim() || !summary?.id) return;
		const result = await applyCoupon({ cartId: summary.id, code: couponInput.trim() });
		if ("error" in result) setCouponMsg("Invalid coupon code.");
		else { setCouponMsg("Coupon applied!"); setCouponInput(""); }
	};
	const handleRemoveCoupon = async () => {
		if (!summary?.id) return;
		await removeCoupon({ cartId: summary.id });
		setCouponMsg("");
	};

	// ── Validation ──
	const validate = (): string | null => {
		if (isScheduleType && selectedSlotIdx === null)
			return "Please select a date and time for your booking.";
		if (needsShipping && !selectedShipping) return "Select a shipping method.";
		if (needsShipping && selectedShipping?.type === "delivery" && isAuthenticated && !selectedAddress)
			return "Select a delivery address.";
		if (needsShipping && selectedShipping?.type === "delivery" && !isAuthenticated &&
			(!guestName || !guestAddress1 || !guestCity || !guestCountry))
			return "Enter your full delivery address (name, address, city, country).";
		if (isSendCloud && !selectedShipment) return "Select a shipment method.";
		if (isExternal && !selectedShipment) return "Select a shipment method.";
		if (selectedShipping?.type === "storage_hub" && !selectedHub)
			return "Select a storage hub pick-up location.";
		if (!selectedPayment) return "Select a payment method.";
		const missing = cartCommissions.find(
			(c: Commission) => !c.commission_data.optional && !cartCommEntries.find((e) => e.id === c.id),
		);
		if (missing) return `Apply required commission: ${missing.title}`;
		if (!isAuthenticated && !guestEmail.includes("@"))
			return "Enter a valid email for guest checkout.";
		return null;
	};

	// ── Place order ──
	const handlePlaceOrder = async () => {
		setError("");
		const validErr = validate();
		if (validErr) { setError(validErr); return; }

		const isDelivery = selectedShipping?.type === "delivery";
		const isStorageHub = selectedShipping?.type === "storage_hub";

		let scheduleId: number | undefined;
		let scheduleStartAt: string | undefined;
		let scheduleEndAt: string | undefined;
		if (isScheduleType && selectedSlotIdx !== null && schedulesPerDay[selectedDateIdx]) {
			const slot = schedulesPerDay[selectedDateIdx].schedules[selectedSlotIdx];
			const day = schedulesPerDay[selectedDateIdx].day;
			scheduleId = (slot as any).id;
			scheduleStartAt = `${day} ${slot.start_time}:00`;
			scheduleEndAt = `${day} ${slot.end_time}:00`;
		}

		const payload: FullCheckoutPayload = {
			...(summary?.id ? { cart: { id: summary.id } } : {}),
			type: checkoutType,
			...(needsShipping && selectedShipping ? { shipping_method_id: selectedShipping.id } : {}),
			...(isAuthenticated && isDelivery && selectedAddress ? { shipping_address_id: selectedAddress.id } : {}),
			...(!isAuthenticated && isDelivery && guestName
				? {
						shipping_address: {
							name: guestName,
							email: guestEmail,
							...(guestPhone ? { phone_number: guestPhone } : {}),
							address_line_1: guestAddress1,
							...(guestAddress2 ? { address_line_2: guestAddress2 } : {}),
							city: guestCity,
							...(guestState ? { state: guestState } : {}),
							country: guestCountry,
							...(guestPostCode ? { post_code: guestPostCode } : {}),
						},
					}
				: {}),
			...(isStorageHub && selectedHub ? { shipping_address_id: selectedHub.id } : {}),
			...(selectedShipment ? { external_shipping_method_id: selectedShipment.id } : {}),
			...(selectedPayment ? { payment_method_id: selectedPayment.id } : {}),
			...((summary as any)?.coupon?.code ? { coupon_code: (summary as any).coupon.code } : {}),
			...(cartCommEntries.length > 0 ? { cart_commission: cartCommEntries } : {}),
			...(demandCommIds.length > 0 ? { demand_commission: demandCommIds } : {}),
			...(scheduleId !== undefined ? { schedule_id: scheduleId } : {}),
			...(scheduleStartAt ? { schedule_start_at: scheduleStartAt } : {}),
			...(scheduleEndAt ? { schedule_end_at: scheduleEndAt } : {}),
			...(isDonation && isDonateAnon ? { anonymous_donation: true } : {}),
			...(!isAuthenticated ? { guest: true, guest_email: guestEmail } : {}),
			...(!isAuthenticated && guestName ? { guest_name: guestName } : {}),
			...(!isAuthenticated && guestPhone ? { guest_phone: guestPhone } : {}),
		};

		const result = await checkout(payload);

		if ("error" in result) {
			const e = result.error as any;
			if (e?.data?.code === 127)
				setError("Wallet amount not eligible for this payment method. Choose another.");
			else setError(e?.error ?? "Checkout failed. Please try again.");
			return;
		}

		const ref = result.data.order_reference;
		const pm = selectedPayment!;

		dispatch(cartApi.util.invalidateTags(['Cart'] as any));

		if (pm.type === "stripe") {
			const intentResult = await paymentIntent(ref);
			if ("error" in intentResult) {
				setError("Order placed but payment setup failed. Check your orders for status.");
				return;
			}
			navigate("/payment", { state: { client_secret: intentResult.data.client_secret, order_reference: ref } });
			return;
		}

		if (PAYMENT_INTENT_TYPES.includes(pm.type as any)) {
			const url = buildPaymentIntentUrl(ref, pm.id, isAuthenticated ? authKey : "", !isAuthenticated ? guestEmail : undefined);
			window.open(url);
			navigate(`/checkouts/${ref}/thank-you`, { replace: true });
			return;
		}

		if (EXTERNAL_CHECKOUT_TYPES.includes(pm.type as any) || pm.channel === "web") {
			const url = buildExternalCheckoutUrl(ref, isAuthenticated ? authKey : "", !isAuthenticated ? guestEmail : undefined);
			localStorage.setItem("pending_order_reference", ref);
			setIsRedirecting(true);
			setTimeout(() => { window.location.href = url; }, 150);
			return;
		}

		navigate(`/checkouts/${ref}/thank-you`, { replace: true });
	};

	if (isRedirecting)
		return (
			<Layout>
				<div className="text-center py-20">
					<div className="text-5xl mb-5">💳</div>
					<h2 className="font-display text-xl font-bold text-foreground mb-2">Redirecting to payment…</h2>
					<p className="text-sm text-muted-foreground">Please wait while we redirect you to the secure payment page.</p>
				</div>
			</Layout>
		);

	const isPageLoading = cartLoading || shippingLoading || paymentLoading;
	if (isPageLoading)
		return (
			<Layout>
				<div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading checkout…
				</div>
			</Layout>
		);

	const priceRows = (summary as any)?.pricing_items?.filter((p: any) => p.display) ?? [];
	const hasCoupon = !!(summary as any)?.coupon?.code;

	return (
		<Layout>
			<h1 className="font-display text-2xl font-bold text-foreground mb-7">Checkout</h1>

			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7 items-start">
				{/* ── Left column ── */}
				<div className="flex flex-col gap-5">
					{/* 1. Guest contact info */}
					{!isAuthenticated && (
						<SectionBox title="Contact information">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{[
									["Email *", "email", guestEmail, setGuestEmail, "your@email.com", "email"],
									["Name", "text", guestName, setGuestName, "Full name"],
									["Phone", "text", guestPhone, setGuestPhone, "+1 555 000 0000"],
								].map(([label, type, val, setter, ph]) => (
									<div key={label as string} className="flex flex-col gap-1">
										<label className="text-xs text-muted-foreground font-medium">{label as string}</label>
										<input
											className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
											type={type as string}
											value={val as string}
											onChange={(e) => (setter as any)(e.target.value)}
											placeholder={ph as string}
										/>
									</div>
								))}
								{/* Guest delivery address — only shown when shipping type is delivery */}
								{needsShipping && selectedShipping?.type === "delivery" && (
									<>
										{[
											["Address line 1 *", guestAddress1, setGuestAddress1, "Street address"],
											["Address line 2", guestAddress2, setGuestAddress2, "Apt, suite, etc."],
											["City *", guestCity, setGuestCity, "City"],
											["State / Region", guestState, setGuestState, "State or region"],
											["Country *", guestCountry, setGuestCountry, "Country"],
											["Post code", guestPostCode, setGuestPostCode, "Post / ZIP code"],
										].map(([label, val, setter, ph]) => (
											<div key={label as string} className="flex flex-col gap-1">
												<label className="text-xs text-muted-foreground font-medium">{label as string}</label>
												<input
													className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
													value={val as string}
													onChange={(e) => (setter as any)(e.target.value)}
													placeholder={ph as string}
												/>
											</div>
										))}
									</>
								)}
							</div>
						</SectionBox>
					)}

					{/* 2. Schedule — events / appointments */}
					{isScheduleType && schedulesPerDay.length > 0 && (
						<SectionBox title="Select date & time">
							<ScheduleSelector
								dates={dates}
								schedulesPerDay={schedulesPerDay}
								selectedDateIdx={selectedDateIdx}
								onSelectDate={(i) => setSelectedDateIdx(i)}
								selectedSlotIdx={selectedSlotIdx}
								onSelectSlot={(i) => setSelectedSlotIdx(i)}
							/>
							{selectedSlotIdx !== null && schedulesPerDay[selectedDateIdx] && (
								<p className="mt-3 text-xs text-green-600 font-semibold">
									✓ {schedulesPerDay[selectedDateIdx].day}{" "}
									{schedulesPerDay[selectedDateIdx].schedules[selectedSlotIdx].start_time}
									{" – "}
									{schedulesPerDay[selectedDateIdx].schedules[selectedSlotIdx].end_time}
								</p>
							)}
						</SectionBox>
					)}

					{/* 3. Shipping method */}
					{needsShipping && shippingMethods.length > 0 && (
						<SectionBox title="Shipping method">
							<div className="flex flex-col gap-2.5">
								{shippingMethods.map((method: ShippingMethod) => (
									<RadioCard
										key={method.id}
										checked={selectedShipping?.id === method.id}
										onChange={() => { setSelectedShipping(method); setSelectedAddress(null); setSelectedHub(null); }}
										extra={
											method.price ? (
												<span className="text-sm font-semibold text-foreground whitespace-nowrap self-center">
													{method.price.formatted}
												</span>
											) : undefined
										}
									>
										<p className="text-sm font-semibold text-foreground mb-0.5">{method.name}</p>
										{method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
										<p className="text-xs text-muted-foreground">{method.type}</p>
									</RadioCard>
								))}
							</div>
						</SectionBox>
					)}

					{/* 4. Delivery address (authenticated) */}
					{isAuthenticated && selectedShipping?.type === "delivery" && (
						<SectionBox
							title="Delivery address"
							action={
								!showAddForm ? (
									<Button size="sm" variant="outline" className="btn-secondary h-7 text-xs" onClick={() => setShowAddForm(true)}>
										+ Add
									</Button>
								) : undefined
							}
						>
							{showAddForm ? (
								<AddAddressForm
									onSaved={(addr) => { setShowAddForm(false); if (addr) setSelectedAddress(addr); }}
									onCancel={() => setShowAddForm(false)}
								/>
							) : addresses.length === 0 ? (
								<p className="text-xs text-muted-foreground italic">No saved addresses yet.</p>
							) : (
								<div className="flex flex-col gap-2.5">
									{addresses.map((addr: Address) => (
										<RadioCard
											key={addr.id}
											checked={selectedAddress?.id === addr.id}
											onChange={() => setSelectedAddress(addr)}
										>
											<p className="text-sm font-semibold text-foreground mb-0.5">
												{addr.name}
												{(addr as any).default && (
													<span className="ml-2 text-[10px] bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-semibold">Default</span>
												)}
											</p>
											<p className="text-xs text-muted-foreground">
												{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ""}
											</p>
											<p className="text-xs text-muted-foreground">
												{addr.city}, {(addr as any).state} {(addr as any).post_code}, {addr.country}
											</p>
											{addr.phone_number && <p className="text-xs text-muted-foreground">{addr.phone_number}</p>}
										</RadioCard>
									))}
								</div>
							)}
						</SectionBox>
					)}

					{/* 5. Storage hub */}
					{selectedShipping?.type === "storage_hub" && storageHubAddresses.length > 0 && (
						<SectionBox title="Pick-up location">
							<div className="flex flex-col gap-2.5">
								{storageHubAddresses.map((hub: StorageHubAddress) => (
									<RadioCard
										key={hub.id}
										checked={selectedHub?.id === hub.id}
										onChange={() => {
											setSelectedHub(hub);
											const hubMethod = shippingMethods.find((m: ShippingMethod) => m.type === "storage_hub");
											if (hubMethod) setSelectedShipping(hubMethod);
										}}
									>
										<p className="text-sm font-semibold text-foreground mb-0.5">{hub.name}</p>
										{hub.formatted_address && <p className="text-xs text-muted-foreground">{hub.formatted_address}</p>}
									</RadioCard>
								))}
							</div>
						</SectionBox>
					)}

					{/* 6. SendCloud / External sub-shipment */}
					{(isSendCloud || isExternal) && selectedAddress && subMethods.length > 0 && (
						<SectionBox title="Shipment method">
							<div className="flex flex-col gap-2.5">
								{subMethods.map((sm: ShipmentMethod) => (
									<RadioCard
										key={sm.id}
										checked={selectedShipment?.id === sm.id}
										onChange={() => setSelectedShipment(sm)}
										extra={
											sm.price ? (
												<span className="text-sm font-semibold text-foreground whitespace-nowrap self-center">
													{sm.price.formatted}
												</span>
											) : undefined
										}
									>
										<p className="text-sm font-semibold text-foreground mb-0.5">{sm.name}</p>
										{sm.carrier && <p className="text-xs text-muted-foreground">{sm.carrier}</p>}
										{(sm as any).delivery_days && (
											<p className="text-xs text-muted-foreground">Est. {(sm as any).delivery_days} days</p>
										)}
									</RadioCard>
								))}
							</div>
						</SectionBox>
					)}

					{/* 7. Payment method */}
					{paymentMethods.length > 0 && (
						<SectionBox title="Payment method">
							<div className="flex flex-col gap-2.5">
								{paymentMethods.map((pm: PaymentMethod) => (
									<RadioCard
										key={pm.id}
										checked={selectedPayment?.id === pm.id}
										onChange={() => setSelectedPayment(pm)}
									>
										<div className="flex items-center gap-2.5">
											{pm.logo && (
												<img src={pm.logo} alt={pm.name} className="w-9 h-5 object-contain" />
											)}
											<p className="text-sm font-semibold text-foreground">{pm.name}</p>
										</div>
										<p className="text-xs text-muted-foreground mt-0.5">{pm.type}</p>
									</RadioCard>
								))}
							</div>
						</SectionBox>
					)}

					{/* 8. Cart commissions */}
					{cartCommissions.length > 0 && (
						<SectionBox title="Commission">
							<div className="flex flex-col gap-3">
								{cartCommissions.map((c: Commission) => (
									<CartCommissionRow
										key={c.id}
										commission={c}
										applied={cartCommEntries.find((e) => e.id === c.id)}
										onApply={(entry) =>
											setCartCommEntries((prev) => [
												...prev.filter((e) => e.id !== entry.id),
												entry,
											])
										}
									/>
								))}
							</div>
						</SectionBox>
					)}

					{/* 9. Demand commissions (auth only) */}
					{isAuthenticated && demandCommissions.length > 0 && (
						<SectionBox title="Optional add-ons">
							<div className="flex flex-col gap-3">
								{demandCommissions.map((c: Commission) => (
									<DemandCommissionRow
										key={c.id}
										commission={c}
										enabled={demandCommIds.includes(c.id)}
										onToggle={(id) =>
											setDemandCommIds((prev) =>
												prev.includes(id)
													? prev.filter((x) => x !== id)
													: [...prev, id],
											)
										}
									/>
								))}
							</div>
						</SectionBox>
					)}

					{/* 10. Anonymous donation */}
					{isDonation && (
						<SectionBox title="Donation options">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									className="accent-coffee-accent w-4 h-4"
									checked={isDonateAnon}
									onChange={(e) => setIsDonateAnon(e.target.checked)}
								/>
								<span className="text-sm text-foreground">Donate anonymously</span>
							</label>
						</SectionBox>
					)}

					{/* 11. Coupon */}
					<SectionBox title="Coupon code">
						{hasCoupon ? (
							<div className="flex items-center gap-3">
								<span className="text-xs text-green-600 font-semibold">✓ {(summary as any).coupon.code} applied</span>
								<Button
									size="sm"
									variant="outline"
									className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
									onClick={handleRemoveCoupon}
									disabled={isRemovingCoupon}
								>
									{isRemovingCoupon ? "…" : "Remove"}
								</Button>
							</div>
						) : (
							<div className="flex gap-2">
								<input
									className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
									value={couponInput}
									onChange={(e) => setCouponInput(e.target.value)}
									placeholder="Enter coupon code"
									onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
								/>
								<Button
									size="sm"
									className="btn-hero whitespace-nowrap"
									onClick={handleApplyCoupon}
									disabled={isApplyingCoupon || !couponInput}
								>
									{isApplyingCoupon ? "…" : "Apply"}
								</Button>
							</div>
						)}
						{couponMsg && (
							<p className={`text-xs mt-1.5 ${hasCoupon ? "text-green-600" : "text-destructive"}`}>{couponMsg}</p>
						)}
					</SectionBox>

					{/* 12. Cart items review */}
					<SectionBox title={`Order items (${items.length})`}>
						<div className="flex flex-col gap-4">
							{items.map((item: any) => (
								<div key={item.id} className="flex gap-3 items-start">
									<div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-coffee-secondary/20">
										{item.listing?.images?.[0]
											? <img src={item.listing.images[0]} alt={item.listing.title} className="w-full h-full object-cover" />
											: <div className="w-full h-full bg-muted" />
										}
									</div>
									<div className="flex-1">
										<p className="text-[11px] text-muted-foreground">{item.listing?.account?.name}</p>
										<p className="text-xs font-semibold text-foreground">{item.listing?.title}</p>
										{item.variant && <p className="text-[11px] text-muted-foreground">{item.variant.name}</p>}
										<p className="text-xs text-muted-foreground mt-0.5">
											{item.listing?.offer_price?.formatted} × {item.quantity}
											{" = "}
											<strong className="text-foreground">{item.quantity_total_offer_price?.formatted}</strong>
										</p>
									</div>
								</div>
							))}
						</div>
					</SectionBox>
				</div>

				{/* ── Right column — summary ── */}
				<div className="bg-card border border-border rounded-xl p-6 sticky top-24">
					<h2 className="font-display text-base font-bold text-foreground mb-5">Order summary</h2>

					<div className="space-y-2">
						{priceRows.map((row: any, i: number) => (
							<div key={i} className="flex justify-between text-sm">
								<span className="text-muted-foreground">{row.name}</span>
								<span className="text-foreground">{row.buying?.formatted}</span>
							</div>
						))}

						{hasCoupon && (
							<div className="flex justify-between text-sm">
								<span className="text-green-600">Coupon ({(summary as any).coupon.code})</span>
								<span className="text-green-600">−{(summary as any).coupon.discount?.formatted ?? ""}</span>
							</div>
						)}
					</div>

					<Separator className="my-4" />

					<div className="flex justify-between items-center font-bold">
						<span className="text-base">Total</span>
						<span className="font-display text-lg text-coffee-accent">
							{(summary as any)?.grand_total?.formatted ?? "—"}
						</span>
					</div>

					{/* Selection summary */}
					{(selectedShipping || selectedHub || selectedPayment) && <Separator className="my-4" />}

					{selectedShipping && (
						<>
							<div className="flex justify-between text-xs mb-1.5">
								<span className="text-muted-foreground">Shipping</span>
								<span className="text-foreground font-medium">{selectedShipping.name}</span>
							</div>
							{selectedShipment && (
								<div className="flex justify-between text-xs mb-1.5">
									<span className="text-muted-foreground">Method</span>
									<span className="text-foreground font-medium">{selectedShipment.name}</span>
								</div>
							)}
						</>
					)}
					{selectedHub && (
						<div className="flex justify-between text-xs mb-1.5">
							<span className="text-muted-foreground">Pick-up</span>
							<span className="text-foreground font-medium">{selectedHub.name}</span>
						</div>
					)}
					{selectedPayment && (
						<div className="flex justify-between text-xs mb-1.5">
							<span className="text-muted-foreground">Payment</span>
							<span className="text-foreground font-medium">{selectedPayment.name}</span>
						</div>
					)}

					{error && (
						<div className="mt-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2.5 text-xs">
							{error}
						</div>
					)}

					<Button
						className="btn-hero w-full mt-5"
						onClick={handlePlaceOrder}
						disabled={isPlacing || isCreatingIntent}
					>
						{isPlacing ? "Placing order…" : isCreatingIntent ? "Preparing payment…" : "Place order"}
					</Button>
					<Button
						variant="outline"
						className="btn-secondary w-full mt-3"
						onClick={() => navigate("/cart")}
					>
						← Back to cart
					</Button>
				</div>
			</div>
		</Layout>
	);
}
