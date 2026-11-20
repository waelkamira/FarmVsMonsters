const sharedResourcesByGame = new WeakMap();

function resourceIdFor(entry) {
  return (entry.type === "audio" ? "audio:" : "texture:") + entry.key;
}

function getSharedResourceState(scene) {
  const owner = scene.game || scene.textures;
  let state = sharedResourcesByGame.get(owner);
  if (!state) {
    state = new Map();
    sharedResourcesByGame.set(owner, state);
  }
  return state;
}

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
    this.sharedResources = getSharedResourceState(scene);
    this.localResources = new Map();
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

      for (const entry of entries) {
        if (entry.type === "spritesheet" && !entry.frameConfig) {
          throw new Error(`Spritesheet "${entry.key}" has no frameConfig`);
        }
      }
      const pending = entries.filter((entry) => !this.hasAsset(entry.key, entry.type));
      this.metrics.requested += pending.length;
      const loader = this.scene.load;

      if (pending.length > 0) {
        if (loader.isLoading()) {
          await new Promise((resolve) => loader.once("complete", resolve));
        }
        await new Promise((resolve, reject) => {
          let settled = false;
          const finish = (error) => {
            if (settled) return;
            settled = true;
            loader.off("complete", onComplete);
            loader.off("loaderror", onError);
            error ? reject(error) : resolve();
          };
          const errors = [];
          const onComplete = () => {
            if (errors.length && options.failOnError !== false) {
              finish(new Error(`Failed to load ${errors.length} asset(s) in group "${groupName}"`));
            } else finish();
          };
          const onError = (file) => {
            // Phaser emits loaderror per file and continues loading the queue.
            errors.push(file?.key || file?.src || "unknown");
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
      }

      for (const entry of entries) {
        const resourceId = resourceIdFor(entry);
        let resource = this.sharedResources.get(resourceId);
        if (!resource) {
          resource = {
            key: entry.key,
            type: entry.type || "image",
            references: 0,
            owned: pending.some((item) => item.key === entry.key && (item.type || "image") === (entry.type || "image"))
          };
          this.sharedResources.set(resourceId, resource);
        }
        resource.references += 1;
        this.localResources.set(resourceId, (this.localResources.get(resourceId) || 0) + 1);
      }
      this.groups.set(groupName, { entries, references: 1 });
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
    for (const entry of group.entries) {
      const resourceId = resourceIdFor(entry);
      const resource = this.sharedResources.get(resourceId);
      if (!resource) continue;
      resource.references -= 1;
      const localCount = (this.localResources.get(resourceId) || 1) - 1;
      if (localCount > 0) this.localResources.set(resourceId, localCount);
      else this.localResources.delete(resourceId);
      if (resource.references > 0) continue;

      if (resource.owned) {
        if (resource.type === "audio" && this.scene.cache?.audio?.exists?.(resource.key)) {
          this.scene.cache.audio.remove(resource.key);
          released += 1;
        } else if (this.scene.textures.exists(resource.key)) {
          this.scene.textures.remove(resource.key);
          released += 1;
        }
      }
      this.sharedResources.delete(resourceId);
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
      referencedAssets: this.localResources.size
    };
  }

  destroy(options = {}) {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const [event, handler] of this.listeners) this.scene.load.off(event, handler);
    this.listeners = [];
    for (const groupName of [...this.groups.keys()]) {
      const group = this.groups.get(groupName);
      if (group) group.references = 1;
      if (options.unload === false) {
        for (const entry of group?.entries || []) {
          const resourceId = resourceIdFor(entry);
          const resource = this.sharedResources.get(resourceId);
          if (!resource) continue;
          resource.references -= 1;
          if (resource.references <= 0) this.sharedResources.delete(resourceId);
          const localCount = (this.localResources.get(resourceId) || 1) - 1;
          if (localCount > 0) this.localResources.set(resourceId, localCount);
          else this.localResources.delete(resourceId);
        }
        this.groups.delete(groupName);
      } else {
        this.releaseGroup(groupName);
      }
    }
    this.scene = null;
  }
}

export default PhaserAssetManager;
