import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	useGetListingDetailQuery,
	useLikeListingMutation,
	useUnlikeListingMutation,
} from "@/state/listing/api";
import { useAddToCartMutation, useClearCartMutation } from "@/state/cart/api";
import { useAuthSelector } from "@/state/auth/selectors";
import Layout from "../components/Layout";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Separator } from "@/src/components/ui/separator";
import { Heart, ShoppingCart, Minus, Plus, Star } from "lucide-react";
import type { AddToCartInput } from "@/types/cart.types";

// @sky:token-only — this page is data/logic-bound (branches on orderType, listing.*, handlers).
// Personalization re-skins it via design tokens only; it has no @sky:design zone. DO NOT rewrite structurally.

function Toast({ msg }: { msg: string }) {
	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-medium shadow-xl z-50">
			{msg}
		</div>
	);
}

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
	const [selectedVariantId] = useState<number | null>(null);
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

	if (isLoading) {
		return (
			<Layout>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
					<Skeleton className="aspect-square w-full rounded-xl" />
					<div className="space-y-4">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-1/2" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</Layout>
		);
	}
	if (isError || !data)
		return (
			<Layout>
				<div className="text-center py-20 text-destructive text-sm">
					Listing not found.
				</div>
			</Layout>
		);

	const { listing } = data;
	const orderType = listing.order_type;

	const handleLikeToggle = async () => {
		if (!isAuthenticated) {
			navigate("/sign-in");
			return;
		}
		if (isLiking || isUnliking) return;
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
				const cr = await clearCart();
				// 471 = cart already empty — treat as success, proceed to add
				if (
					"error" in cr &&
					(cr.error as any)?.code !== 471
				) {
					showToast(
						(cr.error as { error: string }).error,
					);
					return false;
				}
				const r2 = await addToCart(input);
				if ("error" in r2) {
					showToast(
						(r2.error as { error: string }).error,
					);
					return false;
				}
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
		if (!isAuthenticated) {
			navigate("/sign-in");
			return false;
		}
		if (listing.stock === 0 || listing.sold) {
			showToast("Item not available");
			return false;
		}
		return doAddToCart({
			listing_id: listing.id,
			quantity: selectedQty,
			...(selectedVariantId
				? { variant_id: selectedVariantId }
				: {}),
		});
	};

	const handleBookNow = async () => {
		if (!isAuthenticated) {
			navigate("/sign-in");
			return;
		}
		const clearResult = await clearCart();
		// 471 = cart already empty — still proceed
		if (
			"error" in clearResult &&
			(clearResult.error as any)?.code !== 471
		) {
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
		if (!isAuthenticated) {
			navigate("/sign-in");
			return;
		}
		if (donationAmount <= 0) {
			showToast("Enter a valid amount");
			return;
		}
		const cr = await clearCart();
		// 471 = cart already empty — still proceed
		if ("error" in cr && (cr.error as any)?.code !== 471) {
			showToast((cr.error as { error: string }).error);
			return;
		}
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
		const cr = await clearCart();
		// 471 = cart already empty — still proceed to add
		if ("error" in cr && (cr.error as any)?.code !== 471) {
			showToast("Failed to clear cart");
			return;
		}
		const r2 = await addToCart(pendingInput);
		if ("error" in r2) {
			showToast((r2.error as { error: string }).error);
			return;
		}
		setPendingInput(null);
		showToast("Cart updated");
	};

	const mainImage = listing.images[0];
	const raisedPercent =
		listing.goal_price.amount > 0
			? Math.min(
					(((listing as any).raised_amount?.amount ??
						0) /
						listing.goal_price.amount) *
						100,
					100,
				)
			: 0;

	return (
		<Layout>
			{toast && <Toast msg={toast} />}

			{/* Clear cart modal */}
			{clearModal && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
					<div className="bg-card rounded-2xl p-7 max-w-sm w-full shadow-2xl">
						<p className="text-sm text-foreground mb-5 leading-relaxed">
							Your cart has items from
							another seller. Clear cart and
							add this item?
						</p>
						<div className="flex gap-3 justify-end">
							<Button
								variant="outline"
								className="btn-secondary"
								onClick={() =>
									setClearModal(
										false,
									)
								}
							>
								Cancel
							</Button>
							<Button
								className="btn-hero"
								onClick={
									handleConfirmClear
								}
							>
								Clear & Add
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
				{/* Images */}
				<div>
					<div className="aspect-square overflow-hidden rounded-2xl bg-coffee-secondary/20 mb-3">
						{mainImage ? (
							<img
								src={mainImage}
								alt={listing.title}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
								No image
							</div>
						)}
					</div>
					{listing.images.length > 1 && (
						<div className="flex gap-2 flex-wrap">
							{listing.images
								.slice(1, 5)
								.map((img, i) => (
									<div
										key={i}
										className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border"
									>
										<img
											src={
												img
											}
											alt=""
											className="w-full h-full object-cover"
										/>
									</div>
								))}
						</div>
					)}
				</div>

				{/* Details */}
				<div className="flex flex-col gap-4">
					<div>
						<p className="text-xs text-muted-foreground mb-1">
							{listing.account?.name ??
								"Unknown seller"}
						</p>
						<h1 className="font-display text-2xl font-bold text-foreground leading-snug mb-2">
							{listing.title}
						</h1>

						{listing.rating_data.rating_count >
							0 && (
							<div className="flex items-center gap-1 text-yellow-500 text-sm mb-3">
								<Star className="h-3.5 w-3.5 fill-current" />
								<span className="font-semibold">
									{listing.rating_data.rating_average.toFixed(
										1,
									)}
								</span>
								<span className="text-muted-foreground text-xs">
									(
									{
										listing
											.rating_data
											.rating_count
									}{" "}
									reviews)
								</span>
							</div>
						)}
					</div>

					{/* Price */}
					{![
						"information_listing",
						"video_listing",
						"requests",
					].includes(orderType) && (
						<div className="flex items-center gap-3">
							<span className="font-display text-2xl font-bold text-coffee-accent">
								{
									listing
										.offer_price
										.formatted
								}
							</span>
							{listing.offer_percent > 0 && (
								<>
									<span className="text-muted-foreground text-base line-through">
										{
											listing
												.list_price
												.formatted
										}
									</span>
									<Badge className="bg-destructive text-destructive-foreground text-xs">
										{
											listing.offer_percent
										}
										% off
									</Badge>
								</>
							)}
						</div>
					)}

					{/* Stock */}
					{listing.stock === 0 ? (
						<p className="text-sm text-destructive font-semibold">
							Out of stock
						</p>
					) : listing.stock <= 5 ? (
						<p className="text-sm text-yellow-600 font-semibold">
							Only {listing.stock} left
						</p>
					) : null}

					{/* Donation progress */}
					{orderType === "donation" &&
						listing.goal_price.amount > 0 && (
							<div>
								<div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
									<div
										className="h-full bg-coffee-accent rounded-full transition-all"
										style={{
											width: `${raisedPercent}%`,
										}}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Goal:{" "}
									{
										listing
											.goal_price
											.formatted
									}
								</p>
							</div>
						)}

					<Separator />

					{/* Qty selector */}
					{["listings", "digital"].includes(
						orderType,
					) &&
						listing.stock > 0 && (
							<div className="flex items-center gap-4">
								<span className="text-sm text-muted-foreground">
									Quantity
								</span>
								<div className="flex items-center gap-3 border border-border rounded-lg p-1">
									<button
										className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
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
										<Minus className="h-4 w-4" />
									</button>
									<span className="text-sm font-semibold w-6 text-center">
										{
											selectedQty
										}
									</span>
									<button
										className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
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
										<Plus className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}

					{/* Donation input */}
					{orderType === "donation" && (
						<div>
							<label className="text-sm font-medium text-foreground block mb-1.5">
								Your contribution (
								{
									listing
										.offer_price
										.currency
								}
								)
							</label>
							<input
								className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
					<div className="flex gap-3 flex-wrap">
						{orderType === "listings" && (
							<>
								<Button
									className="btn-hero flex-1"
									disabled={
										isAdding ||
										listing.stock ===
											0
									}
									onClick={
										handleAddToCart
									}
								>
									<ShoppingCart className="h-4 w-4 mr-1.5" />
									{listing.in_cart
										? "Add more"
										: "Add to cart"}
								</Button>
								<Button
									variant="outline"
									className="btn-secondary flex-1"
									onClick={async () => {
										const ok =
											await handleAddToCart();
										if (ok)
											navigate(
												"/cart",
											);
									}}
								>
									Buy now
								</Button>
							</>
						)}
						{orderType === "digital" && (
							<Button
								className="btn-hero flex-1"
								disabled={isAdding}
								onClick={async () => {
									const ok =
										await handleAddToCart();
									if (ok)
										navigate(
											"/cart",
										);
								}}
							>
								Buy now
							</Button>
						)}
						{(orderType === "events" ||
							orderType ===
								"appointments") && (
							<Button
								className="btn-hero flex-1"
								onClick={handleBookNow}
							>
								{orderType === "events"
									? "Book now"
									: "Book appointment"}
							</Button>
						)}
						{orderType === "donation" && (
							<Button
								className="btn-hero flex-1"
								onClick={handleFundNow}
							>
								Fund now
							</Button>
						)}
						{orderType ===
							"information_listing" && (
							<Button
								className="btn-hero flex-1"
								onClick={() =>
									navigate(
										`/contact?listing=${listing.id}`,
									)
								}
							>
								Enquire
							</Button>
						)}
						{orderType === "video_listing" && (
							<Button
								className="btn-hero flex-1"
								onClick={() =>
									navigate(
										`/watch/${listing.slug}`,
									)
								}
							>
								Watch
							</Button>
						)}
						{orderType === "requests" && (
							<Button
								className="btn-hero flex-1"
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
							</Button>
						)}
					</div>

					{/* Like */}
					<Button
						variant="outline"
						size="sm"
						className="self-start btn-secondary gap-2"
						onClick={handleLikeToggle}
						disabled={isLiking || isUnliking}
					>
						<Heart
							className={`h-4 w-4 ${listing.liked ? "fill-current text-destructive" : ""}`}
						/>
						{listing.liked ? "Liked" : "Like"}
						{listing.likes > 0 && (
							<span className="text-muted-foreground">
								({listing.likes})
							</span>
						)}
					</Button>

					{/* Description */}
					{listing.description && (
						<>
							<Separator />
							<div>
								<h3 className="font-display text-base font-bold text-foreground mb-3">
									About this
									listing
								</h3>
								<div
									className="text-sm text-muted-foreground leading-relaxed"
									dangerouslySetInnerHTML={{
										__html: listing.description,
									}}
								/>
							</div>
						</>
					)}
				</div>
			</div>
		</Layout>
	);
}

