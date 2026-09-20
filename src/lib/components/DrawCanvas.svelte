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
	}

	let { code, selfId, ratio, initialStrokes, tool, color, strokeWidth }: Props = $props();

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
		Math.max(
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

	function redrawAll() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		for (const stroke of allStrokes) {
			if (stroke.points.length === 0) continue;
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

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		canvasEl.setPointerCapture(e.pointerId);
		updateCursor(e);

		const point = toNormalizedPoint(e.clientX, e.clientY);
		// crypto.randomUUID() only exists in secure contexts (HTTPS/localhost),
		// so it's undefined for a phone opening the dev server over http://<LAN-IP>.
		const strokeId = `${selfId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
		handlePointerUp();
		if (e.pointerType === 'touch') cursor.visible = false;
	}

	function handlePointerLeave() {
		handlePointerUp();
		cursor.visible = false;
	}

	function onRemoteStrokeStart({ stroke }: { stroke: IStroke }) {
		allStrokes = [...allStrokes, stroke];
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
		ctx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
	}

	onMount(() => {
		allStrokes = [...initialStrokes];
		fitPaper();
		resizeObserver = new ResizeObserver(() => fitPaper());
		resizeObserver.observe(containerEl);

		const socket = MultiplayerService.getSocket();
		socket.on('draw:stroke:start', onRemoteStrokeStart);
		socket.on('draw:stroke:points', onRemoteStrokePoints);
		socket.on('draw:cleared', onCleared);

		return () => {
			socket.off('draw:stroke:start', onRemoteStrokeStart);
			socket.off('draw:stroke:points', onRemoteStrokePoints);
			socket.off('draw:cleared', onCleared);
		};
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		if (rafHandle !== null) cancelAnimationFrame(rafHandle);
	});
</script>

<div bind:this={containerEl} class="absolute inset-2 flex touch-none items-center justify-center">
	<div
		class="relative overflow-hidden rounded-xl border border-primary-200 bg-white shadow-md"
		style="width: {paperSize.width}px; height: {paperSize.height}px;"
	>
		<canvas
			bind:this={canvasEl}
			class="block h-full w-full cursor-none select-none"
			style="touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none;"
			oncontextmenu={(e) => e.preventDefault()}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerEnd}
			onpointercancel={handlePointerEnd}
			onpointerleave={handlePointerLeave}
		></canvas>
		{#if cursor.visible}
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
