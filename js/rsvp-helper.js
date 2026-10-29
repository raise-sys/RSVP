// RSVP Blazor Helper
window.rsvpHelper = {
    parser: null,
    dotNetHelper: null,
    keyListener: null,
    audioCtx: null,

    async initBudouX() {
        if (!this.parser) {
            if (window.budoux && window.budoux.loadDefaultJapaneseParser) {
                this.parser = window.budoux.loadDefaultJapaneseParser();
            } else {
                await new Promise(resolve => {
                    if (window.budoux?.loadDefaultJapaneseParser) {
                        this.parser = window.budoux.loadDefaultJapaneseParser();
                        return resolve();
                    }
                    const s = document.createElement('script');
                    s.src = 'https://unpkg.com/budoux/bundle/budoux-ja.min.js';
                    s.onload = () => {
                        this.parser = window.budoux?.loadDefaultJapaneseParser?.() || null;
                        resolve();
                    };
                    s.onerror = () => resolve();
                    document.head.appendChild(s);
                });
            }
        }
        return !!this.parser;
    },

    async parseText(text) {
        if (!text) return [];
        if (!this.parser) {
            await this.initBudouX();
        }
        if (this.parser) {
            return this.parser.parse(text).map(w => w.trim()).filter(Boolean);
        }
        return text.replace(/([、。！？\n]+)/g, '$1\u200b').split('\u200b')
            .flatMap(c => c.length <= 8 ? [c] : (c.match(/.{1,7}/g) || [c]))
            .map(s => s.trim()).filter(s => s.length > 0);
    },

    registerKeyboard(dotNetObj) {
        this.dotNetHelper = dotNetObj;
        if (!this.keyListener) {
            this.keyListener = (e) => {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
                    if (e.code !== 'Escape') return;
                }
                if (['Space', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.code)) {
                    e.preventDefault();
                    if (this.dotNetHelper) {
                        this.dotNetHelper.invokeMethodAsync('OnGlobalKeyDown', e.code);
                    }
                }
            };
            window.addEventListener('keydown', this.keyListener);
        }
    },

    unregisterKeyboard() {
        if (this.keyListener) {
            window.removeEventListener('keydown', this.keyListener);
            this.keyListener = null;
        }
        this.dotNetHelper = null;
    },

    getClickRatio(element, clientX) {
        if (!element) return 0;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        const ratio = (clientX - rect.left) / rect.width;
        return Math.max(0, Math.min(1, ratio));
    },

    // LocalStorage Support for Study Records
    getStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },

    setStorage(key, val) {
        try {
            localStorage.setItem(key, val);
            return true;
        } catch {
            return false;
        }
    },

    // Play chime sound on 25m session complete (Web Audio API)
    playChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            // Arpeggio sound
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.2);
        } catch (e) {
            console.log("Audio play error:", e);
        }
    },

    // クリックされた画像要素の正確な相対位置（0%〜100%）を算出
    getImageClickPercent(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY);
        const img = (el && el.tagName === 'IMG') ? el : el?.querySelector?.('img');
        if (img) {
            const rect = img.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
                return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
            }
        }
        return { x: 50, y: 50 };
    }
};
