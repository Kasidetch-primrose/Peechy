/**
 * Copies text to the clipboard. navigator.clipboard only exists in secure
 * contexts (HTTPS/localhost), so a phone opening the dev server over
 * http://<LAN-IP> needs the execCommand fallback. Resolves to whether the
 * copy actually happened.
 */
export async function copyText(text: string): Promise<boolean> {
	if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// fall through to the legacy path
		}
	}

	const area = document.createElement('textarea');
	area.value = text;
	area.setAttribute('readonly', '');
	// Pages that disable text selection would otherwise make this un-selectable.
	area.style.cssText =
		'position:fixed;top:0;left:0;opacity:0;pointer-events:none;user-select:text;-webkit-user-select:text;font-size:16px;';
	document.body.appendChild(area);
	try {
		area.focus({ preventScroll: true });
		area.select();
		area.setSelectionRange(0, text.length); // iOS ignores select() alone
		return document.execCommand('copy');
	} catch {
		return false;
	} finally {
		area.remove();
	}
}
