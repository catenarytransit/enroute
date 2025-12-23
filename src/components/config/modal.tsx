import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ConfigModalProps {
	onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ onClose }) => {
	const [themePreference, setThemePreference] = useState("default");
	const [use24HourTime, setUse24HourTime] = useState(true);
	const [fontPreference, setFontPreference] = useState("barlow");
	const [clickableTrips, setClickableTrips] = useState(false);

	useEffect(() => {
		const getSetting = (key: string) => {
			if (typeof window === "undefined") return null;
			const params = new URLSearchParams(window.location.search);
			return params.get(key) || localStorage.getItem(`enroute_${key}`);
		};

		const urlTheme = getSetting("theme");
		const url24h = getSetting("24h") !== "false";
		const urlClickable = getSetting("clickable_trips") === "true";

		if (urlTheme) setThemePreference(urlTheme);
		setUse24HourTime(url24h);
		setClickableTrips(urlClickable);

		const storedFont = localStorage.getItem("enroute_font");
		if (storedFont) setFontPreference(storedFont);
	}, []);

	const saveConfig = () => {
		const prefix = "enroute_";
		localStorage.setItem(`${prefix}theme`, themePreference);
		localStorage.setItem(`${prefix}24h`, use24HourTime.toString());
		localStorage.setItem(`${prefix}font`, fontPreference);
		localStorage.setItem(`${prefix}clickable_trips`, clickableTrips.toString());

		// Reload to apply
		window.location.reload();
	};

	const goHome = () => {
		const params = new URLSearchParams(window.location.search);
		["mode", "trip", "chateau", "stop"].forEach((p) => params.delete(p));
		window.location.search = params.toString();
	};

	return (
		<div
			className="fixed inset-0 bg-black/70 z-100 flex items-center justify-center p-6"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="config-modal-title"
		>
			<div
				className="w-full max-w-2xl rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl cursor-default"
				style={{ backgroundColor: "var(--catenary-darksky)" }}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex justify-between items-start px-8 pt-8">
					<div className="flex flex-col">
						<h2 id="config-modal-title" className="text-3xl font-bold leading-none text-white">Configuration</h2>
						<div className="flex items-center gap-6 mt-3">
							<span
								className="text-[10px] font-bold opacity-90"
								style={{ color: "var(--catenary-seashore)" }}
							>
								System Preferences
							</span>
							<button
								onClick={goHome}
								className="text-[10px] font-black px-4 py-1.5 rounded-md transition-all active:scale-95 shadow-md border border-blue-400/30"
								style={{
									backgroundColor: "var(--catenary-seashore)",
									color: "var(--catenary-darksky)",
								}}
							>
								Go Home
							</button>
						</div>
					</div>
					<button
						onClick={onClose}
						className="text-white opacity-30 hover:opacity-100 text-4xl font-thin transition-all p-2 hover:rotate-90 leading-none"
					>
						&times;
					</button>
				</div>

				<div className="p-8 space-y-8">
					{/* Theme Selection */}
					<div>
						<label className="block text-xs font-bold mb-2 opacity-80 text-white" htmlFor="themeSelect">Color Theme</label>
						<select
							id="themeSelect"
							value={themePreference}
							onChange={(e) => setThemePreference(e.target.value)}
							className="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
						>
							<option value="default">Default Catenary</option>
							<option value="blue_white">White on Blue (Swiss & German)</option>
							<option value="ns_light">NS Light (Dutch)</option>
							<option value="ns_dark">NS Dark</option>
							<option value="midnight">Midnight (White on Black)</option>
						</select>
					</div>

					{/* Options */}
					<div className="pt-2 space-y-2">
						<label className="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors">
							<input
								type="checkbox"
								checked={use24HourTime}
								onChange={(e) => setUse24HourTime(e.target.checked)}
								className="form-checkbox h-6 w-6 text-blue-500 rounded border-slate-500 bg-slate-900"
							/>
							<div className="text-white">
								<span className="block text-sm font-bold">24-Hour Time</span>
								<span className="block text-[10px] opacity-60">Display hours 00-23 without AM/PM</span>
							</div>
						</label>

						<label className="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors">
							<input
								type="checkbox"
								checked={clickableTrips}
								onChange={(e) => setClickableTrips(e.target.checked)}
								className="form-checkbox h-6 w-6 text-red-500 rounded border-slate-500 bg-slate-900"
							/>
							<div className="text-white">
								<span className="block text-sm font-bold text-red-400">Clickable Trips (Debug)</span>
								<span className="block text-[10px] opacity-60">(For debugging only) Click to open Enroute view</span>
							</div>
						</label>
					</div>

					{/* Font Selection */}
					<div>
						<label className="block text-xs font-bold mb-2 opacity-80 text-white" htmlFor="fontSelect">Font Family</label>
						<select
							id="fontSelect"
							value={fontPreference}
							onChange={(e) => setFontPreference(e.target.value)}
							className="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
						>
							<option value="barlow">Barlow (Default)</option>
							<option value="nimbus">Nimbus Sans (Helvetica-like)</option>
							<option value="noto">Noto Sans</option>
							<option value="fira">Fira Sans</option>
						</select>
					</div>
				</div>

				{/* Save Button */}
				<div className="p-8 border-t border-slate-700/50 bg-black/20">
					<button
						onClick={saveConfig}
						className="w-full py-4 text-xs font-bold rounded-lg transition-all active:scale-[0.98] shadow-lg border-2 border-white/10 hover:border-white/30"
						style={{
							backgroundColor: "var(--catenary-seashore)",
							color: "var(--catenary-darksky)",
						}}
					>
						Save & Apply Settings
					</button>
				</div>

				{/* Footer Info */}
				<div className="bg-slate-900/60 py-3 px-8 border-t border-slate-500 flex justify-between items-center text-[10px] font-bold tracking-widest opacity-60 text-white">
					<span>Catenary Enroute Screen • v2.0</span>
					<span>All changes saved to LocalStorage</span>
				</div>
			</div>
		</div>
	);
};

// Client wrapper (default export) - mount this with client:load in the layout
export default function ConfigModalClient() {
	const [open, setOpen] = useState(false);
	const prevActiveRef = useRef<HTMLElement | null>(null);

	const closeModal = () => setOpen(false);
	const toggleModal = () => setOpen((s) => !s);

	// Helper: ignore key handling when focus is in interactive elements
	function isInteractiveElement(el: EventTarget | null): boolean {
		if (!el || !(el instanceof Element)) return false;
		const tag = el.tagName;
		if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return true;
		if (el.getAttribute("contenteditable") === "true") return true;
		return Boolean(el.closest?.("a, button, input, textarea, select, [contenteditable=\"true\"]"));
	}

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			// Ignore when any modifier is pressed
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			// Don't trigger when typing in inputs
			if (isInteractiveElement(e.target)) return;

			// Toggle with plain 'c' key
			if (e.key === "c" || e.key === "C") {
				e.preventDefault();
				toggleModal();
				return;
			}

			// Close with Escape
			if (e.key === "Escape" && open) {
				closeModal();
			}
		}

		function handleOpenConfigEvent(e: Event) {
			// If the event is a CustomEvent with detail to forceOpen/close we could handle it,
			// but for now just open the modal.
			setOpen(true);
		}

		window.addEventListener("keydown", onKey);
		window.addEventListener("openConfig", handleOpenConfigEvent as EventListener);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("openConfig", handleOpenConfigEvent as EventListener);
		};
	}, [open]);

	// Focus management & simple focus trap when modal is open
	useEffect(() => {
		if (!open) {
			// restore focus
			if (prevActiveRef.current && document.contains(prevActiveRef.current)) {
				prevActiveRef.current.focus();
			}
			return;
		}

		prevActiveRef.current = document.activeElement as HTMLElement | null;

		const dialog = document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement | null;
		if (!dialog) return;

		const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));

		if (focusable.length) {
			focusable[0].focus();
		}

		function handleTab(e: KeyboardEvent) {
			if (e.key !== "Tab") return;
			e.preventDefault();
			if (!focusable.length) return;
			const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
			let nextIndex: number;
			if (e.shiftKey) {
				nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
			} else {
				nextIndex = currentIndex === -1 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
			}
			focusable[nextIndex].focus();
		}

		document.addEventListener("keydown", handleTab);
		return () => document.removeEventListener("keydown", handleTab);
	}, [open]);

	// Server-safe placeholder: Astro will SSR this component; returning `null` on server causes the SSR error.
	// Render a harmless placeholder during SSR and only use portal when `document` is present (client).
	if (typeof document === "undefined") {
		// Render a non-empty placeholder so SSR produces valid HTML. The real modal will mount on the client.
		return <div data-config-modal-placeholder />;
	}

	return open ? createPortal(<ConfigModal onClose={closeModal} />, document.body) : <div data-config-modal-hidden />;
}
