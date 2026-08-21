// DOM Elements
const money_plus = document.getElementById('totalIncome');
const money_minus = document.getElementById('totalExpense');
const list = document.getElementById('list');
const form = document.getElementById('transactionForm');

// Modal & Form Elements
const categorySelectBtn = document.getElementById('categorySelectBtn');
const categorySelectText = document.getElementById('categorySelectText');
const customCategoryContainer = document.getElementById('customCategoryContainer');
const customCategoryInput = document.getElementById('customCategoryInput');
const amount = document.getElementById('amount');
const dateInput = document.getElementById('date');
const detailInput = document.getElementById('detail'); 

const walletSelectLabel = document.getElementById('walletSelectLabel');
const walletSelectBtn = document.getElementById('walletSelectBtn');
const walletSelectText = document.getElementById('walletSelectText');

const toWalletGroup = document.getElementById('toWalletGroup');
const toWalletSelectBtn = document.getElementById('toWalletSelectBtn');
const toWalletSelectText = document.getElementById('toWalletSelectText');

const categoryGroup = document.getElementById('categoryGroup');

// --- Utility helpers (ความปลอดภัย) ---
// ป้องกัน JS/HTML พังและกัน XSS จากข้อความที่ผู้ใช้กรอกเอง (ชื่อกระเป๋า, รายละเอียด, หมวดหมู่ "อื่นๆ")
function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
// อ่านข้อมูลจาก localStorage แบบปลอดภัย: ถ้าข้อมูลเสียหาย/parse ไม่ได้ ให้ใช้ค่าเริ่มต้นแทน แอปจะไม่จอขาว
function safeParse(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        return (parsed === null || parsed === undefined) ? fallback : parsed;
    } catch (e) {
        console.warn(`ข้อมูล "${key}" ใน localStorage เสียหาย จึงใช้ค่าเริ่มต้นแทน`, e);
        return fallback;
    }
}

// เขียนลง localStorage แบบปลอดภัย คืนค่า true/false ว่าบันทึกสำเร็จหรือไม่
// สำคัญ: ถ้าพื้นที่เต็ม (หรือ Safari โหมดส่วนตัว) setItem จะโยน error
// ถ้าไม่ดักไว้ ผู้ใช้จะเห็นข้อความ "บันทึกสำเร็จ" ทั้งที่ข้อมูลไม่ได้ถูกเขียนจริง = ข้อมูลหายแบบไม่รู้ตัว
function safeSave(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`บันทึก "${key}" ลง localStorage ไม่สำเร็จ`, e);
        const isFull = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
        showToast(isFull ? 'พื้นที่เก็บข้อมูลเต็ม! กรุณาสำรองข้อมูลแล้วลบรายการเก่าออก' : 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        return false;
    }
}

// State variables
const defaultWallet = [{ id: 1, name: 'เงินสด', initialBalance: 0 }];
// โหลดแบบกันพัง + ตรวจชนิดข้อมูลให้ตรงกับที่โค้ดคาดหวัง (กันกรณีข้อมูลถูกแก้/เสียหายจนโครงสร้างผิด)
let wallets = safeParse('wallets', defaultWallet);
if (!Array.isArray(wallets) || wallets.length === 0) wallets = JSON.parse(JSON.stringify(defaultWallet));
let transactions = safeParse('transactions', []);
if (!Array.isArray(transactions)) transactions = [];
let budgets = safeParse('budgets', {});
if (typeof budgets !== 'object' || budgets === null || Array.isArray(budgets)) budgets = {};
let nickname = localStorage.getItem('nickname') || 'ผู้ใช้งาน';

let editingId = null; let editingWalletId = null; 
let currentSelectedWalletId = null; // From Wallet or Single Wallet
let transferToWalletId = null; // To Wallet (for Transfers)
let walletSelectionTarget = 'from'; // 'from' or 'to'

let pendingConfirmCallback = null;
let currentFilter = 'all';
// ตัวกรองประวัติรายการ: id ของปุ่ม -> ค่าที่ใช้กรอง และป้ายข้อความตอนไม่พบข้อมูล
const FILTER_BY_ID = { filterAll: 'all', filterIncome: 'income', filterExpense: 'expense', filterTransfer: 'transfer' };
const FILTER_LABEL = { income: 'รายรับ', expense: 'รายจ่าย', transfer: 'การโอน' };


// Date & Time Logic
let currentDisplayMonth = new Date().getMonth(); let currentDisplayYear = new Date().getFullYear();
const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function setDateToCurrent() {
    const today = new Date();
    const y = today.getFullYear(); const m = String(today.getMonth() + 1).padStart(2, '0'); const d = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${y}-${m}-${d}`;
    document.getElementById('currentDateDisplay').innerHTML = `<i class="fa-regular fa-calendar mr-1"></i> ${today.getDate()} ${thaiMonthsShort[today.getMonth()]} ${today.getFullYear() + 543}`;
}
setDateToCurrent();

// Categories Data (Updated with Dark Mode specific utility classes)
// หมายเหตุ: "label" ถูกบันทึกลงในรายการของผู้ใช้ (t.text) ห้ามเปลี่ยนชื่อหมวดเดิม
// มิฉะนั้นรายการเก่าจะหาไอคอนไม่เจอและถูกแยกเป็นคนละหมวดในหน้ารายงาน
// "group" ใช้จัดกลุ่มหัวข้อในหน้าต่างเลือกหมวดหมู่เท่านั้น (ไม่ถูกบันทึก)
const expenseCategories = [
    // อาหารและของใช้
    { group: "อาหารและของใช้", label: "อาหารและเครื่องดื่ม", icon: "🍔", color: "bg-cat-clay-bg text-cat-clay-fg border-cat-clay-bd" },
    { group: "อาหารและของใช้", label: "กาแฟ-ชานม", icon: "☕", color: "bg-cat-espresso-bg text-cat-espresso-fg border-cat-espresso-bd" },
    { group: "อาหารและของใช้", label: "ของใช้ในบ้าน", icon: "🧺", color: "bg-cat-moss-bg text-cat-moss-fg border-cat-moss-bd" },
    // เดินทาง
    { group: "เดินทาง", label: "ค่าเดินทาง", icon: "🚗", color: "bg-cat-denim-bg text-cat-denim-fg border-cat-denim-bd" },
    { group: "เดินทาง", label: "น้ำมัน-ชาร์จรถ", icon: "⛽", color: "bg-cat-azure-bg text-cat-azure-fg border-cat-azure-bd" },
    // ที่อยู่และบิล
    { group: "ที่อยู่และบิล", label: "ที่พักอาศัย", icon: "🏠", color: "bg-cat-plum-bg text-cat-plum-fg border-cat-plum-bd" },
    { group: "ที่อยู่และบิล", label: "ค่าน้ำ-ไฟ-เน็ต", icon: "💡", color: "bg-cat-honey-bg text-cat-honey-fg border-cat-honey-bd" },
    { group: "ที่อยู่และบิล", label: "ค่าบริการรายเดือน", icon: "🔁", color: "bg-cat-lavender-bg text-cat-lavender-fg border-cat-lavender-bd" },
    // ไลฟ์สไตล์
    { group: "ไลฟ์สไตล์", label: "ช้อปปิ้ง", icon: "🛍️", color: "bg-cat-rosewood-bg text-cat-rosewood-fg border-cat-rosewood-bd" },
    { group: "ไลฟ์สไตล์", label: "ความบันเทิง", icon: "🎬", color: "bg-cat-grape-bg text-cat-grape-fg border-cat-grape-bd" },
    { group: "ไลฟ์สไตล์", label: "ท่องเที่ยว", icon: "✈️", color: "bg-cat-lagoon-bg text-cat-lagoon-fg border-cat-lagoon-bd" },
    { group: "ไลฟ์สไตล์", label: "ความงาม-ดูแลตัวเอง", icon: "💅", color: "bg-cat-blush-bg text-cat-blush-fg border-cat-blush-bd" },
    // สุขภาพและครอบครัว
    { group: "สุขภาพและครอบครัว", label: "สุขภาพ-แพทย์", icon: "💊", color: "bg-cat-brick-bg text-cat-brick-fg border-cat-brick-bd" },
    { group: "สุขภาพและครอบครัว", label: "ออกกำลังกาย-กีฬา", icon: "🏋️", color: "bg-cat-fern-bg text-cat-fern-fg border-cat-fern-bd" },
    { group: "สุขภาพและครอบครัว", label: "ครอบครัว-ลูก", icon: "👨‍👩‍👧", color: "bg-cat-orchid-bg text-cat-orchid-fg border-cat-orchid-bd" },
    { group: "สุขภาพและครอบครัว", label: "สัตว์เลี้ยง", icon: "🐾", color: "bg-cat-taupe-bg text-cat-taupe-fg border-cat-taupe-bd" },
    { group: "สุขภาพและครอบครัว", label: "การศึกษา", icon: "🎓", color: "bg-cat-pine-bg text-cat-pine-fg border-cat-pine-bd" },
    // การเงินและสังคม
    { group: "การเงินและสังคม", label: "ชำระหนี้สิน", icon: "💳", color: "bg-cat-sage-bg text-cat-sage-fg border-cat-sage-bd" },
    { group: "การเงินและสังคม", label: "ประกัน", icon: "🛡️", color: "bg-cat-steel-bg text-cat-steel-fg border-cat-steel-bd" },
    { group: "การเงินและสังคม", label: "ภาษี-ค่าธรรมเนียม", icon: "🧾", color: "bg-cat-pebble-bg text-cat-pebble-fg border-cat-pebble-bd" },
    { group: "การเงินและสังคม", label: "ของขวัญ-ทำบุญ", icon: "🙏", color: "bg-cat-honey-bg text-cat-honey-fg border-cat-honey-bd" },
    // อื่นๆ (ต้องอยู่ท้ายสุดเสมอ - เป็นตัวเปิดช่องกรอกรายละเอียดเอง)
    { group: "อื่นๆ", label: "อื่นๆ", icon: "✨", color: "bg-cat-pebble-bg text-cat-pebble-fg border-cat-pebble-bd" }
];

const incomeCategories = [
    // รายได้ประจำ
    { group: "รายได้ประจำ", label: "เงินเดือน", icon: "💵", color: "bg-cat-pine-bg text-cat-pine-fg border-cat-pine-bd" },
    { group: "รายได้ประจำ", label: "โบนัส", icon: "🎁", color: "bg-cat-honey-bg text-cat-honey-fg border-cat-honey-bd" },
    { group: "รายได้ประจำ", label: "ค่าล่วงเวลา-เบี้ยเลี้ยง", icon: "⏰", color: "bg-cat-moss-bg text-cat-moss-fg border-cat-moss-bd" },
    // งานเสริมและธุรกิจ
    { group: "งานเสริมและธุรกิจ", label: "รายได้เสริม", icon: "🚀", color: "bg-cat-azure-bg text-cat-azure-fg border-cat-azure-bd" },
    { group: "งานเสริมและธุรกิจ", label: "ฟรีแลนซ์-รับจ้าง", icon: "💼", color: "bg-cat-denim-bg text-cat-denim-fg border-cat-denim-bd" },
    { group: "งานเสริมและธุรกิจ", label: "ค้าขาย-ธุรกิจ", icon: "🏪", color: "bg-cat-clay-bg text-cat-clay-fg border-cat-clay-bd" },
    // สินทรัพย์
    { group: "สินทรัพย์", label: "การลงทุน", icon: "📈", color: "bg-cat-lagoon-bg text-cat-lagoon-fg border-cat-lagoon-bd" },
    { group: "สินทรัพย์", label: "เงินปันผล-ดอกเบี้ย", icon: "🏦", color: "bg-cat-sage-bg text-cat-sage-fg border-cat-sage-bd" },
    { group: "สินทรัพย์", label: "ค่าเช่า-ให้เช่า", icon: "🏡", color: "bg-cat-plum-bg text-cat-plum-fg border-cat-plum-bd" },
    // รายรับอื่น
    { group: "รายรับอื่น", label: "เงินได้จากผู้อื่น", icon: "🧧", color: "bg-cat-rosewood-bg text-cat-rosewood-fg border-cat-rosewood-bd" },
    { group: "รายรับอื่น", label: "คืนเงิน-เงินทอน", icon: "↩️", color: "bg-cat-lavender-bg text-cat-lavender-fg border-cat-lavender-bd" },
    { group: "รายรับอื่น", label: "รางวัล-โชคลาภ", icon: "🍀", color: "bg-cat-fern-bg text-cat-fern-fg border-cat-fern-bd" },
    // อื่นๆ (ต้องอยู่ท้ายสุดเสมอ)
    { group: "อื่นๆ", label: "อื่นๆ", icon: "✨", color: "bg-cat-pebble-bg text-cat-pebble-fg border-cat-pebble-bd" }
];
let selectedCategoryObj = null;

// UI & Tab Logic
function switchTab(tabId) {
    if (editingId !== null && tabId !== 'view-add') cancelEdit();
    if (tabId === 'view-add' && !editingId) {
        if(currentDisplayMonth !== new Date().getMonth() || currentDisplayYear !== new Date().getFullYear()) {
            dateInput.value = `${currentDisplayYear}-${String(currentDisplayMonth + 1).padStart(2, '0')}-01`;
        } else setDateToCurrent();
    }

    document.querySelectorAll('.tab-content').forEach(el => { el.classList.add('hidden'); el.classList.remove('block', 'animate-fade-in'); });
    const target = document.getElementById(tabId);
    if(target) { target.classList.remove('hidden'); target.classList.add('block', 'animate-fade-in'); }
    document.getElementById('monthFilterContainer').style.display = (tabId === 'view-add' || tabId === 'view-wallet' || tabId === 'view-settings') ? 'none' : 'flex';

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const icon = btn.querySelector('i');
        if (btn.dataset.target === tabId) {
            btn.classList.add('text-green-accent'); btn.classList.remove('text-ink-soft');
            if(icon) icon.classList.add('scale-110');
        } else {
            btn.classList.remove('text-green-accent'); btn.classList.add('text-ink-soft');
            if(icon) icon.classList.remove('scale-110');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(modalId + 'Overlay');
    const content = document.getElementById(modalId + 'Content');
    if(show) {
        modal.classList.remove('hidden'); void modal.offsetWidth;
        overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100');
        content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100');
    } else {
        overlay.classList.remove('opacity-100'); overlay.classList.add('opacity-0');
        content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function openConfirmModal(title, text, btnClass, callback) {
    document.getElementById('confirmModalTitle').innerHTML = title;
    document.getElementById('confirmModalText').innerText = text;
    const confirmBtn = document.getElementById('confirmModalBtn');
    confirmBtn.className = `flex-1 py-3 rounded-card font-bold text-white transition-colors shadow-none ${btnClass}`;
    pendingConfirmCallback = callback;
    toggleModal('confirmModal', true);
}
function closeConfirmModal() { toggleModal('confirmModal', false); pendingConfirmCallback = null; }
function executeConfirm() { if(pendingConfirmCallback) pendingConfirmCallback(); closeConfirmModal(); }

// Wallet Logic & Balance Calculation Helper
function getWalletBalance(wId) {
    const w = wallets.find(x => x.id === wId);
    if(!w) return 0;
    let bal = w.initialBalance;
    transactions.forEach(t => {
        if (t.type === 'transfer') {
            if (t.fromWalletId === wId) bal -= t.amount;
            if (t.toWalletId === wId) bal += t.amount;
        } else {
            const tWId = t.walletId || wallets[0].id;
            if (tWId === wId) bal += t.amount; 
        }
    });
    return bal;
}

function openWalletModal() {
    editingWalletId = null;
    document.getElementById('walletModalTitle').innerHTML = `<i class="fa-solid fa-plus-circle text-green-accent"></i> เพิ่มกระเป๋าเงิน`;
    document.getElementById('walletNameInput').value = ''; document.getElementById('walletBalanceInput').value = '';
    toggleModal('walletModal', true);
}
function closeWalletModal() { toggleModal('walletModal', false); }
function editWallet(id) {
    const w = wallets.find(w => w.id === id); if(!w) return;
    editingWalletId = id;
    document.getElementById('walletModalTitle').innerHTML = `<i class="fa-solid fa-pen text-green-accent"></i> แก้ไขกระเป๋าเงิน`;
    document.getElementById('walletNameInput').value = w.name; document.getElementById('walletBalanceInput').value = w.initialBalance;
    toggleModal('walletModal', true);
}

function saveWallet() {
    const name = document.getElementById('walletNameInput').value.trim();
    const initBal = parseFloat(document.getElementById('walletBalanceInput').value);
    if (!name) { showToast('กรุณาตั้งชื่อกระเป๋าเงิน', 'error'); return; }
    if (isNaN(initBal)) { showToast('กรุณาระบุยอดยกมาเริ่มต้น (ใส่ 0 ได้)', 'error'); return; }

    // บันทึกให้สำเร็จก่อนค่อยแจ้งผล และย้อนกลับถ้าเขียนไม่ได้
    const prevWallets = wallets;
    const isEditing = !!editingWalletId;
    if (isEditing) {
        wallets = wallets.map(w => w.id === editingWalletId ? { ...w, name: name, initialBalance: initBal } : w);
    } else {
        wallets = [...wallets, { id: generateID(), name: name, initialBalance: initBal }];
    }
    if (!safeSave('wallets', wallets)) { wallets = prevWallets; return; }
    showToast(isEditing ? 'แก้ไขกระเป๋าเงินเรียบร้อย' : 'เพิ่มกระเป๋าเงินเรียบร้อย');
    closeWalletModal(); updateValues();
}

function deleteWallet(id) {
    if (wallets.length <= 1) { showToast('ต้องมีกระเป๋าเงินอย่างน้อย 1 ใบ', 'error'); return; }
    openConfirmModal(
        '<i class="fa-solid fa-triangle-exclamation text-expense"></i> ลบกระเป๋าเงิน',
        'ประวัติรายการทั้งหมดที่ผูกกับกระเป๋าเงินนี้จะถูกลบไปด้วย ยืนยันการลบหรือไม่?',
        'bg-expense hover:bg-expense ',
        () => {
            const targetWalletId = id; const fallbackWalletId = wallets[0].id;
            transactions = transactions.filter(t => {
                if (t.type === 'transfer') return t.fromWalletId !== targetWalletId && t.toWalletId !== targetWalletId;
                return !(t.walletId === targetWalletId || (!t.walletId && fallbackWalletId === targetWalletId));
            });
            updateLocalStorage();
            wallets = wallets.filter(w => w.id !== id);
            safeSave('wallets', wallets);
            showToast('ลบกระเป๋าเงินและประวัติแล้ว', 'info'); updateValues();
        }
    );
}

function openWalletSelectModal(target = 'from') { walletSelectionTarget = target; toggleModal('walletSelectModal', true); }
function closeWalletSelectModal() { toggleModal('walletSelectModal', false); }

function selectWalletForForm(id) {
    // หาชื่อจาก id เองแล้ว escape ก่อนแสดง จึงไม่ต้องฝากชื่อไว้ใน onclick อีก (ชื่อที่มี ' หรือ " จะไม่ทำให้พัง)
    const w = wallets.find(x => x.id === id);
    const name = escapeHTML(w ? w.name : '');
    if (walletSelectionTarget === 'from') {
        currentSelectedWalletId = id;
        walletSelectBtn.className = "w-full px-4 py-3 rounded-card border border-green-accent bg-green-light focus:ring-2 focus:ring-green-light outline-none transition-all text-left flex justify-between items-center group";
        walletSelectText.innerHTML = `<span class="flex items-center gap-2 min-w-0 pr-2"><i class="fa-solid fa-wallet text-green-accent shrink-0"></i> <span class="text-ink font-bold truncate">${name}</span></span>`;
    } else if (walletSelectionTarget === 'to') {
        transferToWalletId = id;
        toWalletSelectBtn.className = "w-full px-4 py-3 rounded-card border border-transfer bg-gold-lightest focus:ring-2 focus:ring-gold-light outline-none transition-all text-left flex justify-between items-center group";
        toWalletSelectText.innerHTML = `<span class="flex items-center gap-2 min-w-0 pr-2"><i class="fa-solid fa-wallet text-transfer shrink-0"></i> <span class="text-ink font-bold truncate">${name}</span></span>`;
    }
    closeWalletSelectModal();
}

function renderWalletsAndTotals() {
    document.getElementById('walletList').innerHTML = '';
    document.getElementById('walletSelectModalList').innerHTML = '';
    const settingsWalletList = document.getElementById('settingsWalletList');
    if(settingsWalletList) settingsWalletList.innerHTML = '';
    
    let grandTotalNetWorth = 0;

    wallets.forEach(wallet => {
        let currentBalance = getWalletBalance(wallet.id);
        grandTotalNetWorth += currentBalance;
        const safeName = escapeHTML(wallet.name); // ใช้แสดงชื่อกระเป๋าทุกจุดในลูปนี้แบบปลอดภัย

        // View in Tab 2
        document.getElementById('walletList').insertAdjacentHTML('beforeend', `
            <div class="bg-white rounded-card p-5 relative overflow-hidden transition-colors shadow-card">
                <div class="absolute top-0 right-0 w-20 h-20 bg-green-light rounded-bl-full opacity-20"></div>
                <div class="flex items-center gap-3 mb-4 relative z-10 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-ceramic flex items-center justify-center text-green-accent shrink-0"><i class="fa-solid fa-wallet"></i></div>
                    <h3 class="font-bold text-ink text-lg truncate w-full" title="${safeName}">${safeName}</h3>
                </div>
                <div class="relative z-10 flex justify-between items-end min-w-0">
                    <div class="min-w-0 w-full">
                        <p class="text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">คงเหลือ</p>
                        <p class="text-xl sm:text-2xl font-bold truncate w-full ${currentBalance < 0 ? 'text-expense ' : 'text-ink '}">${formatMoney(currentBalance)}</p>
                    </div>
                </div>
            </div>`);

        // Form Modal Select
        const isSelected = (walletSelectionTarget === 'from' && currentSelectedWalletId === wallet.id) || (walletSelectionTarget === 'to' && transferToWalletId === wallet.id);
        const bgSelectClass = isSelected 
            ? (walletSelectionTarget==='from' ? 'border-green-accent bg-green-light ' : 'border-transfer bg-gold-lightest ') 
            : 'border-hairline bg-white hover:border-hairline ';
        
        const iconBgClass = walletSelectionTarget==='to' ? 'bg-gold-lightest text-transfer ' : 'bg-green-light text-green-accent ';
        const checkIconColor = walletSelectionTarget==='to' ? 'text-transfer ' : 'text-green-accent ';

        document.getElementById('walletSelectModalList').insertAdjacentHTML('beforeend', `
            <button type="button" onclick="selectWalletForForm(${wallet.id})" class="w-full p-4 rounded-pill border-2 transition-all transform active:scale-95 flex justify-between items-center ${bgSelectClass}">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center shrink-0"><i class="fa-solid fa-wallet"></i></div>
                    <div class="text-left min-w-0 flex-1 pr-2">
                        <p class="font-bold text-ink truncate">${safeName}</p>
                        <p class="text-xs font-medium text-ink-soft truncate w-full">ยอดเงิน: <span class="${currentBalance < 0 ? 'text-expense ' : ''}">${formatMoney(currentBalance)}</span></p>
                    </div>
                </div>
                ${isSelected ? `<div class="shrink-0"><i class="fa-solid fa-circle-check text-2xl ${checkIconColor}"></i></div>` : ''}
            </button>`);
        
        // Settings Tab List
        if(settingsWalletList) {
            settingsWalletList.insertAdjacentHTML('beforeend', `
                <div onclick="toggleWalletActions(${wallet.id})" class="relative p-3.5 bg-ceramic hover:bg-ceramic rounded-card transition-colors mb-2 border border-hairline cursor-pointer select-none">
                    <div class="flex items-center justify-between min-w-0 gap-2">
                        <div class="flex items-center gap-4 min-w-0 flex-1">
                            <div class="w-12 h-12 rounded-card bg-white text-green-accent flex items-center justify-center border border-hairline shrink-0">
                                <i class="fa-solid fa-wallet text-lg"></i>
                            </div>
                            <div class="min-w-0 flex-1 pr-2">
                                <p class="font-bold text-ink text-base truncate" title="${safeName}">${safeName}</p>
                                <p class="text-xs font-medium text-ink-soft mt-0.5 truncate w-full">ยอดเงิน: <span class="${currentBalance < 0 ? 'text-expense ' : ''}">${formatMoney(currentBalance)}</span></p>
                            </div>
                        </div>
                        <div class="p-2 -mr-2 shrink-0 py-4 pl-4"><i class="fa-solid fa-ellipsis text-ink-soft opacity-60 text-base px-2"></i></div>
                    </div>
                    <!-- Hidden Actions -->
                    <div id="wallet-actions-${wallet.id}" class="wallet-actions-container hidden justify-end items-center gap-2 mt-3 pt-3 border-t border-hairline" onclick="event.stopPropagation()">
                        <button onclick="editWallet(${wallet.id})" class="flex-1 px-4 py-2.5 rounded-pill bg-green-light text-green-accent hover:bg-green-light flex items-center justify-center transition-colors font-bold text-sm gap-2"><i class="fa-solid fa-pen"></i> แก้ไข</button>
                        <button onclick="deleteWallet(${wallet.id})" class="flex-1 px-4 py-2.5 rounded-pill bg-cat-brick-bg text-expense hover:bg-cat-brick-bg flex items-center justify-center transition-colors font-bold text-sm gap-2"><i class="fa-solid fa-trash"></i> ลบ</button>
                    </div>
                </div>`);
        }
    });

    if(settingsWalletList) {
        settingsWalletList.insertAdjacentHTML('beforeend', `
            <button onclick="openWalletModal()" class="w-full mt-1 py-3.5 rounded-pill border-2 border-dashed border-hairline text-green-accent font-bold hover:bg-green-light hover:border-green-light transition-colors flex items-center justify-center gap-2 shadow-none">
                <i class="fa-solid fa-plus"></i> เพิ่มกระเป๋าเงินใหม่
            </button>
        `);
    }

    if (!currentSelectedWalletId || !wallets.find(w => w.id === currentSelectedWalletId)) {
        if (wallets.length > 0) { walletSelectionTarget = 'from'; selectWalletForForm(wallets[0].id, wallets[0].name); }
    }
    document.getElementById('totalNetWorthWalletPage').innerText = formatMoney(grandTotalNetWorth);
}

// Handle Transaction Type Change (UI Toggle)
document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const type = e.target.value;
        if (type === 'transfer') {
            walletSelectLabel.innerText = "จากเป๋าตัง (ต้นทาง)";
            toWalletGroup.classList.remove('hidden');
            categoryGroup.classList.add('hidden');
            if (!transferToWalletId && wallets.length > 1) {
                const targetWallet = wallets.find(w => w.id !== currentSelectedWalletId) || wallets[1];
                walletSelectionTarget = 'to'; selectWalletForForm(targetWallet.id, targetWallet.name);
            }
        } else {
            walletSelectLabel.innerText = type === 'income' ? "เป๋าตัง (รับเงินเข้าที่ไหน?)" : "เป๋าตัง (ใช้เงินจากที่ไหน?)";
            toWalletGroup.classList.add('hidden');
            categoryGroup.classList.remove('hidden');
            populateCategoryModal(type);
            selectedCategoryObj = null;
            categorySelectBtn.className = "w-full px-4 py-3 rounded-card bg-white border border-hairline hover:border-green-accent outline-none transition-all text-left flex justify-between items-center group";
            categorySelectText.innerHTML = '-- เลือกหมวดหมู่ --'; categorySelectText.className = 'text-ink-soft font-medium truncate';
            customCategoryContainer.classList.add('hidden'); customCategoryInput.value = '';
        }
    });
});

// Category Logic
function openCategoryModal() { toggleModal('categoryModal', true); }
function closeCategoryModal() { toggleModal('categoryModal', false); }
function populateCategoryModal(type) {
    const listEl = document.getElementById('categoryModalList'); listEl.innerHTML = '';
    let lastGroup = null;
    (type === 'income' ? incomeCategories : expenseCategories).forEach(cat => {
        // ขึ้นหัวข้อกลุ่มใหม่เมื่อเปลี่ยนกลุ่ม (กินความกว้างเต็มแถวของ grid)
        if (cat.group && cat.group !== lastGroup) {
            lastGroup = cat.group;
            listEl.insertAdjacentHTML('beforeend', `
                <div class="col-span-2 sm:col-span-3 flex items-center gap-3 pt-3 first:pt-0">
                    <span class="text-[11px] font-bold uppercase tracking-widest text-ink-soft whitespace-nowrap">${cat.group}</span>
                    <span class="flex-1 h-px bg-ceramic"></span>
                </div>`);
        }
        // ส่งเฉพาะฟิลด์ที่จำเป็นเข้า onclick (ไม่ต้องส่ง group)
        const payload = JSON.stringify({ label: cat.label, icon: cat.icon, color: cat.color });
        listEl.insertAdjacentHTML('beforeend', `
            <button type="button" onclick='handleCategorySelect(${payload})' class="flex flex-col items-center justify-center p-4 rounded-pill border-2 transition-all transform active:scale-95 hover:bg-ceramic ${cat.color}">
                <span class="text-3xl mb-2 filter drop-shadow-sm">${cat.icon}</span>
                <span class="text-xs font-bold text-center leading-tight w-full truncate px-1">${cat.label}</span>
            </button>`);
    });
}
function handleCategorySelect(cat) {
    selectedCategoryObj = cat;
    categorySelectBtn.className = "w-full px-4 py-3 rounded-card border border-green-accent bg-green-light focus:ring-2 focus:ring-green-light outline-none transition-all text-left flex justify-between items-center group";
    categorySelectText.innerHTML = `<span class="flex items-center gap-2 min-w-0"><span class="text-xl shrink-0">${cat.icon}</span> <span class="text-ink font-bold truncate">${cat.label}</span></span>`;
    if (cat.label === 'อื่นๆ') { customCategoryContainer.classList.remove('hidden'); setTimeout(() => customCategoryInput.focus(), 300); } 
    else { customCategoryContainer.classList.add('hidden'); customCategoryInput.value = ''; }
    closeCategoryModal();
}

// Transaction Logic
function addTransaction(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const amountValue = Math.abs(amount.value);
    const wId = currentSelectedWalletId; 
    const dText = detailInput.value.trim();
    let tx = null;

    if (type === 'transfer') {
        if (currentSelectedWalletId === transferToWalletId) { showToast('ไม่สามารถโอนไปกระเป๋าเดียวกันได้', 'error'); return; }
        if (!transferToWalletId) { showToast('กรุณาเลือกกระเป๋าปลายทาง', 'error'); openWalletSelectModal('to'); return; }
        
        tx = { id: editingId || generateID(), type: 'transfer', amount: amountValue, date: dateInput.value, fromWalletId: wId, toWalletId: transferToWalletId, detail: dText, text: 'โอนเงินระหว่างกระเป๋า' };
    } else {
        if (!selectedCategoryObj) { showToast('กรุณาเลือกหมวดหมู่', 'error'); openCategoryModal(); return; }
        let text = selectedCategoryObj.label === 'อื่นๆ' ? customCategoryInput.value.trim() : selectedCategoryObj.label;
        if (selectedCategoryObj.label === 'อื่นๆ' && text === '') { showToast('กรุณาระบุรายละเอียด', 'error'); customCategoryInput.focus(); return; }

        const finalAmt = type === 'expense' ? -amountValue : amountValue;
        tx = { id: editingId || generateID(), text, amount: finalAmt, date: dateInput.value, type, walletId: wId, detail: dText };
    }

    // บันทึกลง storage ให้สำเร็จก่อน ค่อยแจ้งว่าสำเร็จ
    // ถ้าเขียนไม่ได้ให้ย้อนข้อมูลในหน่วยความจำกลับ เพื่อไม่ให้หน้าจอกับข้อมูลจริงไม่ตรงกัน
    const wasEditing = !!editingId;
    const prevTransactions = transactions;
    transactions = wasEditing ? transactions.map(t => t.id === editingId ? tx : t) : [...transactions, tx];

    if (!updateLocalStorage()) {          // safeSave แจ้งเตือนผู้ใช้ให้แล้ว
        transactions = prevTransactions;
        return;
    }

    if (wasEditing) { showToast('อัปเดตรายการแล้ว'); cancelEdit(); }
    else { showToast('บันทึกรายการสำเร็จ'); resetFormPartial(); }

    const inputDate = new Date(dateInput.value); currentDisplayMonth = inputDate.getMonth(); currentDisplayYear = inputDate.getFullYear();
    updateValues(); switchTab('view-report');
}

function editTransaction(id) {
    const t = transactions.find(t => t.id === id); if(!t) return;
    editingId = id; amount.value = Math.abs(t.amount); dateInput.value = t.date; detailInput.value = t.detail || '';
    document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true; 
    
    const event = new Event('change');
    document.querySelector(`input[name="type"][value="${t.type}"]`).dispatchEvent(event);

    if (t.type === 'transfer') {
        const fw = wallets.find(w => w.id === t.fromWalletId) || wallets[0]; walletSelectionTarget = 'from'; selectWalletForForm(fw.id, fw.name);
        const tw = wallets.find(w => w.id === t.toWalletId) || wallets[1] || wallets[0]; walletSelectionTarget = 'to'; selectWalletForForm(tw.id, tw.name);
    } else {
        const w = wallets.find(w => w.id === t.walletId) || wallets[0]; walletSelectionTarget = 'from'; selectWalletForForm(w.id, w.name);
        populateCategoryModal(t.type);
        const cats = t.type === 'income' ? incomeCategories : expenseCategories;
        let matched = cats.find(c => c.label === t.text);
        if (matched) handleCategorySelect(matched); else { handleCategorySelect(cats.find(c => c.label === 'อื่นๆ')); customCategoryInput.value = t.text; }
    }

    document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-check"></i> บันทึกการแก้ไข';
    document.getElementById('submitBtn').className = "w-full bg-house-green hover:bg-house-green text-white font-bold py-3.5 px-4 rounded-card transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4 shadow-none";
    document.getElementById('cancelEditBtn').classList.remove('hidden'); switchTab('view-add');
}

function removeTransaction(id) {
    if(editingId === id) cancelEdit();
    transactions = transactions.filter(t => t.id !== id); updateLocalStorage(); updateValues(); showToast('ลบรายการแล้ว', 'info');
}

function cancelEdit() {
    editingId = null; resetFormPartial(); setDateToCurrent();
    document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกรายการ';
    document.getElementById('submitBtn').className = "w-full bg-green-accent hover:bg-starbucks-green text-white font-bold py-3.5 px-4 rounded-card transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4 shadow-none";
    document.getElementById('cancelEditBtn').classList.add('hidden');
}
function resetFormPartial() {
    amount.value = ''; detailInput.value = '';
    document.querySelector('input[name="type"][value="expense"]').checked = true;
    const event = new Event('change');
    document.querySelector('input[name="type"][value="expense"]').dispatchEvent(event);

    if(wallets.length > 0) { walletSelectionTarget = 'from'; selectWalletForForm(wallets[0].id, wallets[0].name); }
    transferToWalletId = null; 
    toWalletSelectBtn.className = "w-full px-4 py-3 rounded-card bg-white border border-hairline hover:border-transfer outline-none transition-all text-left flex justify-between items-center group";
    toWalletSelectText.innerHTML = '-- เลือกเป๋าตังปลายทาง --';
}

function updateValues() {
    document.getElementById('monthYearDisplay').innerText = `${thaiMonths[currentDisplayMonth]} ${currentDisplayYear + 543}`;
    const fTxs = transactions.filter(t => new Date(t.date).getMonth() === currentDisplayMonth && new Date(t.date).getFullYear() === currentDisplayYear);
    
    const inc = fTxs.filter(t => t.type !== 'transfer' && t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const exp = fTxs.filter(t => t.type !== 'transfer' && t.amount < 0).reduce((acc, t) => acc + t.amount, 0) * -1; 
    
    const formatAndResize = (el, val) => {
        let formatted = formatMoney(val); el.innerText = formatted;
        if(formatted.length > 12) { el.classList.remove('text-3xl', 'sm:text-4xl'); el.classList.add('text-2xl', 'sm:text-3xl'); }
        else { el.classList.remove('text-2xl', 'sm:text-3xl'); el.classList.add('text-3xl'); }
    };
    formatAndResize(money_plus, inc); formatAndResize(money_minus, exp);

    renderWalletsAndTotals(); updateCategoryBreakdown(fTxs.filter(t => t.type !== 'transfer')); updateBudgetUI(exp);
    
    // Render History List
    list.innerHTML = '';
    // เรียงใหม่ก่อนเก่า และถ้าเป็นวันเดียวกันให้รายการที่บันทึกทีหลังอยู่บนสุด
    // - เทียบวันที่แบบสตริงได้เลยเพราะเป็นรูปแบบ YYYY-MM-DD (เรียงตามตัวอักษร = เรียงตามเวลา)
    //   และเลี่ยงปัญหา timezone จากการ new Date() ไปในตัว
    // - ใช้ id เป็นตัวตัดสินเมื่อวันซ้ำกัน เพราะ generateID() เพิ่มขึ้นตามเวลาเสมอ (id มาก = ใหม่กว่า)
    let fList = [...fTxs].sort((a, b) => {
        const da = a.date || '', db = b.date || '';
        if (da !== db) return da < db ? 1 : -1;
        return (b.id || 0) - (a.id || 0);
    });
    if (currentFilter === 'income') fList = fList.filter(t => t.type !== 'transfer' && t.amount > 0);
    else if (currentFilter === 'expense') fList = fList.filter(t => t.type !== 'transfer' && t.amount < 0);
    else if (currentFilter === 'transfer') fList = fList.filter(t => t.type === 'transfer');

    if (fList.length === 0) {
        document.getElementById('listEmptyState').style.display = 'flex';
        document.querySelector('#listEmptyState p').innerText = currentFilter === 'all' ? 'ยังไม่มีรายการบัญชีในเดือนนี้' : `ไม่พบข้อมูล${FILTER_LABEL[currentFilter]}ในเดือนนี้`;
    } else {
        document.getElementById('listEmptyState').style.display = 'none';
        fList.forEach(t => {
            let isExp, wName, iconHtml, dHtml, amountStr, amountClass;

            if (t.type === 'transfer') {
                const fromName = escapeHTML(wallets.find(w => w.id === t.fromWalletId)?.name || 'ลบไปแล้ว');
                const toName = escapeHTML(wallets.find(w => w.id === t.toWalletId)?.name || 'ลบไปแล้ว');
                iconHtml = `<i class="fa-solid fa-arrow-right-arrow-left text-transfer text-lg sm:text-xl"></i>`;
                wName = `<span class="truncate text-ink-soft">${fromName}</span> <i class="fa-solid fa-arrow-right mx-1 text-ink-soft"></i> <span class="truncate text-transfer">${toName}</span>`;
                dHtml = t.detail ? `<div class="text-[11px] text-ink-soft mt-1.5 flex items-start gap-1"><i class="fa-regular fa-comment-dots mt-[2px] opacity-70"></i><span class="line-clamp-2 leading-snug">${escapeHTML(t.detail)}</span></div>` : '';
                amountStr = formatMoney(t.amount);
                amountClass = 'text-transfer ';
                isExp = false;
            } else {
                isExp = t.amount < 0; 
                wName = `<span class="truncate">${escapeHTML(wallets.find(w => w.id === t.walletId)?.name || 'ลบไปแล้ว')}</span>`;
                const icon = getIconForTransaction(t.text, t.type); 
                iconHtml = icon.startsWith('fa-') ? `<i class="fa-solid ${icon} ${isExp?'text-expense ':'text-income '} text-lg sm:text-xl"></i>` : `<span class="text-xl sm:text-2xl">${icon}</span>`;
                dHtml = t.detail ? `<div class="text-[11px] text-ink-soft mt-1.5 flex items-start gap-1"><i class="fa-regular fa-comment-dots mt-[2px] opacity-70"></i><span class="line-clamp-2 leading-snug">${escapeHTML(t.detail)}</span></div>` : '';
                amountStr = `${isExp?'-':'+'}${formatMoney(Math.abs(t.amount))}`;
                amountClass = isExp ? 'text-expense ' : 'text-income ';
            }
            
            const bgIconClass = t.type==='transfer' ? 'bg-gold-lightest ' : (isExp?'bg-cat-brick-bg ':'bg-green-light ');

            list.insertAdjacentHTML('beforeend', `
                <li onclick="toggleTxActions(${t.id})" class="relative bg-white p-3.5 sm:p-4 rounded-card mb-3 cursor-pointer select-none shadow-card">
                    <div class="flex justify-between items-start gap-2">
                        <div class="flex items-start gap-3 flex-1 min-w-0">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-card ${bgIconClass} flex items-center justify-center flex-shrink-0 border border-white mt-0.5">${iconHtml}</div>
                            <div class="flex flex-col min-w-0 flex-1">
                                <p class="font-bold text-ink truncate text-sm sm:text-base leading-tight">${escapeHTML(t.text)}</p>
                                <div class="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-ink-soft mt-1.5">
                                    <span class="flex items-center bg-ceramic px-2 py-0.5 rounded-xs min-w-0 max-w-full"><i class="fa-solid fa-wallet opacity-60 mr-1.5"></i>${wName}</span>
                                    <span class="text-ink-soft">&bull;</span><span class="whitespace-nowrap">${formatDateDisplay(t.date)}</span>
                                </div>
                                ${dHtml}
                            </div>
                        </div>
                        <div class="flex flex-col items-end justify-start flex-shrink-0 ml-2">
                            <span class="font-bold ${amountClass} whitespace-nowrap text-sm sm:text-lg tracking-tight">${amountStr}</span>
                            <div class="p-4 -mt-2 -mr-4"><div class="p-2 w-8 h-8 flex items-center justify-center"><i class="fa-solid fa-ellipsis text-ink-soft text-base opacity-60 px-2"></i></div></div>
                        </div>
                    </div>
                    
                    <!-- Hidden Actions Container -->
                    <div id="tx-actions-${t.id}" class="tx-actions-container hidden justify-end items-center gap-2 mt-3 pt-3 border-t border-hairline" onclick="event.stopPropagation()">
                        <button onclick="editTransaction(${t.id})" class="flex-1 sm:flex-none px-4 py-2.5 rounded-pill bg-green-light text-green-accent hover:bg-green-light flex items-center justify-center transition-colors font-bold text-sm gap-2"><i class="fa-solid fa-pen"></i> แก้ไข</button>
                        <button onclick="removeTransaction(${t.id})" class="flex-1 sm:flex-none px-4 py-2.5 rounded-pill bg-cat-brick-bg text-expense hover:bg-cat-brick-bg flex items-center justify-center transition-colors font-bold text-sm gap-2"><i class="fa-solid fa-trash"></i> ลบ</button>
                    </div>
                </li>`);
        });
    }
}


// --- ย่อ/กางการ์ดสรุปตามหมวดหมู่ ---
// จำสถานะไว้ใน localStorage เพื่อไม่ให้กางกลับเองทุกครั้งที่เปิดแอป
const BREAKDOWN_CARDS = ['incomeBreakdownCard', 'expenseBreakdownCard'];

function toggleBreakdown(cardId) {
    const el = document.getElementById(cardId);
    if (!el) return;
    const collapsed = el.dataset.collapsed !== 'true'; // สถานะใหม่หลังกด
    setBreakdownCollapsed(el, collapsed);
    const state = safeParse('breakdownCollapsed', {});
    state[cardId] = collapsed;
    safeSave('breakdownCollapsed', state);
}

function setBreakdownCollapsed(el, collapsed) {
    el.dataset.collapsed = collapsed ? 'true' : 'false';
    const btn = el.querySelector('button[aria-expanded]');
    if (btn) btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function restoreBreakdownState() {
    const state = safeParse('breakdownCollapsed', {});
    BREAKDOWN_CARDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) setBreakdownCollapsed(el, state[id] === true);
    });
}

function updateCategoryBreakdown(txs) {
    const inList = document.getElementById('incomeBreakdownList'); const exList = document.getElementById('expenseBreakdownList');
    inList.innerHTML = ''; exList.innerHTML = '';
    const renderCat = (items, listEl, emptyEl, type) => {
        if (items.length === 0) { emptyEl.classList.remove('hidden'); emptyEl.classList.add('flex'); return; }
        emptyEl.classList.add('hidden'); emptyEl.classList.remove('flex');
        let totals = {}, sum = 0;
        items.forEach(t => { const amt = Math.abs(t.amount); totals[t.text] = (totals[t.text] || 0) + amt; sum += amt; });
        Object.entries(totals).sort((a,b) => b[1]-a[1]).forEach(([name, amt]) => {
            const icon = getIconForTransaction(name, type); const isInc = type === 'income';
            const iconHtml = icon.startsWith('fa-') ? `<i class="fa-solid ${icon} ${isInc?'text-income ':'text-expense '}"></i>` : `<span>${icon}</span>`;
            listEl.insertAdjacentHTML('beforeend', `
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-3 flex-1 truncate pr-4">
                        <div class="w-8 h-8 flex items-center justify-center ${isInc?'bg-green-light ':'bg-cat-brick-bg '} rounded-xs shrink-0">${iconHtml}</div>
                        <span class="text-ink truncate font-semibold">${escapeHTML(name)}</span>
                    </div>
                    <div class="flex flex-col items-end"><span class="font-bold ${isInc?'text-income ':'text-expense '}">${formatMoney(amt)}</span><span class="text-xs font-medium text-ink-soft">${((amt/sum)*100).toFixed(1)}%</span></div>
                </div>`);
        });
    };
    renderCat(txs.filter(t => t.amount > 0), inList, document.getElementById('incomeBreakdownEmpty'), 'income');
    renderCat(txs.filter(t => t.amount < 0), exList, document.getElementById('expenseBreakdownEmpty'), 'expense');
}

function openBudgetModal() {
    document.getElementById('budgetModalSubtitle').innerText = `สำหรับเดือน ${thaiMonths[currentDisplayMonth]} ${currentDisplayYear + 543}`;
    document.getElementById('budgetInput').value = budgets[`${currentDisplayYear}-${String(currentDisplayMonth + 1).padStart(2, '0')}`] || '';
    toggleModal('budgetModal', true); setTimeout(() => document.getElementById('budgetInput').focus(), 100);
}
function closeBudgetModal() { toggleModal('budgetModal', false); }
function saveBudget() {
    const val = parseFloat(document.getElementById('budgetInput').value); const key = `${currentDisplayYear}-${String(currentDisplayMonth + 1).padStart(2, '0')}`;
    const prevBudgets = { ...budgets };
    const removing = !(!isNaN(val) && val > 0);
    if (removing) delete budgets[key]; else budgets[key] = val;
    if (!safeSave('budgets', budgets)) { budgets = prevBudgets; return; }
    showToast(removing ? 'ลบงบประมาณแล้ว' : 'อัปเดตงบประมาณแล้ว', removing ? 'info' : 'success');
    closeBudgetModal(); updateValues();
}
function updateBudgetUI(expense) {
    const b = budgets[`${currentDisplayYear}-${String(currentDisplayMonth + 1).padStart(2, '0')}`];
    const bar = document.getElementById('budgetProgressBar'), text = document.getElementById('budgetStatusText');
    if (b) {
        document.getElementById('budgetDisplay').innerText = formatMoney(b); let pct = (expense / b) * 100;
        bar.style.width = `${Math.min(pct, 100)}%`; text.innerText = `ใช้ไป ${pct.toFixed(1)}% ของงบประมาณ`;
        bar.className = `h-4 rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-expense' : pct >= 70 ? 'bg-warn' : 'bg-green-accent'}`;
        text.className = `text-sm font-medium text-right ${pct >= 90 ? 'text-expense ' : 'text-ink-soft '}`;
    } else {
        document.getElementById('budgetDisplay').innerText = "ยังไม่ได้ตั้งงบ"; bar.style.width = `0%`; bar.className = 'bg-hairline h-4 rounded-full transition-all duration-500';
        text.innerText = `ไม่มีงบประมาณที่กำหนดไว้`; text.className = 'text-sm font-medium text-ink-soft text-right';
    }
}

// Settings Logic
function openNicknameModal() { document.getElementById('nicknameInput').value = nickname; toggleModal('nicknameModal', true); }
function closeNicknameModal() { toggleModal('nicknameModal', false); }
function saveNickname() {
    const val = document.getElementById('nicknameInput').value.trim();
    if(val) {
        const prevNick = nickname;
        nickname = val;
        if (!safeSave('nickname', nickname)) { nickname = prevNick; return; }
        document.getElementById('headerNickname').innerText = nickname; document.getElementById('displayNickname').innerText = nickname;
        showToast('อัปเดตชื่อเล่นเรียบร้อย'); closeNicknameModal();
    } else showToast('กรุณากรอกชื่อเล่น', 'error');
}


// --- Backup & Restore (A1): Export / Import ไฟล์ JSON ---
const BACKUP_APP_ID = 'minttracker';
const BACKUP_VERSION = 1;

function exportData() {
    // รวมข้อมูลทั้งหมดเป็นก้อนเดียว พร้อม metadata เพื่อให้ตรวจสอบไฟล์ตอนกู้คืนได้
    const payload = {
        app: BACKUP_APP_ID,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: { wallets, transactions, budgets, nickname }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const t = new Date();
    const stamp = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const a = document.createElement('a');
    a.href = url; a.download = `minttracker-backup-${stamp}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // จำวันที่สำรองล่าสุด ไว้ใช้เตือนเมื่อเว้นนานเกินไป
    safeSave('lastExportAt', new Date().toISOString());
    localStorage.removeItem('backupReminderSnoozedAt');
    dismissBackupReminder();
    renderBackupStatus();

    showToast('สำรองข้อมูลเรียบร้อย');
}

// --- ระบบเตือนให้สำรองข้อมูล ---
// เหตุผล: ข้อมูลอยู่ใน localStorage เท่านั้น ถ้าล้างเบราว์เซอร์/เปลี่ยนเครื่องจะหายหมด
// และ iOS อาจลบข้อมูลเว็บอัตโนมัติถ้าไม่ได้เปิดแอปนาน — backup ที่ไม่เคยกดเท่ากับไม่มี
const BACKUP_REMIND_AFTER_DAYS = 30;   // เตือนเมื่อไม่ได้สำรองเกินกี่วัน
const BACKUP_SNOOZE_DAYS = 7;          // กด "ไว้ทีหลัง" แล้วเงียบไปกี่วัน

function daysSince(iso) {
    if (!iso) return Infinity;
    const t = Date.parse(iso);
    if (isNaN(t)) return Infinity;
    return (Date.now() - t) / 86400000;
}

function renderBackupStatus() {
    const el = document.getElementById('backupStatusText');
    if (!el) return;
    const last = localStorage.getItem('lastExportAt');
    if (!last) { el.innerText = 'ยังไม่เคยสำรองข้อมูล'; el.className = 'text-xs text-gold mt-0.5'; return; }
    const d = Math.floor(daysSince(last));
    const label = d <= 0 ? 'วันนี้' : `${d} วันที่แล้ว`;
    const stale = d >= BACKUP_REMIND_AFTER_DAYS;
    el.innerText = `สำรองล่าสุด: ${label}`;
    el.className = stale ? 'text-xs text-gold mt-0.5' : 'text-xs text-ink-soft mt-0.5';
}

function dismissBackupReminder() {
    const el = document.getElementById('backupReminder');
    if (el) el.remove();
}

function snoozeBackupReminder() {
    safeSave('backupReminderSnoozedAt', new Date().toISOString());
    dismissBackupReminder();
}

function checkBackupReminder() {
    if (transactions.length === 0) return;                                  // ยังไม่มีข้อมูลก็ไม่ต้องเตือน
    if (daysSince(localStorage.getItem('lastExportAt')) < BACKUP_REMIND_AFTER_DAYS) return;
    if (daysSince(localStorage.getItem('backupReminderSnoozedAt')) < BACKUP_SNOOZE_DAYS) return;
    if (document.getElementById('backupReminder')) return;

    const last = localStorage.getItem('lastExportAt');
    const msg = last ? `ไม่ได้สำรองข้อมูลมา ${Math.floor(daysSince(last))} วันแล้ว` : 'คุณยังไม่เคยสำรองข้อมูลเลย';

    const bar = document.createElement('div');
    bar.id = 'backupReminder';
    bar.className = 'fixed bottom-24 left-4 right-4 mx-auto max-w-md z-[80] bg-white border border-gold rounded-card p-4 flex items-center gap-3 shadow-lg animate-fade-in';
    bar.innerHTML =
        '<div class="w-10 h-10 rounded-full bg-gold-lightest text-gold flex items-center justify-center shrink-0">' +
        '<i class="fa-solid fa-shield-halved"></i></div>' +
        '<div class="min-w-0 flex-1">' +
        '<p class="font-bold text-ink text-sm">' + escapeHTML(msg) + '</p>' +
        '<p class="text-xs text-ink-soft">ข้อมูลเก็บในเครื่องเท่านั้น หากล้างเบราว์เซอร์จะหายถาวร</p></div>' +
        '<button id="backupNowBtn" class="shrink-0 px-4 py-2 rounded-pill bg-gold hover:bg-gold text-white font-bold text-sm transition-colors">สำรอง</button>' +
        '<button id="backupLaterBtn" aria-label="ไว้ทีหลัง" class="shrink-0 w-8 h-8 rounded-full text-ink-soft hover:text-ink transition-colors">' +
        '<i class="fa-solid fa-xmark"></i></button>';
    document.body.appendChild(bar);
    document.getElementById('backupNowBtn').addEventListener('click', exportData);
    document.getElementById('backupLaterBtn').addEventListener('click', snoozeBackupReminder);
}

function importData() { document.getElementById('importFileInput').click(); }

function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        let parsed;
        try { parsed = JSON.parse(ev.target.result); }
        catch (err) { showToast('ไฟล์เสียหายหรือไม่ใช่ไฟล์ JSON', 'error'); e.target.value = ''; return; }

        // ตรวจว่าเป็นไฟล์สำรองของแอปนี้จริง และโครงสร้างข้อมูลถูกต้อง ก่อนยอมให้กู้คืน
        const d = parsed && parsed.data;
        const valid = parsed && parsed.app === BACKUP_APP_ID && d &&
            Array.isArray(d.wallets) && d.wallets.length > 0 &&
            Array.isArray(d.transactions) &&
            typeof d.budgets === 'object' && d.budgets !== null && !Array.isArray(d.budgets);
        if (!valid) { showToast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของแอปนี้', 'error'); e.target.value = ''; return; }

        openConfirmModal(
            '<i class="fa-solid fa-cloud-arrow-up text-transfer"></i> กู้คืนข้อมูล',
            `พบ ${d.wallets.length} กระเป๋าเงิน และ ${d.transactions.length} รายการในไฟล์นี้ การกู้คืนจะแทนที่ข้อมูลปัจจุบันทั้งหมด ยืนยันหรือไม่?`,
            'bg-house-green hover:bg-house-green ',
            () => {
                wallets = d.wallets;
                transactions = d.transactions;
                budgets = d.budgets;
                nickname = (typeof d.nickname === 'string' && d.nickname.trim()) ? d.nickname : 'ผู้ใช้งาน';

                const savedAll = safeSave('wallets', wallets) && safeSave('transactions', transactions)
                              && safeSave('budgets', budgets) && safeSave('nickname', nickname);
                if (!savedAll) return;   // safeSave แจ้งเตือนแล้ว อย่าบอกว่ากู้คืนสำเร็จ

                document.getElementById('headerNickname').innerText = nickname;
                if (document.getElementById('displayNickname')) document.getElementById('displayNickname').innerText = nickname;
                currentSelectedWalletId = wallets[0].id;

                updateValues();
                showToast('กู้คืนข้อมูลเรียบร้อย');
            }
        );
        e.target.value = ''; // เคลียร์ค่าเพื่อให้เลือกไฟล์เดิมซ้ำได้อีกครั้ง
    };
    reader.onerror = () => { showToast('อ่านไฟล์ไม่สำเร็จ', 'error'); e.target.value = ''; };
    reader.readAsText(file);
}

function clearAllData() {
    openConfirmModal(
        '<i class="fa-solid fa-triangle-exclamation text-expense"></i> ล้างข้อมูลทั้งหมด',
        'ข้อมูลประวัติและเป๋าตังทั้งหมดจะถูกลบทิ้ง และกู้คืนไม่ได้!',
        'bg-expense hover:bg-expense ',
        () => { localStorage.clear(); showToast('ล้างข้อมูลเรียบร้อย กำลังเริ่มระบบ...', 'info'); setTimeout(() => location.reload(), 1000); }
    );
}

// Helpers & Listeners
function formatMoney(n) { return '฿' + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'); }
function formatDateDisplay(dStr) { const d=new Date(dStr); return `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear()+543}`; }
function generateID() {
    // ID เรียงเพิ่มขึ้นเสมอ (อิงเวลาปัจจุบัน + ตัวนับกันชนภายในมิลลิวินาทีเดียวกัน) จึงไม่มีทางซ้ำ
    // ต่างจากเดิมที่สุ่มเลขซึ่งมีโอกาสชนกันแล้วทำให้แก้ไข/ลบผิดรายการ; ยังเป็นตัวเลขเหมือนเดิมจึงเข้ากันได้กับข้อมูลเก่า
    const now = Date.now();
    generateID._last = now > generateID._last ? now : generateID._last + 1;
    return generateID._last;
}
generateID._last = 0;
function updateLocalStorage() { return safeSave('transactions', transactions); }
function getIconForTransaction(text, type) {
    // ค้นในชุดที่ตรงกับประเภทรายการก่อน แล้วค่อยค้นชุดรวมเผื่อข้อมูลเก่าที่ type ไม่ตรง
    // (เดิมค้นชุดรวมอย่างเดียว ถ้าวันหลังมีชื่อหมวดซ้ำกันทั้งฝั่งรับและจ่ายจะได้ไอคอนผิด)
    const own = (type === 'income' ? incomeCategories : expenseCategories).find(c => c.label === text);
    const found = own || [...incomeCategories, ...expenseCategories].find(c => c.label === text);
    return found ? found.icon : (type === 'income' ? 'fa-sack-dollar' : 'fa-basket-shopping');
}

// กด Escape เพื่อปิดหน้าต่างที่เปิดอยู่ (ไล่จากชั้นบนสุดลงล่าง ตามลำดับ z-index)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const stack = [
        ['confirmModal', closeConfirmModal],
        ['categoryModal', closeCategoryModal],
        ['walletSelectModal', closeWalletSelectModal],
        ['walletModal', closeWalletModal],
        ['budgetModal', closeBudgetModal],
        ['nicknameModal', closeNicknameModal]
    ];
    for (const [id, close] of stack) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) { close(); return; }
    }
});

// Auto-close open action menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tx-actions-container') && !e.target.closest('li[onclick^="toggleTxActions"]')) {
        document.querySelectorAll('.tx-actions-container').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex'); });
    }
    if (!e.target.closest('.wallet-actions-container') && !e.target.closest('div[onclick^="toggleWalletActions"]')) {
        document.querySelectorAll('.wallet-actions-container').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex'); });
    }
});

function toggleTxActions(id) {
    document.querySelectorAll('.tx-actions-container').forEach(el => { if(el.id !== `tx-actions-${id}`) { el.classList.add('hidden'); el.classList.remove('flex'); } });
    const el = document.getElementById(`tx-actions-${id}`);
    if (el.classList.contains('hidden')) { el.classList.remove('hidden'); el.classList.add('flex'); } else { el.classList.add('hidden'); el.classList.remove('flex'); }
}

function toggleWalletActions(id) {
    document.querySelectorAll('.wallet-actions-container').forEach(el => { if(el.id !== `wallet-actions-${id}`) { el.classList.add('hidden'); el.classList.remove('flex'); } });
    const el = document.getElementById(`wallet-actions-${id}`);
    if (el.classList.contains('hidden')) { el.classList.remove('hidden'); el.classList.add('flex'); } else { el.classList.add('hidden'); el.classList.remove('flex'); }
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 right-4 ${type==='success'?'bg-income ':type==='error'?'bg-expense ':'bg-house-green '} text-white px-6 py-3 rounded-card shadow-xl transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-3 z-[200] font-medium border border-white/10`;
    t.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check-circle':'fa-info-circle'} text-xl"></i> ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.remove('translate-y-10', 'opacity-0'), 10);
    setTimeout(() => { t.classList.add('translate-y-10', 'opacity-0'); setTimeout(() => t.remove(), 300); }, 3000);
}

document.getElementById('prevMonthBtn').addEventListener('click', () => { currentDisplayMonth--; if(currentDisplayMonth < 0) { currentDisplayMonth = 11; currentDisplayYear--; } updateValues(); });
document.getElementById('nextMonthBtn').addEventListener('click', () => { currentDisplayMonth++; if(currentDisplayMonth > 11) { currentDisplayMonth = 0; currentDisplayYear++; } updateValues(); });
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-ceramic text-ink-soft hover:bg-hairline transition-colors filter-btn');
        e.target.className = 'px-3 py-1.5 rounded-full text-xs font-semibold bg-green-light text-starbucks-green transition-colors filter-btn';
        currentFilter = FILTER_BY_ID[e.target.id] || 'all'; updateValues();
    });
});

form.addEventListener('submit', addTransaction);
document.getElementById('importFileInput').addEventListener('change', handleImportFile);

function init() {
    document.getElementById('headerNickname').innerText = nickname; if(document.getElementById('displayNickname')) document.getElementById('displayNickname').innerText = nickname;
    
    const currentTypeRadio = document.querySelector('input[name="type"]:checked');
    if (currentTypeRadio) {
        const event = new Event('change');
        currentTypeRadio.dispatchEvent(event);
    }
    
    updateValues();
    restoreBreakdownState();
    renderBackupStatus();
    checkBackupReminder();
}
init();
