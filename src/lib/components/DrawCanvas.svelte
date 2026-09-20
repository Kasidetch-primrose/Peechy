<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import MultiplayerService from '$lib/data/services/multiplayer';
	import DrawingService from '$lib/data/services/multiplayer/drawing';
	import {
		DRAW_RATIO_VALUE,
		type DrawRatio,
		type DrawTool,
		type IPoint,
		type IStroke
	} from '$lib/data/interface/drawing';

	interface Props {
		code: string;
		selfId: string;
		ratio: DrawRatio;
		initialStrokes: IStroke[];
		tool: DrawTool;
		color: string;
		strokeWidth: number;
		// True while this player has at least one stroke that undo could remove.
		canUndo?: boolean;
		// Changes when the parent has replaced initialStrokes (reconnect re-sync).
		syncVersion?: number;
	}

	let {
		code,
		selfId,
		ratio,
		initialStrokes,
		tool,
		color,
		strokeWidth,
		canUndo = $bindable(false),
		syncVersion = 0
	}: Props = $props();

	// The eraser is easier to use with a wider tip than the pen at the same slider value.
	const ERASER_WIDTH_FACTOR = 2.5;

	// Pen width is stored in "paper units": 1000 units == the paper's full
	// width, so a stroke keeps the same proportion on every screen.
	const PAPER_WIDTH_UNITS = 1000;

	let canvasEl: HTMLCanvasElement;
	let containerEl: HTMLDivElement;
	let ctx: CanvasRenderingContext2D;

	// Fitted size of the paper (largest box with the room's ratio that fits
	// inside the available area). Purely local — never synced.
	let paperSize = $state({ width: 0, height: 0 });

	// Brush-size ring that follows the pointer (local only, never synced).
	// Its diameter is the exact on-screen width of the stroke being made.
	let cursor = $state({ x: 0, y: 0, visible: false });
	const brushDiameter = $derived(
		tool === 'bucket'
			? 14
			: Math.max(
					4,
					((paperSize.width - 2) * (tool === 'eraser' ? strokeWidth * ERASER_WIDTH_FACTOR : strokeWidth)) /
						PAPER_WIDTH_UNITS
				)
	);

	function updateCursor(e: PointerEvent) {
		const rect = canvasEl.getBoundingClientRect();
		cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true };
	}

	// Full stroke history, kept locally so the canvas can be fully redrawn
	// after a resize (the socket only ever sends incremental updates).
	// Seeded once from the initialStrokes snapshot in onMount below —
	// intentionally not reactive to later prop changes.
	let allStrokes: IStroke[] = [];

	function syncCanUndo() {
		canUndo = allStrokes.some((s) => s.playerId === selfId);
	}

	// Stroke points are stored/transmitted as fractions (0..1) of the paper,
	// NOT raw pixels — different players' screens (and this same window
	// across a resize) have different canvas sizes. Pixel coordinates only
	// exist transiently, right before a canvas draw call.
	function toPixelPoint(point: IPoint): IPoint {
		const rect = canvasEl.getBoundingClientRect();
		return { x: point.x * rect.width, y: point.y * rect.height };
	}

	function toPixelWidth(units: number): number {
		return (units * canvasEl.getBoundingClientRect().width) / PAPER_WIDTH_UNITS;
	}

	function clamp01(n: number): number {
		return Math.min(1, Math.max(0, n));
	}

	function toNormalizedPoint(clientX: number, clientY: number): IPoint {
		const rect = canvasEl.getBoundingClientRect();
		return {
			x: rect.width > 0 ? clamp01((clientX - rect.left) / rect.width) : 0,
			y: rect.height > 0 ? clamp01((clientY - rect.top) / rect.height) : 0
		};
	}

	// Last rendered (pixel-space) point per in-flight stroke id, so new
	// points can be drawn as short line segments instead of redrawing
	// everything.
	const lastPoint = new Map<string, IPoint>();

	let activeStrokeId: string | null = null;
	let activeStroke: IStroke | null = null;
	let pendingPoints: IPoint[] = [];
	let rafHandle: number | null = null;
	let resizeObserver: ResizeObserver | null = null;

	// The canvas itself is transparent (the white paper is CSS behind it), so
	// destination-out erases back to plain paper.
	function drawDot(point: IPoint, stroke: Pick<IStroke, 'color' | 'width' | 'erase'>) {
		ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
		ctx.beginPath();
		ctx.fillStyle = stroke.color;
		ctx.arc(point.x, point.y, toPixelWidth(stroke.width) / 2, 0, Math.PI * 2);
		ctx.fill();
	}

	function drawSegment(from: IPoint, to: IPoint, stroke: Pick<IStroke, 'color' | 'width' | 'erase'>) {
		ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
		ctx.beginPath();
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = toPixelWidth(stroke.width);
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
	}

	// Max per-channel difference (0-255) from the clicked pixel that still
	// counts as "the same area". Loose enough to swallow anti-aliased edges.
	const FILL_TOLERANCE = 80;

	function hexToRgb(hex: string): [number, number, number] {
		const value = parseInt(hex.replace('#', '').slice(0, 6), 16);
		return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
	}

	// Scanline flood fill. Pixels are compared as if composited over the white
	// paper, so transparent canvas, erased areas and white ink all count as
	// "paper" — the way they look on screen.
	function applyFill(pixel: IPoint, fillColor: string) {
		const width = canvasEl.width;
		const height = canvasEl.height;
		const scale = width / canvasEl.getBoundingClientRect().width;
		const startX = Math.floor(pixel.x * scale);
		const startY = Math.floor(pixel.y * scale);
		if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

		const image = ctx.getImageData(0, 0, width, height);
		const data = image.data;
		const [fillR, fillG, fillB] = hexToRgb(fillColor);

		const over = (i: number, channel: number) => {
			const alpha = data[i + 3] / 255;
			return data[i + channel] * alpha + 255 * (1 - alpha);
		};
		const seed = (startY * width + startX) * 4;
		const seedR = over(seed, 0);
		const seedG = over(seed, 1);
		const seedB = over(seed, 2);
		if (
			Math.abs(seedR - fillR) < 8 &&
			Math.abs(seedG - fillG) < 8 &&
			Math.abs(seedB - fillB) < 8
		) {
			return;
		}

		const visited = new Uint8Array(width * height);
		const canFill = (x: number, y: number) => {
			const index = y * width + x;
			if (visited[index]) return false;
			const i = index * 4;
			return (
				Math.abs(over(i, 0) - seedR) <= FILL_TOLERANCE &&
				Math.abs(over(i, 1) - seedG) <= FILL_TOLERANCE &&
				Math.abs(over(i, 2) - seedB) <= FILL_TOLERANCE
			);
		};

		const stack: number[] = [startX, startY];
		while (stack.length > 0) {
			const y = stack.pop()!;
			let x = stack.pop()!;
			while (x >= 0 && canFill(x, y)) x--;
			x++;
			let spanUp = false;
			let spanDown = false;
			while (x < width && canFill(x, y)) {
				const index = y * width + x;
				visited[index] = 1;
				const i = index * 4;
				data[i] = fillR;
				data[i + 1] = fillG;
				data[i + 2] = fillB;
				data[i + 3] = 255;

				if (y > 0) {
					const open = canFill(x, y - 1);
					if (open && !spanUp) {
						stack.push(x, y - 1);
						spanUp = true;
					} else if (!open) {
						spanUp = false;
					}
				}
				if (y < height - 1) {
					const open = canFill(x, y + 1);
					if (open && !spanDown) {
						stack.push(x, y + 1);
						spanDown = true;
					} else if (!open) {
						spanDown = false;
					}
				}
				x++;
			}
		}
		ctx.putImageData(image, 0, 0);
	}

	function redrawAll() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		for (const stroke of allStrokes) {
			if (stroke.points.length === 0) continue;
			if (stroke.fill) {
				applyFill(toPixelPoint(stroke.points[0]), stroke.color);
				continue;
			}
			if (stroke.points.length === 1) {
				drawDot(toPixelPoint(stroke.points[0]), stroke);
				continue;
			}
			for (let i = 1; i < stroke.points.length; i++) {
				drawSegment(toPixelPoint(stroke.points[i - 1]), toPixelPoint(stroke.points[i]), stroke);
			}
		}
	}

	function fitPaper() {
		if (!containerEl) return;
		const rect = containerEl.getBoundingClientRect();
		const target = DRAW_RATIO_VALUE[ratio];
		let width = rect.width;
		let height = width / target;
		if (height > rect.height) {
			height = rect.height;
			width = height * target;
		}
		paperSize = { width: Math.floor(width), height: Math.floor(height) };
	}

	function resizeCanvas() {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = rect.width * dpr;
		canvasEl.height = rect.height * dpr;
		ctx = canvasEl.getContext('2d')!;
		ctx.scale(dpr, dpr);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		redrawAll();
	}

	// paperSize drives the paper element's CSS size; once Svelte has applied
	// it, re-measure and redraw at the new resolution.
	$effect(() => {
		void paperSize.width;
		void paperSize.height;
		queueMicrotask(resizeCanvas);
	});

	// Reconnect re-sync: throw away local history and reload the server's.
	let seenSyncVersion = 0;
	$effect(() => {
		const version = syncVersion;
		if (version === seenSyncVersion) return;
		seenSyncVersion = version;
		allStrokes = [...initialStrokes];
		lastPoint.clear();
		activeStrokeId = null;
		activeStroke = null;
		pendingPoints = [];
		syncCanUndo();
		redrawAll();
	});

	// PNG of the current drawing on the white paper. The canvas itself is
	// transparent (the white is CSS behind it), so composite onto white first —
	// otherwise the saved image would show erased areas and empty paper as
	// black/transparent depending on the viewer.
	export function exportPng(): Promise<Blob | null> {
		if (!canvasEl || canvasEl.width === 0 || canvasEl.height === 0) return Promise.resolve(null);
		const out = document.createElement('canvas');
		out.width = canvasEl.width;
		out.height = canvasEl.height;
		const outCtx = out.getContext('2d');
		if (!outCtx) return Promise.resolve(null);
		outCtx.fillStyle = '#ffffff';
		outCtx.fillRect(0, 0, out.width, out.height);
		outCtx.drawImage(canvasEl, 0, 0);
		return new Promise((resolve) => out.toBlob((blob) => resolve(blob), 'image/png'));
	}

	function flushPending() {
		rafHandle = null;
		if (!activeStrokeId || pendingPoints.length === 0) return;
		const points = pendingPoints;
		pendingPoints = [];
		DrawingService.strokePoints(code, activeStrokeId, points);
	}

	function schedulePendingFlush() {
		if (rafHandle !== null) return;
		rafHandle = requestAnimationFrame(flushPending);
	}

	// Two-finger gestures belong to the browser (pinch-zoom / pan, allowed by
	// touch-action: pinch-zoom on the canvas). Track fingers so a second touch
	// never draws and cancels whatever the first finger had just started.
	const touchPointers = new Set<number>();
	let pendingFill: { pointerId: number; point: IPoint } | null = null;

	// crypto.randomUUID() only exists in secure contexts (HTTPS/localhost),
	// so it's undefined for a phone opening the dev server over http://<LAN-IP>.
	function newStrokeId(): string {
		return `${selfId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	}

	// A second finger landed (or the browser cancelled the pointer): throw away
	// the in-progress stroke. The server's undo drops this player's latest
	// stroke, which is exactly that one, and tells everyone else to drop it too.
	function abortForMultiTouch() {
		pendingFill = null;
		cursor.visible = false;
		if (!activeStrokeId) return;
		lastPoint.delete(activeStrokeId);
		activeStrokeId = null;
		activeStroke = null;
		pendingPoints = [];
		DrawingService.undo(code);
	}

	function commitFill(point: IPoint) {
		const strokeId = newStrokeId();
		const fillStroke: IStroke = {
			id: strokeId,
			playerId: selfId,
			color,
			width: 0,
			fill: true,
			points: [point]
		};
		allStrokes = [...allStrokes, fillStroke];
		syncCanUndo();
		applyFill(toPixelPoint(point), color);
		DrawingService.strokeStart(code, fillStroke);
		DrawingService.strokeEnd(code, strokeId);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;

		if (e.pointerType === 'touch') {
			// The first finger of a gesture is "primary"; use it to drop any stale ids.
			if (e.isPrimary) touchPointers.clear();
			touchPointers.add(e.pointerId);
			if (touchPointers.size > 1) {
				abortForMultiTouch();
				return;
			}
		}
		updateCursor(e);

		const point = toNormalizedPoint(e.clientX, e.clientY);
		canvasEl.setPointerCapture(e.pointerId);

		// Bucket fills on release, so a pinch that starts with the bucket
		// tool never leaves a fill behind.
		if (tool === 'bucket') {
			pendingFill = { pointerId: e.pointerId, point };
			return;
		}

		const strokeId = newStrokeId();
		const erasing = tool === 'eraser';
		const stroke: IStroke = {
			id: strokeId,
			playerId: selfId,
			color: erasing ? '#000000' : color,
			width: erasing ? strokeWidth * ERASER_WIDTH_FACTOR : strokeWidth,
			...(erasing ? { erase: true } : {}),
			points: [point]
		};

		activeStrokeId = strokeId;
		activeStroke = stroke;
		allStrokes = [...allStrokes, stroke];
		syncCanUndo();
		const pixelPoint = toPixelPoint(point);
		lastPoint.set(strokeId, pixelPoint);
		drawDot(pixelPoint, stroke);

		DrawingService.strokeStart(code, stroke);
	}

	function handlePointerMove(e: PointerEvent) {
		updateCursor(e);
		if (!activeStrokeId || !activeStroke) return;
		const point = toNormalizedPoint(e.clientX, e.clientY);
		const pixelPoint = toPixelPoint(point);
		const from = lastPoint.get(activeStrokeId);
		if (from) drawSegment(from, pixelPoint, activeStroke);
		lastPoint.set(activeStrokeId, pixelPoint);

		activeStroke.points.push(point);

		pendingPoints.push(point);
		schedulePendingFlush();
	}

	function handlePointerUp() {
		if (!activeStrokeId) return;
		flushPending();
		DrawingService.strokeEnd(code, activeStrokeId);
		lastPoint.delete(activeStrokeId);
		activeStrokeId = null;
		activeStroke = null;
	}

	// A finger has no hover state, so its ring only shows while touching.
	function handlePointerEnd(e: PointerEvent) {
		if (e.pointerType === 'touch') touchPointers.delete(e.pointerId);

		// The browser cancels the pointer when it takes the touch over (pinch
		// zoom, system gesture): treat whatever was in progress as abandoned.
		if (e.type === 'pointercancel') {
			abortForMultiTouch();
			return;
		}

		if (pendingFill?.pointerId === e.pointerId) {
			commitFill(pendingFill.point);
			pendingFill = null;
		}

		handlePointerUp();
		if (e.pointerType === 'touch') cursor.visible = false;
	}

	function handlePointerLeave(e: PointerEvent) {
		if (e.pointerType === 'touch') touchPointers.delete(e.pointerId);
		handlePointerUp();
		cursor.visible = false;
	}

	function onRemoteStrokeStart({ stroke }: { stroke: IStroke }) {
		allStrokes = [...allStrokes, stroke];
		if (stroke.fill) {
			applyFill(toPixelPoint(stroke.points[0]), stroke.color);
			return;
		}
		const lastNormalized = stroke.points[stroke.points.length - 1];
		const pixelPoint = toPixelPoint(lastNormalized);
		lastPoint.set(stroke.id, pixelPoint);
		if (stroke.points.length === 1) drawDot(pixelPoint, stroke);
	}

	function onRemoteStrokePoints({ strokeId, points }: { strokeId: string; points: IPoint[] }) {
		const stroke = allStrokes.find((s) => s.id === strokeId);
		if (!stroke) return;
		let from = lastPoint.get(strokeId);
		for (const point of points) {
			const pixelPoint = toPixelPoint(point);
			if (from) drawSegment(from, pixelPoint, stroke);
			stroke.points.push(point);
			from = pixelPoint;
		}
		if (from) lastPoint.set(strokeId, from);
	}

	function onCleared() {
		allStrokes = [];
		lastPoint.clear();
		activeStrokeId = null;
		activeStroke = null;
		pendingPoints = [];
		syncCanUndo();
		ctx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
	}

	// Someone's undo removed one of their strokes. Ink can't be un-drawn on
	// a raster canvas, so replay what's left (fills are recomputed in order).
	function onUndone({ strokeId }: { strokeId: string }) {
		if (!allStrokes.some((s) => s.id === strokeId)) return;
		allStrokes = allStrokes.filter((s) => s.id !== strokeId);
		lastPoint.delete(strokeId);
		if (activeStrokeId === strokeId) {
			activeStrokeId = null;
			activeStroke = null;
			pendingPoints = [];
		}
		syncCanUndo();
		redrawAll();
	}

	onMount(() => {
		allStrokes = [...initialStrokes];
		syncCanUndo();
		fitPaper();
		resizeObserver = new ResizeObserver(() => fitPaper());
		resizeObserver.observe(containerEl);

		const socket = MultiplayerService.getSocket();
		socket.on('draw:stroke:start', onRemoteStrokeStart);
		socket.on('draw:stroke:points', onRemoteStrokePoints);
		socket.on('draw:cleared', onCleared);
		socket.on('draw:undone', onUndone);

		return () => {
			socket.off('draw:stroke:start', onRemoteStrokeStart);
			socket.off('draw:stroke:points', onRemoteStrokePoints);
			socket.off('draw:cleared', onCleared);
			socket.off('draw:undone', onUndone);
		};
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		if (rafHandle !== null) cancelAnimationFrame(rafHandle);
	});
</script>

<div bind:this={containerEl} class="absolute inset-2 flex items-center justify-center">
	<div
		class="relative overflow-hidden rounded-xl border border-primary-200 bg-white shadow-md"
		style="width: {paperSize.width}px; height: {paperSize.height}px;"
	>
		<canvas
			bind:this={canvasEl}
			class="block h-full w-full cursor-none select-none"
			style="touch-action: pinch-zoom; -webkit-touch-callout: none; -webkit-user-select: none;"
			oncontextmenu={(e) => e.preventDefault()}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerEnd}
			onpointercancel={handlePointerEnd}
			onpointerleave={handlePointerLeave}
		></canvas>
		{#if cursor.visible && tool === 'bucket'}
			<!-- Tilted bucket pouring the chosen colour; the drip at its lower-left is the fill point (3, 25). -->
			<svg
				class="pointer-events-none absolute overflow-visible"
				style="left: {cursor.x - 3}px; top: {cursor.y - 25}px; width: 28px; height: 28px;"
				viewBox="0 0 28 28"
				aria-hidden="true"
			>
				<g transform="rotate(-35 14 14)" stroke="#1f2937" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
					<path d="M9 9 Q14 2 19 9" fill="none" />
					<path d="M7 10 L21 10 L19 23 Q14 25 9 23 Z" fill="white" />
					<ellipse cx="14" cy="10" rx="7" ry="2.2" fill={color} />
				</g>
				<path d="M3 15 Q1 20 3 22.5 Q5 20 3 15 Z" fill={color} stroke="#1f2937" stroke-width="1.2" stroke-linejoin="round" />
				<circle cx="3" cy="25" r="2" fill={color} stroke="white" stroke-width="1" />
			</svg>
		{:else if cursor.visible}
			<div
				class="pointer-events-none absolute rounded-full"
				style="left: {cursor.x - brushDiameter / 2}px; top: {cursor.y - brushDiameter / 2}px; width: {brushDiameter}px; height: {brushDiameter}px; border: 1.5px {tool ===
				'eraser'
					? 'dashed'
					: 'solid'} rgba(31, 41, 55, 0.75); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9); background-color: {tool ===
				'eraser'
					? 'rgba(255, 255, 255, 0.5)'
					: `${color}55`};"
			></div>
		{/if}
	</div>
</div>
