import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useGetListingsQuery } from "@/state/listing/api";
import { useGetCartQuery } from "@/state/cart/api";
import Layout from "../components/Layout";
import type { Listing } from "@/types/listing.types";

function ListingCard({ listing }: { listing: Listing }) {
	const image = listing.images[0];
	const isInCart = listing.in_cart;
	const sellerName = listing.account?.name ?? "Unknown seller";

	return (
		<Link
			to={`/listing/${listing.slug}`}
			style={cardStyles.link}
		>
			<div style={cardStyles.card}>
				{/* Image */}
				<div style={cardStyles.imgWrap}>
					{image ? (
						<img
							src={image}
							alt={listing.title}
							style={cardStyles.img}
						/>
					) : (
						<div
							style={
								cardStyles.imgPlaceholder
							}
						>
							No image
						</div>
					)}
					{listing.offer_percent > 0 && (
						<span style={cardStyles.badge}>
							{listing.offer_percent}% off
						</span>
					)}
					{listing.liked && (
						<span style={cardStyles.likedDot}>
							♥
						</span>
					)}
				</div>

				{/* Info */}
				<div style={cardStyles.body}>
					<p style={cardStyles.seller}>
						{listing.account?.name}
					</p>
					<p style={cardStyles.title}>
						{listing.title}
					</p>
					<div style={cardStyles.priceRow}>
						<span style={cardStyles.price}>
							{
								listing.offer_price
									?.formatted
							}
						</span>
						{listing.offer_percent > 0 && (
							<span
								style={
									cardStyles.listPrice
								}
							>
								{
									listing
										.list_price
										?.formatted
								}
							</span>
						)}
					</div>
					{isInCart && (
						<span style={cardStyles.inCartTag}>
							In cart
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}

export default function HomePage() {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const { data, isLoading, isFetching, isError } = useGetListingsQuery({
		page,
		limit: 20,
		...(search ? { search_key: search } : {}),
	});

	// Prefetch cart so header count is populated
	useGetCartQuery();

	const listings = data?.listings ?? [];
	const totalRecords = data?.total_records ?? 0;
	const totalPages = Math.ceil(totalRecords / 20);

	return (
		<Layout>
			{/* Search */}
			<div
				style={{
					marginBottom: 28,
					display: "flex",
					gap: 10,
				}}
			>
				<input
					style={pageStyles.searchInput}
					placeholder="Search listings…"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
				/>
			</div>

			{/* States */}
			{isLoading && (
				<div style={pageStyles.center}>
					Loading listings…
				</div>
			)}
			{isError && (
				<div style={pageStyles.error}>
					Failed to load listings.
				</div>
			)}

			{/* Grid */}
			{!isLoading && listings.length === 0 && (
				<div style={pageStyles.center}>
					No listings found.
				</div>
			)}

			<div style={pageStyles.grid}>
				{listings.map((listing) => (
					<ListingCard
						key={listing.id}
						listing={listing}
					/>
				))}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div style={pageStyles.pagination}>
					<button
						style={pageStyles.pageBtn}
						disabled={page <= 1 || isFetching}
						onClick={() => setPage((p) => p - 1)}
					>
						← Prev
					</button>
					<span
						style={{
							fontSize: 14,
							color: "#555",
						}}
					>
						Page {page} of {totalPages}
					</span>
					<button
						style={pageStyles.pageBtn}
						disabled={
							page >= totalPages ||
							isFetching
						}
						onClick={() => setPage((p) => p + 1)}
					>
						Next →
					</button>
				</div>
			)}
		</Layout>
	);
}

const cardStyles: Record<string, React.CSSProperties> = {
	link: { textDecoration: "none", color: "inherit" },
	card: {
		background: "#fff",
		borderRadius: 10,
		overflow: "hidden",
		boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
		transition: "transform 0.15s",
		cursor: "pointer",
	},
	imgWrap: { position: "relative", height: 180, background: "#f0f0f0" },
	img: { width: "100%", height: "100%", objectFit: "cover" },
	imgPlaceholder: {
		width: "100%",
		height: "100%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: "#bbb",
		fontSize: 13,
	},
	badge: {
		position: "absolute",
		top: 8,
		left: 8,
		background: "#ef4444",
		color: "#fff",
		fontSize: 11,
		fontWeight: 700,
		borderRadius: 4,
		padding: "2px 6px",
	},
	likedDot: {
		position: "absolute",
		top: 8,
		right: 8,
		color: "#ef4444",
		fontSize: 16,
	},
	body: { padding: "12px 14px" },
	seller: { margin: 0, fontSize: 11, color: "#888", marginBottom: 2 },
	title: {
		margin: "0 0 8px",
		fontSize: 14,
		fontWeight: 600,
		color: "#111",
		lineHeight: 1.3,
		display: "-webkit-box",
		WebkitLineClamp: 2,
		WebkitBoxOrient: "vertical",
		overflow: "hidden",
	},
	priceRow: { display: "flex", alignItems: "center", gap: 8 },
	price: { fontSize: 15, fontWeight: 700, color: "#111" },
	listPrice: {
		fontSize: 12,
		color: "#aaa",
		textDecoration: "line-through",
	},
	inCartTag: {
		display: "inline-block",
		marginTop: 6,
		fontSize: 11,
		color: "#15803d",
		background: "#f0fdf4",
		borderRadius: 4,
		padding: "2px 6px",
	},
};

const pageStyles: Record<string, React.CSSProperties> = {
	searchInput: {
		flex: 1,
		padding: "10px 14px",
		borderRadius: 8,
		border: "1px solid #ddd",
		fontSize: 14,
		outline: "none",
		maxWidth: 400,
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
		gap: 20,
	},
	center: {
		textAlign: "center",
		padding: 60,
		color: "#888",
		fontSize: 15,
	},
	error: {
		textAlign: "center",
		padding: 40,
		color: "#b91c1c",
		fontSize: 14,
	},
	pagination: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: 20,
		marginTop: 40,
	},
	pageBtn: {
		padding: "8px 20px",
		borderRadius: 8,
		border: "1px solid #ddd",
		background: "#fff",
		cursor: "pointer",
		fontSize: 14,
		color: "#333",
	},
};

