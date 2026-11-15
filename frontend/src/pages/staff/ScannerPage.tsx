import jsQR from "jsqr";
import {useCallback, useEffect, useRef, useState, type FormEvent} from "react";
import {Link} from "react-router";
import Icon from "../../components/Icon";
import {validateTicket} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {ticketCode} from "../../lib/format";
import type {TicketValidationMethod} from "../../lib/types";
import {useWakeLock} from "../../lib/useWakeLock";

// ---------- Tuning ----------

/** Time between decode attempts. ~8 per second is plenty and keeps phones cool. */
const SCAN_INTERVAL_MS = 120;
/**
 * The code just handled is ignored while it stays in view: it must be out of sight
 * this long before it counts as a new scan (otherwise it would flash "Already used").
 */
const SAME_CODE_COOLDOWN_MS = 2000;
/** A VALID result clears itself so the queue keeps moving; rejections must be acknowledged. */
const VALID_AUTO_DISMISS_MS = 1800;
/** Decode on a downscaled frame: faster, and QR codes don't need full resolution. */
const DECODE_SIZE = 480;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Types ----------

type CameraState =
    | { kind: "starting" }
    | { kind: "ready" }
    | { kind: "error"; message: string };

type OutcomeKind = "valid" | "invalid" | "expired" | "error";

interface Outcome {
    kind: OutcomeKind;
    title: string;
    detail: string;
    /** Short ticket code, when the backend told us which ticket it was. */
    code?: string;
    method: TicketValidationMethod;
    at: Date;
}

// ---------- Feedback (sound + vibration), like handheld scanners ----------

let audio: AudioContext | undefined;

function beep(kind: OutcomeKind) {
    try {
        audio ??= new AudioContext();
        void audio.resume();
        // Valid: two short high tones. Rejected: one long low buzz.
        const tones = kind === "valid" ? [[1320, 0, 0.08], [1760, 0.1, 0.12]] : [[220, 0, 0.45]];
        for (const [freq, start, length] of tones) {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = kind === "valid" ? "sine" : "square";
            osc.frequency.value = freq;
            const t = audio.currentTime + start;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
            osc.connect(gain).connect(audio.destination);
            osc.start(t);
            osc.stop(t + length + 0.02);
        }
    } catch {
        // No audio: the colour flash is still shown.
    }
    navigator.vibrate?.(kind === "valid" ? 60 : [200, 80, 200]);
}

// ---------- Camera helpers ----------

/** Torch (flashlight) isn't in the standard TS types yet. */
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

function cameraErrorMessage(err: unknown): string {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        return "The camera only works on a secure page (https:// or http://localhost).";
    }
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
        return "Camera access was blocked. Allow the camera for this site in your browser settings, then reload.";
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
        return "No camera was found on this device.";
    }
    if (name === "NotReadableError") {
        return "The camera is being used by another app. Close it and try again.";
    }
    return err instanceof Error ? err.message : "The camera couldn't be started.";
}

/** Decodes a QR code from the centre square of an image or video frame. */
function decodeQr(
    source: CanvasImageSource,
    width: number,
    height: number,
    canvas: HTMLCanvasElement,
    cropToCentre: boolean,
): string | undefined {
    // Live camera: only look inside the viewfinder (centre ~75%), like real scanners.
    const side = cropToCentre ? Math.min(width, height) * 0.75 : Math.min(width, height);
    const sx = cropToCentre ? (width - side) / 2 : 0;
    const sy = cropToCentre ? (height - side) / 2 : 0;
    const sw = cropToCentre ? side : width;
    const sh = cropToCentre ? side : height;

    const scale = Math.min(1, DECODE_SIZE / Math.max(sw, sh));
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    if (!ctx) return undefined;
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(data, canvas.width, canvas.height, {inversionAttempts: "attemptBoth"})?.data;
}

// ---------- Page ----------

/**
 * /staff/scan : full-screen entrance scanner for staff.
 * Reads the QR code on an attendee's pass with the device camera and validates it.
 */
export default function ScannerPage() {
    const accessToken = useAccessToken();
    useWakeLock();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
    const streamRef = useRef<MediaStream>(undefined);

    const [camera, setCamera] = useState<CameraState>({kind: "starting"});
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [deviceId, setDeviceId] = useState<string>();
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    const [outcome, setOutcome] = useState<Outcome>();
    const [busy, setBusy] = useState(false);
    const [history, setHistory] = useState<Outcome[]>([]);
    const [manualOpen, setManualOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [manualId, setManualId] = useState("");

    // The scan loop reads these through refs, so it never sees stale values.
    const pausedRef = useRef(false);
    pausedRef.current = busy || !!outcome || manualOpen || historyOpen;
    const lastCodeRef = useRef<{ value: string; at: number }>(undefined);

    const admitted = history.filter((h) => h.kind === "valid").length;
    const rejected = history.length - admitted;

    // ----- Validation -----

    const handleCode = useCallback(
        async (value: string, method: TicketValidationMethod) => {
            const id = value.trim();
            lastCodeRef.current = {value: id, at: Date.now()};
            let result: Omit<Outcome, "method" | "at">;

            if (!UUID_RE.test(id)) {
                result = {
                    kind: "error",
                    title: "Not a Tick&Go ticket",
                    detail:
                        method === "MANUAL"
                            ? "A ticket ID looks like 3f2a9c1b-0000-0000-0000-000000000000."
                            : "This QR code doesn't belong to a Tick&Go ticket.",
                };
            } else {
                setBusy(true);
                try {
                    const response = await validateTicket(accessToken, id, method);
                    const code = ticketCode(response.ticketId);
                    if (response.status === "VALID") {
                        result = {kind: "valid", title: "Admit", detail: "Ticket is valid. Enjoy the event!", code};
                    } else if (response.status === "EXPIRED") {
                        result = {
                            kind: "expired",
                            title: "Expired",
                            detail: "This event is over or was cancelled. Don't admit.",
                            code,
                        };
                    } else {
                        // INVALID: used before or cancelled (the backend doesn't say which).
                        result = {
                            kind: "invalid",
                            title: "Rejected",
                            detail: "This ticket was already used or has been cancelled. Don't admit.",
                            code,
                        };
                    }
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    // The backend answers 404 "Ticket not found" / "QR Code not found".
                    result = /not found/i.test(message)
                        ? {
                            kind: "invalid",
                            title: "Unknown ticket",
                            detail:
                                method === "MANUAL"
                                    ? "No ticket with this ID exists."
                                    : "This QR code isn't active or doesn't exist.",
                        }
                        : {kind: "error", title: "Couldn't check ticket", detail: message};
                } finally {
                    setBusy(false);
                }
            }

            const full: Outcome = {...result, method, at: new Date()};
            beep(full.kind);
            setOutcome(full);
            setHistory((h) => [full, ...h].slice(0, 50));
        },
        [accessToken],
    );

    const dismiss = useCallback(() => {
        // Start the cooldown from now, so the ticket still held up isn't scanned again at once.
        if (lastCodeRef.current) lastCodeRef.current.at = Date.now();
        setOutcome(undefined);
    }, []);

    useEffect(() => {
        if (outcome?.kind !== "valid") return;
        const timer = window.setTimeout(dismiss, VALID_AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [outcome, dismiss]);

    // ----- Camera -----

    useEffect(() => {
        let cancelled = false;
        setCamera({kind: "starting"});
        setTorchAvailable(false);
        setTorchOn(false);

        (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error("no getUserMedia");
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: deviceId
                        ? {deviceId: {exact: deviceId}}
                        : {facingMode: {ideal: "environment"}, width: {ideal: 1280}, height: {ideal: 720}},
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    await video.play().catch(() => {
                    });
                }
                const track = stream.getVideoTracks()[0];
                setTorchAvailable(!!(track?.getCapabilities?.() as TorchCapabilities | undefined)?.torch);
                // Device labels are only filled in after permission was granted.
                const devices = await navigator.mediaDevices.enumerateDevices();
                if (!cancelled) {
                    setCameras(devices.filter((d) => d.kind === "videoinput"));
                    setCamera({kind: "ready"});
                }
            } catch (err) {
                if (!cancelled) setCamera({kind: "error", message: cameraErrorMessage(err)});
            }
        })();

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = undefined;
        };
    }, [deviceId]);

    // Scan loop: decode a frame every SCAN_INTERVAL_MS while not paused.
    useEffect(() => {
        if (camera.kind !== "ready") return;
        let frame = 0;
        let lastRun = 0;
        const tick = (now: number) => {
            frame = requestAnimationFrame(tick);
            const video = videoRef.current;
            if (pausedRef.current || !video || video.readyState < 2 || now - lastRun < SCAN_INTERVAL_MS) return;
            lastRun = now;
            const value = decodeQr(video, video.videoWidth, video.videoHeight, canvasRef.current, true);
            if (!value) return;
            const last = lastCodeRef.current;
            if (last && last.value === value.trim() && Date.now() - last.at < SAME_CODE_COOLDOWN_MS) {
                last.at = Date.now(); // still in view: keep ignoring it
                return;
            }
            void handleCode(value, "QR_SCAN");
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [camera.kind, handleCode]);

    const toggleTorch = async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            await track.applyConstraints({advanced: [{torch: !torchOn} as MediaTrackConstraintSet]});
            setTorchOn(!torchOn);
        } catch {
            setTorchAvailable(false);
        }
    };

    const switchCamera = () => {
        if (cameras.length < 2) return;
        const currentId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
        const index = cameras.findIndex((c) => c.deviceId === currentId);
        setDeviceId(cameras[(index + 1) % cameras.length].deviceId);
    };

    // ----- Fallbacks: image upload and manual entry -----

    const scanImage = async (file: File | undefined) => {
        if (!file) return;
        try {
            const bitmap = await createImageBitmap(file);
            const value = decodeQr(bitmap, bitmap.width, bitmap.height, canvasRef.current, false);
            bitmap.close();
            if (value) {
                void handleCode(value, "QR_SCAN");
                return;
            }
        } catch {
            // Not a readable image: handled below.
        }
        const failed: Outcome = {
            kind: "error",
            title: "No QR code found",
            detail: "Try a sharper picture where the whole code is visible.",
            method: "QR_SCAN",
            at: new Date(),
        };
        beep("error");
        setOutcome(failed);
    };

    const submitManual = (e: FormEvent) => {
        e.preventDefault();
        if (!manualId.trim()) return;
        setManualOpen(false);
        void handleCode(manualId, "MANUAL");
        setManualId("");
    };

    // ----- Render -----

    return (
        <div className="scanner">
            <video ref={videoRef} className="scanner-video" playsInline muted autoPlay/>

            {/* Dimmed surround with a clear viewfinder in the middle */}
            {camera.kind === "ready" && (
                <div className="scanner-mask" aria-hidden="true">
                    <div className={`scanner-frame${busy ? " is-busy" : ""}`}>
                        <span className="corner tl"/>
                        <span className="corner tr"/>
                        <span className="corner bl"/>
                        <span className="corner br"/>
                        {!busy && <span className="scanner-line"/>}
                    </div>
                </div>
            )}

            <header className="scanner-top">
                <Link to="/staff" className="glass-button" aria-label="Close scanner">
                    <Icon name="x" size={20}/>
                </Link>
                <div className="scanner-title">
                    <strong>Scan tickets</strong>
                    <span>
            <span className="scanner-stat ok">✓ {admitted}</span>
            <span className="scanner-stat bad">✕ {rejected}</span>
          </span>
                </div>
                <div className="row scanner-tools">
                    {torchAvailable && (
                        <button
                            type="button"
                            className={`glass-button${torchOn ? " is-on" : ""}`}
                            onClick={toggleTorch}
                            aria-label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
                            aria-pressed={torchOn}
                        >
                            <Icon name="flashlight" size={20}/>
                        </button>
                    )}
                    {cameras.length > 1 && (
                        <button type="button" className="glass-button" onClick={switchCamera}
                                aria-label="Switch camera">
                            <Icon name="switchCamera" size={20}/>
                        </button>
                    )}
                </div>
            </header>

            <div className="scanner-status" role="status">
                {camera.kind === "starting" && <p>Starting camera…</p>}
                {camera.kind === "error" && (
                    <div className="scanner-camera-error">
                        <Icon name="camera" size={28}/>
                        <strong>Camera unavailable</strong>
                        <p>{camera.message}</p>
                        <p>You can still enter a ticket ID or scan a picture of the code below.</p>
                    </div>
                )}
                {camera.kind === "ready" && (
                    <p className="scanner-help">{busy ? "Checking ticket…" : "Point the camera at the ticket's QR code"}</p>
                )}
            </div>

            <footer className="scanner-bottom">
                <button type="button" className="scanner-action" onClick={() => setManualOpen(true)}>
                    <Icon name="keyboard" size={22}/>
                    Enter ID
                </button>
                <label className="scanner-action">
                    <Icon name="image" size={22}/>
                    From photo
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                            void scanImage(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                </label>
                <button type="button" className="scanner-action" onClick={() => setHistoryOpen(true)}>
                    <Icon name="history" size={22}/>
                    Recent ({history.length})
                </button>
            </footer>

            {/* Full-screen result, like the green/red flash of an entrance scanner */}
            {outcome && (
                <div
                    className={`scanner-result result-${outcome.kind}`}
                    role="alertdialog"
                    aria-live="assertive"
                    aria-label={outcome.title}
                    onClick={dismiss}
                >
                    <div className="scanner-result-icon" aria-hidden="true">
                        <Icon name={outcome.kind === "valid" ? "check" : outcome.kind === "error" ? "alert" : "x"}
                              size={64} strokeWidth={2.6}/>
                    </div>
                    <h1>{outcome.title}</h1>
                    <p>{outcome.detail}</p>
                    {outcome.code && <p className="scanner-result-code">Ticket {outcome.code}</p>}
                    <p className="scanner-result-meta">
                        {outcome.method === "MANUAL" ? "Entered manually" : "QR scan"} ·{" "}
                        {outcome.at.toLocaleTimeString(undefined, {timeStyle: "medium"})}
                    </p>
                    <button type="button" className="scanner-result-button" onClick={dismiss}>
                        {outcome.kind === "valid" ? "Next" : "Scan next ticket"}
                    </button>
                    {outcome.kind === "valid" && <div className="scanner-result-timer"/>}
                </div>
            )}

            {/* Manual entry sheet */}
            {manualOpen && (
                <div className="scanner-sheet-backdrop" onClick={() => setManualOpen(false)}>
                    <form className="scanner-sheet" onSubmit={submitManual} onClick={(e) => e.stopPropagation()}>
                        <h2>Enter ticket ID</h2>
                        <p className="muted small">
                            Use this when the code won't scan. The ticket ID is shown at the bottom of the attendee's
                            pass.
                        </p>
                        <input
                            autoFocus
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            placeholder="e.g. 3f2a9c1b-…"
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            className="mono"
                        />
                        <div className="row">
                            <button type="submit" className="btn btn-primary" disabled={!manualId.trim()}>
                                Check ticket
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setManualOpen(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Recent scans sheet */}
            {historyOpen && (
                <div className="scanner-sheet-backdrop" onClick={() => setHistoryOpen(false)}>
                    <div className="scanner-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="row spread">
                            <h2>Recent scans</h2>
                            <button type="button" className="btn btn-secondary btn-sm"
                                    onClick={() => setHistoryOpen(false)}>
                                Close
                            </button>
                        </div>
                        <p className="muted small">
                            {admitted} admitted · {rejected} rejected on this device since the scanner was opened.
                        </p>
                        {history.length === 0 ? (
                            <p className="muted">No tickets scanned yet.</p>
                        ) : (
                            <ul className="scan-history">
                                {history.map((h, i) => (
                                    <li key={i} className={`history-${h.kind}`}>
                                        <span className="history-dot" aria-hidden="true"/>
                                        <div>
                                            <strong>{h.title}</strong>
                                            {h.code && <span className="mono"> · {h.code}</span>}
                                            <div className="muted small">
                                                {h.at.toLocaleTimeString(undefined, {timeStyle: "medium"})} ·{" "}
                                                {h.method === "MANUAL" ? "Manual" : "QR"}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
