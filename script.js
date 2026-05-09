// --- 1. SUPABASE CLOUD CONFIGURATION ---
const SUPABASE_URL = 'https://aplxbsmaonlcsvxfxmvh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbHhic21hb25sY3N2eGZ4bXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTk2NjQsImV4cCI6MjA5Mzg5NTY2NH0.zZgnsGiDWvhLcTOKvyTlTRVBKmrAlr3UVxkfJ9dOe-Y';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. APPLICATION STATE ---
let state = {
    password: localStorage.getItem('chcdp_pass') || '123456',
    editingId: null,
    currentPhoto: null,
    symptoms: [{ id: Date.now(), dd: '', mm: '', yyyy: '', symptom: '', remedy1: '', remedy2: '' }]
};

// --- 3. AUTHENTICATION ---
function handleLogin() {
    const input = document.getElementById('login-pass').value;
    if (input === state.password) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        renderSymptoms();
        lucide.createIcons();
    } else {
        alert("ACCESS DENIED: INCORRECT PASSCODE");
    }
}

function handleLogout() {
    if(confirm("Sign out and lock system?")) location.reload();
}

function updatePassword() {
    const p = document.getElementById('new-password').value;
    if(p.length < 4) return alert("Error: Passcode must be at least 4 digits.");
    state.password = p;
    localStorage.setItem('chcdp_pass', p);
    alert("Passcode Updated Successfully.");
    switchTab('dashboard');
}

// --- 4. NAVIGATION & SEARCH ---
function switchTab(tab) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    if(tab === 'dashboard') {
        document.getElementById('search-input').value = "";
        document.getElementById('search-results').innerHTML = "";
    }
    lucide.createIcons();
}

async function handleSearch() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const resultsDiv = document.getElementById('search-results');
    
    if (q.length < 1) { resultsDiv.innerHTML = ""; return; }

    const { data, error } = await _supabase.from('patients')
        .select('*')
        .or(`full_name.ilike.%${q}%,case_number.ilike.%${q}%`);

    if(error) return console.error(error);

    resultsDiv.innerHTML = data.map(r => `
        <div class="p-5 bg-blue-900/20 border border-blue-800/50 rounded-[2rem] flex items-center justify-between hover:bg-blue-600/10 transition cursor-pointer group shadow-lg" onclick="editRecord('${r.id}')">
            <div class="flex items-center gap-5">
                <div class="w-14 h-14 rounded-2xl bg-blue-900 flex items-center justify-center font-black text-blue-500 overflow-hidden border border-blue-800/50">
                    ${r.data.photo ? `<img src="${r.data.photo}" class="w-full h-full object-cover">` : r.full_name[0]}
                </div>
                <div>
                    <div class="text-[9px] font-black text-blue-600 uppercase tracking-widest">ID: ${r.case_number}</div>
                    <div class="font-bold text-white text-xl">${r.full_name}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="event.stopPropagation(); deleteRecord('${r.id}')" class="p-3 text-blue-800 hover:text-red-500 transition">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
                <div class="p-3 text-blue-900 group-hover:text-blue-500 transition">
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- 5. FORM LOGIC ---
function handlePhoto(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.currentPhoto = e.target.result;
            const img = document.getElementById('photo-preview');
            img.src = e.target.result;
            img.classList.remove('hidden');
            document.getElementById('photo-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function renderSymptoms() {
    const container = document.getElementById('symptom-body');
    container.innerHTML = state.symptoms.map(s => `
        <tr class="hover:bg-blue-900/10 transition">
            <td class="px-6 py-3"><div class="flex gap-1">
                <input onchange="updSym(${s.id},'dd',this.value)" value="${s.dd}" class="w-10 bg-transparent border border-blue-900/50 rounded-lg p-2 text-center" placeholder="D">
                <input onchange="updSym(${s.id},'mm',this.value)" value="${s.mm}" class="w-10 bg-transparent border border-blue-900/50 rounded-lg p-2 text-center" placeholder="M">
                <input onchange="updSym(${s.id},'yyyy',this.value)" value="${s.yyyy}" class="w-16 bg-transparent border border-blue-900/50 rounded-lg p-2 text-center" placeholder="YYYY">
            </div></td>
            <td class="px-6 py-3"><input onchange="updSym(${s.id},'symptom',this.value)" value="${s.symptom}" class="w-full bg-transparent border border-blue-900/50 rounded-lg p-2"></td>
            <td class="px-6 py-3"><input onchange="updSym(${s.id},'remedy1',this.value)" value="${s.remedy1}" class="w-full bg-transparent border border-blue-900/50 rounded-lg p-2"></td>
            <td class="px-6 py-3"><input onchange="updSym(${s.id},'remedy2',this.value)" value="${s.remedy2}" class="w-full bg-transparent border border-blue-900/50 rounded-lg p-2"></td>
            <td class="px-6 py-3 text-center no-print"><button onclick="remSymRow(${s.id})" class="text-red-900 hover:text-red-500 font-bold text-xl transition">×</button></td>
        </tr>
    `).join('');
}

function addSymptomRow() { state.symptoms.push({ id: Date.now(), dd: '', mm: '', yyyy: '', symptom: '', remedy1: '', remedy2: '' }); renderSymptoms(); }
function remSymRow(id) { state.symptoms = state.symptoms.filter(s => s.id !== id); renderSymptoms(); }
function updSym(id, f, v) { const s = state.symptoms.find(x => x.id === id); if(s) s[f] = v; }

// --- 6. CRUD OPERATIONS ---
async function saveRecord() {
    const fields = ['caseNumber', 'name', 'middleName', 'surname', 'address', 'building', 'road', 'area', 'city', 'state', 'pinCode', 'mobile', 'email', 'age', 'dob', 'bloodGroup'];
    const data = { id: state.editingId || Date.now().toString(), photo: state.currentPhoto, symptoms: [...state.symptoms] };
    fields.forEach(f => data[f] = document.getElementById(`field-${f}`).value);

    if(!data.name || !data.caseNumber) return alert("Required: Case Number & Patient Name");

    const { error } = await _supabase.from('patients').upsert({
        id: data.id,
        case_number: data.caseNumber,
        full_name: `${data.name} ${data.surname}`,
        data: data
    });

    if (error) alert("Cloud Sync Error: " + error.message);
    else { alert("Success: Record Updated in Cloud."); resetForm(); switchTab('dashboard'); }
}

async function editRecord(id) {
    const { data: r, error } = await _supabase.from('patients').select('*').eq('id', id).single();
    if(error) return alert("Database Fetch Error");
    
    const p = r.data;
    state.editingId = r.id;
    state.currentPhoto = p.photo;
    state.symptoms = p.symptoms;

    document.getElementById('delete-btn-form').classList.remove('hidden');
    const fields = ['caseNumber', 'name', 'middleName', 'surname', 'address', 'building', 'road', 'area', 'city', 'state', 'pinCode', 'mobile', 'email', 'age', 'dob', 'bloodGroup'];
    fields.forEach(f => document.getElementById(`field-${f}`).value = p[f] || "");

    const img = document.getElementById('photo-preview');
    if(p.photo) { img.src = p.photo; img.classList.remove('hidden'); document.getElementById('photo-placeholder').classList.add('hidden'); }
    else { img.classList.add('hidden'); document.getElementById('photo-placeholder').classList.remove('hidden'); }
    
    renderSymptoms();
    switchTab('entry');
    document.getElementById('form-title').innerText = "Edit: " + r.full_name;
    lucide.createIcons();
}

async function deleteRecord(id) {
    if (!id || !confirm("PERMANENT ACTION: Delete this patient record from the cloud?")) return;
    const { error } = await _supabase.from('patients').delete().eq('id', id);
    if(error) alert("Delete Error");
    else { alert("Record successfully removed."); resetForm(); switchTab('dashboard'); }
}

function resetForm() {
    state.editingId = null;
    state.currentPhoto = null;
    state.symptoms = [{ id: Date.now(), dd: '', mm: '', yyyy: '', symptom: '', remedy1: '', remedy2: '' }];
    document.getElementById('delete-btn-form').classList.add('hidden');
    document.querySelectorAll('.blue-input').forEach(i => i.value = "");
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('photo-placeholder').classList.remove('hidden');
    document.getElementById('form-title').innerText = "Patient Case Record";
    renderSymptoms();
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(document.getElementById('printable-record'), { backgroundColor: '#020617', scale: 2 });
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`Patient_Case_${Date.now()}.pdf`);
}

// Initialize Lucide Icons
window.onload = () => lucide.createIcons();