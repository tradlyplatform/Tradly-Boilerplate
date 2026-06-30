// ─── Shared primitives ────────────────────────────────────────────────────────

export interface Money {
	amount: number;
	currency: string;
	formatted: string; // e.g. "$ 23.00"
}

// Re-exported from dedicated files to avoid duplicate exports in index.ts
export type { Category, CategoryHierarchy } from './category.types'
import type { Category, CategoryHierarchy } from './category.types'

// ─── Account (seller/store) ───────────────────────────────────────────────────

export interface AccountLocation {
	city?: string;
	state?: string;
	country?: string;
	locality?: string;
	postcode?: string;
	country_code?: string;
	formatted_address?: string;
}

export interface AccountCoordinates {
	latitude: number;
	longitude: number;
}

// Re-exported from checkout.types to avoid duplicate export in index.ts
export type { ShippingMethod } from './checkout.types'
import type { ShippingMethod } from './checkout.types'

export interface AccountRatingData {
	rating_count_data: {
		rating_1: number;
		rating_2: number;
		rating_3: number;
		rating_4: number;
		rating_5: number;
	};
	rating_average: number;
	rating_count: number;
	review_count: number;
}

export interface AccountUser {
	id: string;
	first_name: string;
	last_name: string;
}

export interface ListingAccount {
	id: number;
	name: string;
	slug: string;
	description: string;
	images: string[];
	type: string; // "accounts"
	active: boolean;
	status: number;
	following: boolean; // is current user following this account
	total_followers: number;
	total_listings: number;
	category_id: number[];
	categories: Category[];
	location: AccountLocation;
	coordinates: AccountCoordinates;
	shipping_methods: ShippingMethod[];
	commission_percent: number;
	rating_data: AccountRatingData;
	user: AccountUser; // account owner
	metadata: Record<string, unknown>;
	attributes: ListingAttribute[];
}

// ─── Rating ───────────────────────────────────────────────────────────────────

export interface RatingData {
	rating_count_data: {
		rating_1: number;
		rating_2: number;
		rating_3: number;
		rating_4: number;
		rating_5: number;
	};
	rating_average: number; // e.g. 4.5
	rating_count: number;
	review_count: number;
}

// ─── Attributes ───────────────────────────────────────────────────────────────

// field_type codes:
//  1 = single select (dropdown)
//  2 = multi select (checkboxes)
//  3 = text input
//  6 = rich text / hidden
//  12 = address/location picker
// values shape varies by field_type — use unknown[] and narrow at usage site

export interface ListingAttribute {
	id: number;
	name: string;
	type: string; // "listings" | "accounts"
	field_type: number;
	visible: boolean;
	optional: boolean;
	active: boolean;
	order_by: number;
	show_in_filter: boolean;
	private: boolean;
	icon_path: string;
	tooltip: string;
	attribute_group_id: number;
	metadata: Record<string, unknown>;
	categories: Category[];
	values: unknown[]; // string[] | AttributeValueItem[] | LocationValue[] depending on field_type
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export interface Listing {
	// Identity
	id: number;
	slug: string;
	title: string;
	description: string; // may contain HTML e.g. "<p>asdf</p>"
	sku: string;
	barcode: string;
	gtin: string;
	mpn: string;
	locale: string;
	currency_id: number;

	// Pricing
	list_price: Money; // original price — use for strikethrough display
	offer_price: Money; // discounted price — use as primary display price
	goal_price: Money; // donation / fundraising goal
	offer_percent: number; // discount percentage e.g. 2
	shipping_charges: Money;

	// Inventory
	stock: number;
	max_quantity: number; // max user can add to cart at once
	sold: boolean;
	active: boolean;
	status: number; // 2 = published

	// Media
	images: string[];
	videos: string[];

	// Engagement
	liked: boolean; // ← "liked" not "is_liked"
	unliked: boolean;
	likes: number;
	unlikes: number;
	in_cart: boolean;
	distance: number; // metres from user location (0 if location not passed)

	// Classification
	type: string; // "listings"
	order_type: string; // "listings"
	category_id: number[];
	categories: Category[];
	tags: unknown[];

	// Relationships
	account_id: number;
	account: ListingAccount;
	user: AccountUser; // listing owner (same person as account.user typically)

	// Dates (unix timestamps)
	created_at: number;
	start_at: number;
	end_at: number;

	// Dimensions / shipping
	weight_uom: string;
	size_uom: string;
	volume_uom: string;
	weight_value: number;
	volume_value: number;
	height: number;
	width: number;
	length: number;

	// Feature flags
	seller_protection_fee_enabled: boolean;
	weighted: boolean;
	fulfilled_by_platform: boolean;
	expirable: boolean;

	// SEO
	meta_title: string;
	meta_description: string;
	meta_keyword: string;

	// Extended data
	rating_data: RatingData;
	attributes: ListingAttribute[];
	variants: unknown[]; // variant objects when listing has variants
	schedules: unknown[]; // event schedules
	listing_taxes: unknown[];
	my_review: unknown | null;
	location: Record<string, unknown>; // {} when no location set
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface GetListingsParams {
	page?: number;
	limit?: number;
	category_id?: number;
	type?: string; // "listings" | "events" | "appointments" | "donation" | "digital" | "information_listing" | "video_listing" | "requests"
	account_id?: number;
	search_key?: string;
	lat?: number;
	lon?: number;
	radius?: number;
	price_from?: number;
	price_to?: number;
	sort_by?: string;
	[key: string]: unknown;
}

export interface GetListingDetailInput {
	slug: string;
	id?: boolean | "true" | "false";
}

// Both likeListing and unlikeListing take just { id }
// The SDK flags (isLiked / isUnLiked) are hardcoded in api/listing.ts
export interface LikeListingInput {
	id: number;
}

// ─── Response types (what components receive from RTK Query hooks) ─────────────

export interface GetListingsResponse {
	listings: Listing[];
	page: number;
	total_records: number;
}

export interface GetListingDetailResponse {
	listing: Listing;
}

// ─── SDK raw response (internal — only used in api/listing.ts) ────────────────

export interface TradlyListingError {
	code: number;
	message: string;
}

export interface TradlyListingSdkResponse<T> {
	status?: boolean;
	data?: T;
	error?: TradlyListingError;
}

