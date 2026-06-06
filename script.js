const SUPABASE_URL = 'https://aplxbsmaonlcsvxfxmvh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbHhic21hb25sY3N2eGZ4bXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTk2NjQsImV4cCI6MjA5Mzg5NTY2NH0.zZgnsGiDWvhLcTOKvyTlTRVBKmrAlr3UVxkfJ9dOe-Y';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = { masterPass: '123456', editingId: null, currentPhoto: null, symptoms: [{ id: Date.now(), dd: '', mm: '', yyyy: '', symptom: '', remedy1: '', remedy2: '' }], prefix: 'CN-', counter: 1001 };

function adjustHeight(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight) + 'px'; }
function forceResizeAll() { setTimeout(() => { document.querySelectorAll('.auto-expand').forEach(adjustHeight); }, 200); }

async function fetchClinicSettings() {
    const { data } = await _supabase.from('clinic_settings').select('*').eq('id', 'global_config').single();
    if (data) {
        state.prefix = data.prefix; state.counter = data.counter; state.masterPass = data.passcode || '123456';
        if(document.getElementById('set-prefix')) { document.getElementById('set-prefix').value = data.prefix; document.getElementById('set-counter').value = data.counter; }
    }
}

async function handleLogin() {
    const status = document.getElementById('login-status');
    status.classList.remove('hidden');
    await fetchClinicSettings();
    if (document.getElementById('login-pass').value === state.masterPass) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        renderSymptoms(); lucide.createIcons();
    } else { alert("WRONG PASSCODE"); status.classList.add('hidden'); }
}

async function updatePassword() {
    const newPass = document.getElementById('new-password').value;
    if(newPass.length < 4) return alert("Min 4 digits");
    await _supabase.from('clinic_settings').upsert({ id: 'global_config', prefix: state.prefix, counter: state.counter, passcode: newPass });
    state.masterPass = newPass; alert("Passcode Updated Everywhere");
}

async function saveClinicSettings() {
    const p = document.getElementById('set-prefix').value; const c = parseInt(document.getElementById('set-counter').value);
    await _supabase.from('clinic_settings').upsert({ id: 'global_config', prefix: p, counter: c, passcode: state.masterPass });
    state.prefix = p; state.counter = c; alert("Cloud Synced");
}

function switchTab(tab) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'entry' && !state.editingId) document.getElementById('field-caseNumber').value = state.prefix + state.counter;
    if (tab === 'dashboard') { document.getElementById('search-input').value = ""; document.getElementById('search-results').innerHTML = ""; }
    lucide.createIcons(); forceResizeAll();
}

async function handleSearch() {
    const q = document.getElementById('search-input').value.toLowerCase();
    if (q.length < 1) { document.getElementById('search-results').innerHTML = ""; return; }
    const { data } = await _supabase.from('patients').select('*').or(`full_name.ilike.%${q}%,case_number.ilike.%${q}%`);
    document.getElementById('search-results').innerHTML = data.map(r => `
        <div class="p-6 bg-white border border-[#e2d8c3] rounded-3xl flex justify-between items-center group shadow-sm transition hover:border-[#7c9082] cursor-pointer" onclick="editRecord('${r.id}')">
            <div class="flex items-center gap-5">
                <div class="w-14 h-14 rounded-2xl bg-[#f9f7f2] flex items-center justify-center font-bold text-[#7c9082] overflow-hidden">${r.data.photo ? `<img src="${r.data.photo}" class="w-full h-full object-cover">` : r.full_name[0]}</div>
                <div><div class="text-[9px] font-black text-[#7c9082] uppercase">ID: ${r.case_number}</div><div class="font-bold text-[#4a443b] text-xl">${r.full_name}</div></div>
            </div>
            <i data-lucide="chevron-right" class="text-[#dcd7c9] group-hover:text-[#7c9082]"></i>
        </div>`).join('');
    lucide.createIcons();
}

async function saveRecord() {
    const fields = ['caseNumber', 'name', 'middleName', 'surname', 'address', 'building', 'road', 'area', 'city', 'state', 'pinCode', 'mobile', 'email', 'age', 'dob', 'bloodGroup'];
    const data = { id: state.editingId || Date.now().toString(), photo: state.currentPhoto, symptoms: [...state.symptoms] };
    fields.forEach(f => { const el = document.getElementById(`field-${f}`); if(el) data[f] = el.value; });
    if(!data.name || !data.caseNumber) return alert("Missing Info");
    await _supabase.from('patients').upsert({ id: data.id, case_number: data.caseNumber, full_name: `${data.name} ${data.surname}`, data: data });
    if (!state.editingId) { state.counter++; await _supabase.from('clinic_settings').upsert({ id: 'global_config', prefix: state.prefix, counter: state.counter, passcode: state.masterPass }); }
    alert("Record Saved"); resetForm(); switchTab('dashboard');
}

async function editRecord(id) {
    const { data: r } = await _supabase.from('patients').select('*').eq('id', id).single();
    const p = r.data; state.editingId = r.id; state.currentPhoto = p.photo; state.symptoms = p.symptoms;
    document.getElementById('delete-btn-form').classList.remove('hidden');
    ['caseNumber', 'name', 'middleName', 'surname', 'address', 'building', 'road', 'area', 'city', 'state', 'pinCode', 'mobile', 'email', 'age', 'dob', 'bloodGroup'].forEach(f => {
        const el = document.getElementById(`field-${f}`); if(el) el.value = p[f] || "";
    });
    const img = document.getElementById('photo-preview');
    if(p.photo) { img.src = p.photo; img.classList.remove('hidden'); }
    renderSymptoms(); switchTab('entry'); document.getElementById('form-title').innerText = "Record: " + r.full_name;
}

async function deleteRecord(id) { if (!id || !confirm("Delete Patient Case?")) return; await _supabase.from('patients').delete().eq('id', id); resetForm(); switchTab('dashboard'); }

function renderSymptoms() {
    document.getElementById('symptom-body').innerHTML = state.symptoms.map(s => `
        <tr>
            <td class="px-6 py-2 align-top"><div class="flex gap-1"><input onchange="updSym(${s.id},'dd',this.value)" value="${s.dd}" class="w-8 border-none text-center bg-transparent" placeholder="D"><input onchange="updSym(${s.id},'mm',this.value)" value="${s.mm}" class="w-8 border-none text-center bg-transparent" placeholder="M"><input onchange="updSym(${s.id},'yyyy',this.value)" value="${s.yyyy}" class="w-12 border-none text-center bg-transparent" placeholder="Y"></div></td>
            <td class="px-6 py-2 align-top"><textarea oninput="adjustHeight(this); updSym(${s.id},'symptom',this.value)" class="auto-expand" placeholder="Describe symptoms...">${s.symptom || ""}</textarea></td>
            <td class="px-6 py-2 align-top"><textarea oninput="adjustHeight(this); updSym(${s.id},'remedy1',this.value)" class="auto-expand" placeholder="Remedy 1...">${s.remedy1 || ""}</textarea></td>
            <td class="px-6 py-2 align-top"><textarea oninput="adjustHeight(this); updSym(${s.id},'remedy2',this.value)" class="auto-expand" placeholder="Remedy 2...">${s.remedy2 || ""}</textarea></td>
            <td class="px-2 py-2 align-top text-center no-print"><button onclick="remSymRow(${s.id})" class="text-[#dcd7c9] hover:text-red-400 font-bold text-xl mt-2">×</button></td>
        </tr>`).join('');
    forceResizeAll();
}
function addSymptomRow() { state.symptoms.push({ id: Date.now(), dd: '', mm: '', yyyy: '', symptom: '', remedy1: '', remedy2: '' }); renderSymptoms(); }
function remSymRow(id) { state.symptoms = state.symptoms.filter(s => s.id !== id); renderSymptoms(); }
function updSym(id, f, v) { const s = state.symptoms.find(x => x.id === id); if(s) s[f] = v; }
function resetForm() { state.editingId = null; state.currentPhoto = null; state.symptoms = [{ id: Date.now(), dd: '', mm: '', yyyy: '', symptom: '', remedy1: '', remedy2: '' }]; document.getElementById('delete-btn-form').classList.add('hidden'); document.querySelectorAll('.beige-input').forEach(i => i.value = ""); document.getElementById('photo-preview').classList.add('hidden'); renderSymptoms(); document.getElementById('field-caseNumber').value = state.prefix + state.counter; }
function handlePhoto(input) { const file = input.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { state.currentPhoto = e.target.result; document.getElementById('photo-preview').src = e.target.result; document.getElementById('photo-preview').classList.remove('hidden'); }; reader.readAsDataURL(file); } }
function handleLogout() { location.reload(); }
async function exportToPDF() { const canvas = await html2canvas(document.getElementById('printable-record'), { backgroundColor: '#ffffff', scale: 2 }); const pdf = new jspdf.jsPDF('p', 'mm', 'a4'); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width); pdf.save("Report.pdf"); }
window.onload = () => lucide.createIcons();