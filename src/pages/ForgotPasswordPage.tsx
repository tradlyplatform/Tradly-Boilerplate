import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForgotPasswordMutation } from "@/state/auth/api";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { ShoppingBag } from "lucide-react";

export default function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

	const [email, setEmail] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		const result = await forgotPassword({ email });
		if ("error" in result) {
			setError(
				(result.error as { error: string }).error ??
					"Request failed",
			);
			return;
		}

		sessionStorage.setItem("reset_verify_id", result.data.verify_id);
		navigate("/reset-password");
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="w-full max-w-sm">
				<div className="text-center mb-8">
					<Link
						to="/"
						className="inline-flex items-center gap-2 justify-center"
					>
						<ShoppingBag className="h-8 w-8 text-coffee-accent" />
						<span className="font-display text-2xl font-bold text-foreground">
							Tradly
						</span>
					</Link>
				</div>

				<div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
					<h1 className="font-display text-2xl font-bold text-foreground mb-1">
						Forgot password
					</h1>
					<p className="text-sm text-muted-foreground mb-6">
						We'll send a reset code to your email.
					</p>

					{error && (
						<div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-5">
							{error}
						</div>
					)}

					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<div className="space-y-1.5">
							<Label htmlFor="email">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) =>
									setEmail(
										e.target
											.value,
									)
								}
								placeholder="you@example.com"
								required
							/>
						</div>

						<Button
							type="submit"
							disabled={isLoading}
							className="btn-hero w-full"
						>
							{isLoading
								? "Sending…"
								: "Send reset code"}
						</Button>
					</form>

					<p className="mt-6 text-center">
						<Link
							to="/sign-in"
							className="text-sm text-coffee-accent hover:underline"
						>
							← Back to sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

