import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetListingDetailQuery } from "@/state/listing/api";
import {
	useLikeListingMutation,
	useUnlikeListingMutation,
} from "@/state/listing/api";
import { useAddToCartMutation, useClearCartMutation } from "@/state/cart/api";
import { useAuthSelector } from "@/state/auth/selectors";
import Layout from "../components/Layout";
import type { AddToCartInput } from "@/types/cart.types";

export default function ListingDetailPage() {
	const { slug = "" } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const isAuthenticated = useAuthSelector((s) => s.isAuthenticated);

	const { data, isLoading, isError } = useGetListingDetailQuery({ slug });
	const [likeListing, { isLoading: isLiking }] = useLikeListingMutation();
	const [unlikeListing, { isLoading: isUnliking }] =
		useUnlikeListingMutation();
	const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
	const [clearCart] = useClearCartMutation();

	const [selectedQty, setSelectedQty] = useState(1);
	const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
	const [donationAmount, setDonationAmount] = useState(0);
	const [toast, setToast] = useState("");
	const [clearModal, setClearModal] = useState(false);
	const [pendingInput, setPendingInput] = useState<AddToCartInput | null>(
		null,
	);

	const showToast = (msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(""), 3000);
	};

	if (isLoading)
		return (
			<Layout>
				<div style={s.center}>Loading…</div>
			</Layout>
		);
	if (isError || !data)
		return (
			<Layout>
				<div style={s.error}>Listing not found.</div>
			</Layout>
		);

	const { listing } = data;
	const orderType = listing.order_type;
	const hasVariants = (listing.variants as unknown[]).length > 0;

	const handleLikeToggle = async () => {
		if (!isAuthenticated) {
			navigate("/sign-in");
			return;
		}
		if (isLiking || isUnliking) return; // prevent double-tap while in flight

		if (listing.liked) {
			const result = await unlikeListing({ id: listing.id });
			if ("error" in result)
				showToast("Could not unlike — please try again");
		} else {
			const result = await likeListing({ id: listing.id });
			if ("error" in result)
				showToast("Could not like — please try again");
		}
	};

	const doAddToCart = async (input: AddToCartInput): Promise<boolean> => {
		const result = await addToCart(input);
		if ("error" in result) {
			const e = result.error as {
				status: string;
				error: string;
				data?: { code: number };
			};
			if (e.data?.code === 480) {
				setPendingInput(input);
				setClearModal(true);
				return false;
			}
			if (e.data?.code === 489) {
				await clearCart();
				const r2 = await addToCart(input);
				if ("error" in r2) { showToast((r2.error as { error: string }).error); return false; }
				showToast("Added to cart");
				return true;
			}
			showToast(e.error);
			return false;
		}
		showToast("Added to cart");
		return true;
	};

	const handleAddToCart = async (): Promise<boolean> => {
		if (listing.stock === 0 || listing.sold) {
			showToast("Item not available");
			return false;
		}
		return doAddToCart({
			listing_id: listing.id,
			quantity: selectedQty,
			...(selectedVariantId ? { variant_id: selectedVariantId } : {}),
		});
	};

	const handleBookNow = async () => {
		if (!isAuthenticated) {
			navigate("/sign-in");
			return;
		}
		const clearResult = await clearCart();
		if ("error" in clearResult) {
			showToast("Failed to prepare booking");
			return;
		}
		const result = await addToCart({
			listing_id: listing.id,
			quantity: 1,
		});
		if ("error" in result) {
			showToast((result.error as { error: string }).error);
			return;
		}
		navigate("/cart");
	};

	const handleFundNow = async () => {
		if (donationAmount <= 0) {
			showToast("Enter a valid amount");
			return;
		}
		await clearCart();
		const result = await addToCart({
			listing_id: listing.id,
			quantity: 1,
			custom_price: donationAmount,
		});
		if ("error" in result) {
			showToast((result.error as { error: string }).error);
			return;
		}
		navigate("/cart");
	};

	const handleConfirmClear = async () => {
		setClearModal(false);
		if (!pendingInput) return;
		await clearCart();
		await addToCart(pendingInput);
		setPendingInput(null);
		showToast("Cart updated");
	};

	const mainImage = listing.images[0];
	const raisedPercent =
		listing.goal_price.amount > 0
			? Math.min(((listing as any).raised_amount?.amount ?? 0) / listing.goal_price.amount * 100, 100)
			: 0;

	return (
		<Layout>
			{/* Toast */}
			{toast && <div style={s.toast}>{toast}</div>}

			{/* Clear cart modal */}
			{clearModal && (
				<div style={s.modalOverlay}>
					<div style={s.modal}>
						<p
							style={{
								margin: "0 0 20px",
								fontSize: 15,
								color: "#111",
							}}
						>
							Your cart has items from
							another seller. Clear cart and
							add this item?
						</p>
						<div
							style={{
								display: "flex",
								gap: 12,
								justifyContent:
									"flex-end",
							}}
						>
							<button
								onClick={() =>
									setClearModal(
										false,
									)
								}
								style={s.cancelBtn}
							>
								Cancel
							</button>
							<button
								onClick={
									handleConfirmClear
								}
								style={s.confirmBtn}
							>
								Clear & Add
							</button>
						</div>
					</div>
				</div>
			)}

			<div style={s.layout}>
				{/* Images */}
				<div style={s.imageSection}>
					<div style={s.mainImgWrap}>
						{mainImage ? (
							<img
								src={mainImage}
								alt={listing.title}
								style={s.mainImg}
							/>
						) : (
							<div style={s.imgPlaceholder}>
								No image
							</div>
						)}
					</div>
					{listing.images.length > 1 && (
						<div style={s.thumbRow}>
							{listing.images
								.slice(1, 5)
								.map((img, i) => (
									<img
										key={i}
										src={img}
										alt=""
										style={
											s.thumb
										}
									/>
								))}
						</div>
					)}
				</div>

					{/* Details */}
				<div style={s.infoSection}>
					<p style={s.sellerName}>
						{listing.account?.name ?? "Unknown seller"}
					</p>
					<h1 style={s.title}>{listing.title}</h1>

					{/* Rating */}
					{listing.rating_data.rating_count > 0 && (
						<p style={s.rating}>
							★{" "}
							{listing.rating_data.rating_average.toFixed(
								1,
							)}{" "}
							(
							{
								listing.rating_data
									.rating_count
							}{" "}
							reviews)
						</p>
					)}

					{/* Price */}
					{![
						"information_listing",
						"video_listing",
						"requests",
					].includes(orderType) && (
						<div style={s.priceRow}>
							<span style={s.price}>
								{
									listing
										.offer_price
										.formatted
								}
							</span>
							{listing.offer_percent > 0 && (
								<>
									<span
										style={
											s.listPrice
										}
									>
										{
											listing
												.list_price
												.formatted
										}
									</span>
									<span
										style={
											s.badge
										}
									>
										{
											listing.offer_percent
										}
										% off
									</span>
								</>
							)}
						</div>
					)}

					{/* Stock */}
					{listing.stock === 0 ? (
						<p style={s.outOfStock}>
							Out of stock
						</p>
					) : listing.stock <= 5 ? (
						<p style={s.lowStock}>
							Only {listing.stock} left
						</p>
					) : null}

					{/* Donation goal */}
					{orderType === "donation" &&
						listing.goal_price.amount > 0 && (
							<div
								style={{
									marginBottom: 16,
								}}
							>
								<div
									style={
										s.progressTrack
									}
								>
									<div
										style={{
											...s.progressBar,
											width: `${raisedPercent}%`,
										}}
									/>
								</div>
								<p style={s.goalText}>
									Goal:{" "}
									{
										listing
											.goal_price
											.formatted
									}
								</p>
							</div>
						)}

					{/* Qty selector — listings/digital only */}
					{["listings", "digital"].includes(
						orderType,
					) &&
						listing.stock > 0 && (
							<div style={s.qtyRow}>
								<button
									style={s.qtyBtn}
									onClick={() =>
										setSelectedQty(
											(
												q,
											) =>
												Math.max(
													1,
													q -
														1,
												),
										)
									}
								>
									−
								</button>
								<span style={s.qtyNum}>
									{selectedQty}
								</span>
								<button
									style={s.qtyBtn}
									onClick={() =>
										setSelectedQty(
											(
												q,
											) =>
												Math.min(
													listing.max_quantity ||
														listing.stock,
													q +
														1,
												),
										)
									}
								>
									+
								</button>
							</div>
						)}

					{/* Donation amount input */}
					{orderType === "donation" && (
						<div style={{ marginBottom: 16 }}>
							<label style={s.label}>
								Your contribution (
								{
									listing
										.offer_price
										.currency
								}
								)
							</label>
							<input
								style={s.input}
								type="number"
								min={1}
								value={
									donationAmount ||
									""
								}
								onChange={(e) =>
									setDonationAmount(
										Number(
											e
												.target
												.value,
										),
									)
								}
								placeholder="Enter amount"
							/>
						</div>
					)}

					{/* CTAs */}
					<div style={s.ctaRow}>
						{orderType === "listings" && (
							<>
								<button
									style={{
										...s.primaryBtn,
										opacity:
											isAdding ||
											listing.stock ===
												0
												? 0.6
												: 1,
									}}
									disabled={
										isAdding ||
										listing.stock ===
											0
									}
									onClick={
										handleAddToCart
									}
								>
									{listing.in_cart
										? "Add more"
										: "Add to cart"}
								</button>
								<button
									style={{
										...s.secondaryBtn,
									}}
									onClick={async () => {
										const ok = await handleAddToCart();
										if (ok) navigate("/cart");
									}}
								>
									Buy now
								</button>
							</>
						)}
						{orderType === "digital" && (
							<button
								style={s.primaryBtn}
								disabled={isAdding}
								onClick={async () => {
									const ok = await handleAddToCart();
									if (ok) navigate("/cart");
								}}
							>
								Buy now
							</button>
						)}
						{(orderType === "events" ||
							orderType ===
								"appointments") && (
							<button
								style={s.primaryBtn}
								onClick={handleBookNow}
							>
								{orderType === "events"
									? "Book now"
									: "Book appointment"}
							</button>
						)}
						{orderType === "donation" && (
							<button
								style={s.primaryBtn}
								onClick={handleFundNow}
							>
								Fund now
							</button>
						)}
						{orderType ===
							"information_listing" && (
							<button
								style={s.primaryBtn}
								onClick={() =>
									navigate(
										`/contact?listing=${listing.id}`,
									)
								}
							>
								Enquire
							</button>
						)}
						{orderType === "video_listing" && (
							<button
								style={s.primaryBtn}
								onClick={() =>
									navigate(
										`/watch/${listing.slug}`,
									)
								}
							>
								Watch
							</button>
						)}
						{orderType === "requests" && (
							<button
								style={s.primaryBtn}
								onClick={() => {
									if (
										!isAuthenticated
									)
										navigate(
											"/sign-in",
										);
									else
										navigate(
											"/requests/new",
										);
								}}
							>
								Submit request
							</button>
						)}
					</div>

					{/* Like button */}
					<button
						onClick={handleLikeToggle}
						disabled={isLiking || isUnliking}
						style={{
							...s.likeBtn,
							opacity:
								isLiking || isUnliking
									? 0.5
									: 1,
							cursor:
								isLiking || isUnliking
									? "default"
									: "pointer",
						}}
					>
						{listing.liked ? "♥ Liked" : "♡ Like"}{" "}
						{listing.likes > 0 &&
							`(${listing.likes})`}
					</button>

					{/* Description */}
					{listing.description && (
						<div style={{ marginTop: 24 }}>
							<h3 style={s.sectionTitle}>
								About this listing
							</h3>
							<div
								style={s.description}
								dangerouslySetInnerHTML={{
									__html: listing.description,
								}}
							/>
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}

const s: Record<string, React.CSSProperties> = {
	center: {
		textAlign: "center",
		padding: 80,
		color: "#888",
		fontSize: 15,
	},
	error: {
		textAlign: "center",
		padding: 80,
		color: "#b91c1c",
		fontSize: 14,
	},
	toast: {
		position: "fixed",
		bottom: 24,
		left: "50%",
		transform: "translateX(-50%)",
		background: "#111",
		color: "#fff",
		padding: "10px 24px",
		borderRadius: 24,
		fontSize: 14,
		zIndex: 1000,
	},
	modalOverlay: {
		position: "fixed",
		inset: 0,
		background: "rgba(0,0,0,0.4)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 999,
	},
	modal: {
		background: "#fff",
		borderRadius: 12,
		padding: 28,
		maxWidth: 380,
		width: "90%",
	},
	cancelBtn: {
		padding: "8px 20px",
		borderRadius: 8,
		border: "1px solid #ddd",
		background: "#fff",
		cursor: "pointer",
		fontSize: 14,
	},
	confirmBtn: {
		padding: "8px 20px",
		borderRadius: 8,
		border: "none",
		background: "#2563eb",
		color: "#fff",
		cursor: "pointer",
		fontSize: 14,
		fontWeight: 600,
	},
	layout: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: 40,
		alignItems: "start",
	},
	imageSection: {},
	mainImgWrap: {
		width: "100%",
		aspectRatio: "1",
		background: "#f0f0f0",
		borderRadius: 12,
		overflow: "hidden",
	},
	mainImg: { width: "100%", height: "100%", objectFit: "cover" },
	imgPlaceholder: {
		width: "100%",
		height: "100%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: "#bbb",
	},
	thumbRow: { display: "flex", gap: 8, marginTop: 8 },
	thumb: {
		width: 72,
		height: 72,
		objectFit: "cover",
		borderRadius: 8,
		border: "2px solid #e5e5e5",
		cursor: "pointer",
	},
	infoSection: { display: "flex", flexDirection: "column" },
	sellerName: { margin: "0 0 4px", fontSize: 13, color: "#888" },
	title: {
		margin: "0 0 8px",
		fontSize: 24,
		fontWeight: 700,
		color: "#111",
		lineHeight: 1.3,
	},
	rating: { margin: "0 0 16px", fontSize: 13, color: "#f59e0b" },
	priceRow: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		marginBottom: 12,
	},
	price: { fontSize: 24, fontWeight: 700, color: "#111" },
	listPrice: {
		fontSize: 16,
		color: "#aaa",
		textDecoration: "line-through",
	},
	badge: {
		fontSize: 12,
		background: "#fef2f2",
		color: "#ef4444",
		borderRadius: 4,
		padding: "2px 8px",
		fontWeight: 700,
	},
	outOfStock: {
		margin: "0 0 12px",
		fontSize: 13,
		color: "#ef4444",
		fontWeight: 600,
	},
	lowStock: {
		margin: "0 0 12px",
		fontSize: 13,
		color: "#f59e0b",
		fontWeight: 600,
	},
	progressTrack: {
		height: 6,
		background: "#e5e5e5",
		borderRadius: 3,
		marginBottom: 6,
	},
	progressBar: {
		height: "100%",
		background: "#2563eb",
		borderRadius: 3,
		transition: "width 0.3s",
	},
	goalText: { margin: 0, fontSize: 12, color: "#888" },
	qtyRow: {
		display: "flex",
		alignItems: "center",
		gap: 16,
		marginBottom: 20,
	},
	qtyBtn: {
		width: 36,
		height: 36,
		borderRadius: 8,
		border: "1px solid #ddd",
		background: "#fff",
		fontSize: 18,
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	qtyNum: {
		fontSize: 16,
		fontWeight: 600,
		minWidth: 24,
		textAlign: "center",
	},
	label: {
		fontSize: 13,
		fontWeight: 600,
		color: "#444",
		marginBottom: 6,
		display: "block",
	},
	input: {
		width: "100%",
		padding: "10px 12px",
		borderRadius: 8,
		border: "1px solid #ddd",
		fontSize: 14,
		outline: "none",
		boxSizing: "border-box",
		marginBottom: 16,
	},
	ctaRow: { display: "flex", gap: 12, marginBottom: 12 },
	primaryBtn: {
		flex: 1,
		padding: "13px",
		background: "#2563eb",
		color: "#fff",
		border: "none",
		borderRadius: 8,
		fontSize: 15,
		fontWeight: 600,
		cursor: "pointer",
	},
	secondaryBtn: {
		flex: 1,
		padding: "13px",
		background: "#fff",
		color: "#2563eb",
		border: "2px solid #2563eb",
		borderRadius: 8,
		fontSize: 15,
		fontWeight: 600,
		cursor: "pointer",
	},
	likeBtn: {
		background: "none",
		border: "1px solid #e5e5e5",
		borderRadius: 8,
		padding: "8px 16px",
		cursor: "pointer",
		fontSize: 14,
		color: "#555",
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 700,
		color: "#111",
		marginBottom: 8,
	},
	description: { fontSize: 14, color: "#555", lineHeight: 1.7 },
};
