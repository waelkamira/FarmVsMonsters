/**
 * Small keyed object pool for cosmetic VFX resources.
 * The pool owns only idle objects; callers remain responsible for active ones.
 */
export class VFXObjectPool {
  constructor({ maxPerKey = 12, maxTotal = 48, onError = null } = {}) {
    for (const [name, value] of Object.entries({ maxPerKey, maxTotal })) {
      if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`VFXObjectPool ${name} must be a non-negative integer`);
      }
    }
    this.maxPerKey = maxPerKey;
    this.maxTotal = maxTotal;
    this.onError = typeof onError === "function" ? onError : null;
    this.buckets = new Map();
    this.idleCount = 0;
    this.destroyed = false;
  }

  acquire(key, factory, reset = null) {
    if (this.destroyed) return null;
    if (typeof key !== "string" || !key) throw new TypeError("VFXObjectPool key must be a non-empty string");
    if (typeof factory !== "function") throw new TypeError("VFXObjectPool factory must be a function");

    const bucket = this.buckets.get(key);
    const item = bucket?.pop();
    if (item !== undefined) {
      this.idleCount -= 1;
      try {
        reset?.(item);
        return item;
      } catch (error) {
        this.#report(error, "reset");
        this.#destroyItem(item);
      }
    }

    try {
      return factory();
    } catch (error) {
      this.#report(error, "factory");
      return null;
    }
  }

  release(key, item, { reset = null, destroy = null } = {}) {
    if (item == null) return false;
    const destroyItem = () => this.#destroyItem(item, destroy);
    if (this.destroyed || typeof key !== "string" || !key) {
      destroyItem();
      return false;
    }

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    if (bucket.length >= this.maxPerKey || this.idleCount >= this.maxTotal) {
      destroyItem();
      return false;
    }

    try {
      reset?.(item);
    } catch (error) {
      this.#report(error, "release-reset");
      destroyItem();
      return false;
    }

    bucket.push(item);
    this.idleCount += 1;
    return true;
  }

  clear({ destroy = null } = {}) {
    for (const bucket of this.buckets.values()) {
      for (const item of bucket) this.#destroyItem(item, destroy);
    }
    this.buckets.clear();
    this.idleCount = 0;
  }

  getStats() {
    return Object.freeze({
      keys: this.buckets.size,
      idle: this.idleCount,
      maxPerKey: this.maxPerKey,
      maxTotal: this.maxTotal,
      destroyed: this.destroyed
    });
  }

  destroy({ destroy = null } = {}) {
    if (this.destroyed) return;
    this.clear({ destroy });
    this.destroyed = true;
    this.onError = null;
  }

  #destroyItem(item, destroy = null) {
    try {
      if (typeof destroy === "function") destroy(item);
      else item?.destroy?.();
    } catch (error) {
      this.#report(error, "destroy");
    }
  }

  #report(error, phase) {
    try {
      this.onError?.(error, { phase });
    } catch {
      // Pool error reporting must never interrupt cosmetic cleanup.
    }
  }
}

export default VFXObjectPool;
