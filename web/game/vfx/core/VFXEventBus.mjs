/**
 * Small synchronous event bus for VFX-only events.
 * Listener failures are isolated so a cosmetic effect cannot interrupt combat.
 */
export class VFXEventBus {
  constructor({ onListenerError = null } = {}) {
    this.listeners = new Map();
    this.onListenerError = typeof onListenerError === "function" ? onListenerError : null;
    this.destroyed = false;
    this.lastErrors = [];
  }

  on(eventName, listener) {
    if (this.destroyed) return () => {};
    if (typeof eventName !== "string" || !eventName.trim()) {
      throw new TypeError("VFX event name must be a non-empty string");
    }
    if (typeof listener !== "function") {
      throw new TypeError("VFX event listener must be a function");
    }

    let listeners = this.listeners.get(eventName);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(eventName, listeners);
    }
    listeners.add(listener);

    return () => this.off(eventName, listener);
  }

  once(eventName, listener) {
    if (typeof listener !== "function") {
      throw new TypeError("VFX event listener must be a function");
    }
    let unsubscribe = null;
    const wrapped = (payload) => {
      unsubscribe?.();
      listener(payload);
    };
    unsubscribe = this.on(eventName, wrapped);
    return unsubscribe;
  }

  off(eventName, listener) {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return false;
    const removed = listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(eventName);
    return removed;
  }

  emit(eventName, payload) {
    if (this.destroyed) return 0;
    const listeners = [...(this.listeners.get(eventName) || [])];
    this.lastErrors = [];

    for (const listener of listeners) {
      try {
        listener(payload);
      } catch (error) {
        this.lastErrors.push({ eventName, error });
        this.onListenerError?.(error, eventName);
      }
    }
    return listeners.length;
  }

  listenerCount(eventName) {
    if (eventName) return this.listeners.get(eventName)?.size ?? 0;
    let total = 0;
    for (const listeners of this.listeners.values()) total += listeners.size;
    return total;
  }

  clear(eventName) {
    if (eventName) return this.listeners.delete(eventName);
    this.listeners.clear();
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.clear();
    this.destroyed = true;
    this.onListenerError = null;
  }
}

export default VFXEventBus;
