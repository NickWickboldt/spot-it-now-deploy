// Simple registry to share a capture callback without putting functions in navigation state
let takePictureRef: (() => void) | null = null;

export function setTakePictureRef(fn: (() => void) | null) {
  takePictureRef = fn;
}

export function getTakePictureRef(): (() => void) | null {
  return takePictureRef;
}

// Lightweight pub/sub for capture state (video mode + recording)
export type CaptureState = { isVideoMode: boolean; isRecording: boolean };

let captureState: CaptureState = { isVideoMode: false, isRecording: false };
const listeners = new Set<(state: CaptureState) => void>();

export function getCaptureState(): CaptureState {
  return captureState;
}

export function setCaptureState(update: Partial<CaptureState>) {
  captureState = { ...captureState, ...update };
  listeners.forEach((l) => l(captureState));
}

export function subscribeCaptureState(listener: (state: CaptureState) => void): () => void {
  listeners.add(listener);
  // Send current state immediately to initialize
  try { listener(captureState); } catch {}
  return () => {
    // Ensure cleanup returns void
    listeners.delete(listener);
  };
}
