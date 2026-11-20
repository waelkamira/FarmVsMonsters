/**
 * Phaser 3 asset lifecycle manager.
 *
 * Existing scene preload calls remain fully compatible. observeLoader() can
 * track those legacy loads, while loadGroup()/releaseGroup() provide safe,
 * reference-counted loading for assets migrated to the manifest.
 */
export class PhaserAssetManager {
  constructor(scene, options = {}) {
    if (!scene?.load || !scene?.textures) {
      throw new TypeError("PhaserAssetManager requires a Phaser Scene");
    }

    this.scene = scene;
    this.basePath = options.basePath || "/assets/";
    this.manifest = options.manifest || null;
    this.metrics = {
      requested: 0,
      loaded: 0,
      failed: 0,
      progress: 0,
      loadedKeys: [],
      failedKeys: [],
      startedAt: null,
      completedAt: null
    };
    this.groups = new Map();
    this.keyReferences = new Map();
    this.ownedKeys = new Set();
    this.listeners = [];
    this.loadQueue = Promise.resolve();
    this.destroyed = false;
    this.observeLoader();
  }

  observeLoader() {
    const loader = this.scene.load;
    if (this.observing || !loader?.on) return;
    this.observing = true;
    this.metrics.startedAt = Date.now();

    const onProgress = (value) => {
      this.metrics.progress = Math.max(0, Math.min(1, Number(value) || 0));
    };
    const onFileComplete = (key) => {
      this.metrics.loaded += 1;
      if (key && !this.metrics.loadedKeys.includes(key)) this.metrics.loadedKeys.push(key);
    };
    const onLoadError = (file) => {
      this.metrics.failed += 1;
      const key = file?.key || file?.src || "unknown";
      if (!this.metrics.failedKeys.includes(key)) this.metrics.failedKeys.push(key);
    };
    const onComplete = () => {
      this.metrics.progress = 1;
      this.metrics.completedAt = Date.now();
    };

    loader.on("progress", onProgress);
    loader.on("filecomplete", onFileComplete);
    loader.on("loaderror", onLoadError);
    loader.on("complete", onComplete);
    this.listeners.push(
      ["progress", onProgress],
      ["filecomplete", onFileComplete],
      ["loaderror", onLoadError],
      ["complete", onComplete]
    );
  }

  async loadManifest(manifestOrUrl = "/assets/asset-manifest.json") {
    if (manifestOrUrl && typeof manifestOrUrl === "object") {
      this.manifest = manifestOrUrl;
      return this.manifest;
    }
    if (typeof fetch !== "function") throw new Error("Fetch is unavailable; pass a manifest object instead");
    const response = await fetch(manifestOrUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Asset manifest request failed: ${response.status}`);
    this.manifest = await response.json();
    return this.manifest;
  }

  getGroup(groupName) {
    const groups = this.manifest?.groups;
    const entries = groups?.[groupName];
    if (!Array.isArray(entries)) throw new Error(`Unknown asset group: ${groupName}`);
    return entries;
  }

  hasAsset(key, type = "image") {
    if (type === "audio") return this.scene.cache?.audio?.exists?.(key) === true;
    return this.scene.textures.exists(key);
  }

  enqueueLoad(task) {
    const next = this.loadQueue.then(task, task);
    this.loadQueue = next.catch(() => {});
    return next;
  }

  loadGroup(groupName, options = {}) {
    if (this.destroyed) return Promise.reject(new Error("Asset manager has been destroyed"));
    return this.enqueueLoad(async () => {
      const entries = this.getGroup(groupName);
      const alreadyLoaded = this.groups.get(groupName);
      if (alreadyLoaded) {
        alreadyLoaded.references += 1;
        return { group: groupName, loaded: 0, skipped: entries.length };
      }

      const pending = entries.filter((entry) => !this.hasAsset(entry.key, entry.type));
      this.metrics.requested += pending.length;
      const loader = this.scene.load;

      if (pending.length > 0) {
        if (loader.isLoading()) {
          await new Promise((resolve) => loader.once("complete", resolve));
        }
        const failuresBefore = this.metrics.failed;
        await new Promise((resolve, reject) => {
          let settled = false;
          const finish = (error) => {
            if (settled) return;
            settled = true;
            loader.off("complete", onComplete);
            loader.off("loaderror", onError);
            error ? reject(error) : resolve();
          };
          const onComplete = () => finish();
          const onError = (file) => {
            // Phaser emits loaderror per file and continues loading the queue.
            if (options.failOnError) finish(new Error(`Failed to load asset: ${file?.key || "unknown"}`));
          };
          loader.once("complete", onComplete);
          loader.on("loaderror", onError);

          try {
            for (const entry of pending) this.queueEntry(loader, entry);
            loader.start();
          } catch (error) {
            finish(error);
          }
        });
        if (options.failOnError && this.metrics.failed > failuresBefore) {
          throw new Error(`One or more assets in group "${groupName}" failed to load`);
        }
      }

      const keys = entries.map((entry) => entry.key);
      for (const key of keys) {
        this.keyReferences.set(key, (this.keyReferences.get(key) || 0) + 1);
        if (pending.some((entry) => entry.key === key)) this.ownedKeys.add(key);
      }
      this.groups.set(groupName, { keys, references: 1 });
      if (typeof options.onProgress === "function") options.onProgress(1);
      return { group: groupName, loaded: pending.length, skipped: entries.length - pending.length };
    });
  }

  queueEntry(loader, entry) {
    const url = entry.url?.startsWith("/") ? entry.url : this.basePath + String(entry.url || "");
    switch (entry.type) {
      case "audio":
        loader.audio(entry.key, url);
        break;
      case "spritesheet":
        if (!entry.frameConfig) throw new Error(`Spritesheet "${entry.key}" has no frameConfig`);
        loader.spritesheet(entry.key, url, entry.frameConfig);
        break;
      case "image":
      case "svg":
      default:
        loader.image(entry.key, url);
        break;
    }
  }

  releaseGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) return { group: groupName, released: 0 };
    group.references -= 1;
    if (group.references > 0) return { group: groupName, released: 0 };

    let released = 0;
    for (const key of group.keys) {
      const count = (this.keyReferences.get(key) || 1) - 1;
      if (count > 0) {
        this.keyReferences.set(key, count);
        continue;
      }
      this.keyReferences.delete(key);
      if (!this.ownedKeys.has(key)) continue;
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
        released += 1;
      } else if (this.scene.cache?.audio?.exists?.(key)) {
        this.scene.cache.audio.remove(key);
        released += 1;
      }
      this.ownedKeys.delete(key);
    }
    this.groups.delete(groupName);
    return { group: groupName, released };
  }

  getStats() {
    return {
      ...this.metrics,
      loadedKeys: [...this.metrics.loadedKeys],
      failedKeys: [...this.metrics.failedKeys],
      activeGroups: [...this.groups.keys()],
      referencedAssets: this.keyReferences.size
    };
  }

  destroy(options = {}) {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const [event, handler] of this.listeners) this.scene.load.off(event, handler);
    this.listeners = [];
    if (options.unload === true) {
      for (const groupName of [...this.groups.keys()]) {
        const group = this.groups.get(groupName);
        if (group) group.references = 1;
        this.releaseGroup(groupName);
      }
    }
    this.scene = null;
  }
}

export default PhaserAssetManager;
