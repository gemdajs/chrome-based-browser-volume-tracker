const DEFAULT_VOLUME = 0.0;
const INACTIVITY_LIMIT = 5 * 60 * 1000

class AppLogger {
    static print(...args) {
        // console.log(new Date(), ...args);
    }
}


class StorageManager {
    constructor(key) {
        this.key = key;
    }

    getValue() {
        return localStorage.getItem(this.key);
    }

    setValue(value) {
        localStorage.setItem(this.key, value);
    }
}

class VolumeManager extends StorageManager {
    initComplete = false

    constructor() {
        super("globalVideoVolume");
        this.savedVolume = parseFloat(this.getValue()) || DEFAULT_VOLUME;
        AppLogger.print(`VolumeManager initialized with saved volume: ${this.savedVolume}`);
    }

    setVolume(volume) {
        this.savedVolume = volume;
        this.setValue(volume);
        AppLogger.print(`Global video volume set to: ${volume}`);
    }

    getVolume() {
        return this.savedVolume;
    }

    attachVolumeListener(video) {
        video.addEventListener("volumechange", () => {
            if (!this.initComplete) return;

            let newVolume = video.volume;
            document.querySelectorAll("video").forEach((v) => v.volume = newVolume);

            this.setVolume(newVolume);
        });
    }

    applyVolume(video, savedVolume) {
        if (!video) return;
        if (!video._volumeManaged) {
            video._volumeManaged = true;
            this.attachVolumeListener(video);
        }
        video.volume = savedVolume;
        setTimeout(() => this.applyVolume(video, this.getVolume()), 2000);
    }

    handleAllVideos() {
        let savedVolume = this.getVolume();
        document.querySelectorAll("video").forEach((v) => this.applyVolume(v, savedVolume));

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    const tagName = node.tagName ? node.tagName.toLowerCase() : "";
                    const nodeType = node.nodeType || ""

                    if (tagName === "video") {
                        this.applyVolume(node, savedVolume);
                    } else if (nodeType === Node.ELEMENT_NODE) {
                        node.querySelectorAll("video").forEach((v) => this.applyVolume(v, savedVolume));
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
}

class ActivityTracker extends StorageManager {
    constructor() {
        super("userActivity");

        this.lastActivity = Date.now();
        this.inactivityLimit = INACTIVITY_LIMIT;
        this.init();
    }

    async checkPattern(url) {
        
        const storage = (typeof browser !== "undefined" ? browser?.storage?.local : chrome?.storage?.local);

        return new Promise((resolve) => {
            if (!storage) {
                AppLogger.print("Chrome storage not available.");
                resolve(false);
                return;
            }

            storage?.get({ urlPatterns: [] }, ({ urlPatterns }) => {
                const currentUrl = this.checkPattern(url || window.location.href);
                const matchesPattern = urlPatterns.some(pattern => currentUrl == pattern);
                resolve(!!!matchesPattern);
            });
        });
    }

    init() {
        ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt =>
            window.addEventListener(evt, this.resetTimer, { passive: true })
        );

        setInterval(() => {
            if ((Date.now() - this.lastActivity) >= this.inactivityLimit) {
                this.checkPattern().then((isPatternMatched) => {
                    AppLogger.print("🚨 Page inactive");
                    if (!isPatternMatched) {
                        AppLogger.print("⏭️ Activity tracker disabled (URL doesn't match pattern).");
                        return;
                    }
                    AppLogger.print("⏭️ Closing window...");
                    try {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            chrome.tabs.remove(tabs[0].id);
                        });
                    } catch (e) {
                        AppLogger.print("Error closing window:", e);
                    }
                });
            }
        }, 1000);
    }

    resetTimer() {
        this.lastActivity = Date.now();
    }

    getBaseUrl(url) {
        if (!url) return null;

        try {
            const u = new URL(url);
            return `${u.protocol}//${u.hostname}`;
        } catch (e) {
            return null;
        }
    }
}

const volumeManager = new VolumeManager();
volumeManager.handleAllVideos();

setTimeout(() => volumeManager.initComplete = true, 2000);

const _ = new ActivityTracker();

