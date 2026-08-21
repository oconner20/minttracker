// ลงทะเบียน Service Worker + จัดการการอัปเดตเวอร์ชัน
// ทำงานเมื่อเปิดผ่าน http/https เท่านั้น (file:// ไม่รองรับ Service Worker)
(function () {
    if (!('serviceWorker' in navigator)) return;

    // จำไว้ว่าตอนโหลดหน้ามี SW ควบคุมอยู่แล้วหรือยัง
    // ถ้ายังไม่มี = เพิ่งติดตั้งครั้งแรก ต้องไม่รีโหลดหน้าใส่ผู้ใช้
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading) return;
        reloading = true;
        location.reload();
    });

    function showUpdateBanner(reg) {
        if (document.getElementById('swUpdateBanner')) return; // กันแสดงซ้ำ
        const bar = document.createElement('div');
        bar.id = 'swUpdateBanner';
        bar.className = 'fixed bottom-24 left-4 right-4 mx-auto max-w-md z-[90] bg-white rounded-card p-4 flex items-center gap-3 shadow-card animate-fade-in';
        bar.innerHTML =
            '<div class="w-10 h-10 rounded-full bg-green-light text-green-accent flex items-center justify-center shrink-0">' +
            '<i class="fa-solid fa-arrows-rotate"></i></div>' +
            '<div class="min-w-0 flex-1">' +
            '<p class="font-bold text-ink text-sm">มีเวอร์ชันใหม่พร้อมใช้งาน</p>' +
            '<p class="text-xs text-ink-soft">กดอัปเดตเพื่อใช้เวอร์ชันล่าสุด</p></div>' +
            '<button id="swUpdateBtn" class="shrink-0 px-4 py-2 rounded-pill bg-green-accent hover:bg-starbucks-green text-white font-bold text-sm">อัปเดต</button>' +
            '<button id="swUpdateDismiss" aria-label="ปิด" class="shrink-0 w-8 h-8 rounded-full text-ink-soft hover:text-ink">' +
            '<i class="fa-solid fa-xmark"></i></button>';
        document.body.appendChild(bar);

        document.getElementById('swUpdateBtn').addEventListener('click', () => {
            bar.remove();
            // สั่งให้ SW ตัวที่รออยู่เข้าควบคุม -> จะเกิด controllerchange -> รีโหลดอัตโนมัติ
            if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
        document.getElementById('swUpdateDismiss').addEventListener('click', () => bar.remove());
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((reg) => {
            // มีเวอร์ชันใหม่รออยู่ตั้งแต่เปิดหน้า (เช่น ปิดแอปไปก่อนกดอัปเดต)
            if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);

            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', () => {
                    // installed + มี controller เดิมอยู่ = เป็น "การอัปเดต" ไม่ใช่ติดตั้งครั้งแรก
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(reg);
                });
            });

            // กลับมาที่แอปเมื่อไร ให้เช็คเวอร์ชันใหม่ให้อัตโนมัติ
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') reg.update().catch(() => {});
            });
        }).catch((err) => console.warn('Service Worker registration failed:', err));
    });
})();
