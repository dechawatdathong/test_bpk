/* ============================================================
   1) วางค่า Firebase config ของคุณตรงนี้
   วิธีได้ค่านี้: console.firebase.google.com → สร้างโปรเจกต์ (ฟรี)
   → Build → Firestore Database → Create database (เลือก "test mode" ก่อนก็ได้)
   → กลับหน้า Project settings → Your apps → เลือก "Web" (</>)
   → คัดลอกค่า firebaseConfig มาแปะแทนตรงนี้
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCPMeZuwO_5360YBU4hpfFhnyDumaCVsCU",
  authDomain: "tesco-web-app.firebaseapp.com",
  projectId: "tesco-web-app",
  storageBucket: "tesco-web-app.firebasestorage.app",
  messagingSenderId: "373186748503",
  appId: "1:373186748503:web:ee22c8b71f69c69eaac312",
  measurementId: "G-ZZSRWKR3BW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const increment = firebase.firestore.FieldValue.increment;
const arrayUnion = firebase.firestore.FieldValue.arrayUnion;

const cloudRef = db.collection('bangpakong').doc('wordcloud');
const pollRef  = db.collection('bangpakong').doc('poll');

const POLL_OPTIONS = [
  { id:'strongly_agree', label:'เห็นด้วยอย่างยิ่ง' },
  { id:'agree',          label:'เห็นด้วย' },
  { id:'improve',        label:'เห็นด้วย แต่ควรปรับปรุงบางส่วน' },
  { id:'disagree',       label:'ไม่เห็นด้วย' }
];

let activeTab = 'cloud';
let selectedOption = null;
let hasVoted = false;
let latestCloudData = {};
let latestPollData = { votes:{}, feedback:[] };

function switchTab(tab){
  activeTab = tab;
  document.getElementById('tab-btn-cloud').classList.toggle('active', tab==='cloud');
  document.getElementById('tab-btn-poll').classList.toggle('active', tab==='poll');
  document.getElementById('panel-cloud').classList.toggle('active', tab==='cloud');
  document.getElementById('panel-poll').classList.toggle('active', tab==='poll');
}

// ---------------- Word cloud ----------------
function renderCloud(data){
  latestCloudData = data;
  const frame = document.getElementById('cloud-frame');
  const entries = Object.entries(data);
  frame.innerHTML = '';
  if(entries.length === 0){
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'ยังไม่มีคำตอบ — เป็นคนแรกที่พิมพ์คำตอบได้เลย';
    frame.appendChild(p);
    document.getElementById('cloud-total').textContent = 'ยังไม่มีผู้ตอบ';
    return;
  }
  entries.sort((a,b)=> b[1]-a[1]);
  const maxCount = entries[0][1];
  const totalResponses = entries.reduce((s,[,c])=>s+c,0);
  const minSize = 15, maxSize = 46;
  const palette = ['#0E5C6B','#3FA7B3','#C97E2A','#0A4550'];
  entries.forEach(([word,count],i)=>{
    const span = document.createElement('span');
    span.className = 'cloud-word';
    const size = minSize + (count/maxCount)*(maxSize-minSize);
    span.style.fontSize = size.toFixed(0)+'px';
    span.style.color = palette[i % palette.length];
    span.textContent = word;
    span.title = count + ' ครั้ง';
    frame.appendChild(span);
  });
  document.getElementById('cloud-total').textContent = 'คำตอบทั้งหมด ' + totalResponses + ' รายการ · ' + entries.length + ' คำ';
}

async function submitWord(){
  const input = document.getElementById('word-input');
  const word = input.value.trim().replace(/\s+/g,' ').replace(/\./g,'');
  if(!word) return;
  const btn = document.getElementById('word-submit');
  btn.disabled = true;
  try{
    await cloudRef.set({ words: { [word]: increment(1) } }, { merge:true });
    input.value = '';
  }catch(e){
    console.error('ส่งคำตอบไม่สำเร็จ', e);
    alert('ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }finally{
    btn.disabled = false;
    input.focus();
  }
}

document.getElementById('word-submit').addEventListener('click', submitWord);
document.getElementById('word-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') submitWord();
});

// ---------------- Poll ----------------
function buildPollOptions(){
  const wrap = document.getElementById('poll-options');
  wrap.innerHTML = '';
  POLL_OPTIONS.forEach(opt=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.setAttribute('role','radio');
    btn.setAttribute('aria-checked','false');
    btn.dataset.id = opt.id;
    const dot = document.createElement('span');
    dot.className = 'dot';
    const label = document.createElement('span');
    label.textContent = opt.label;
    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener('click', ()=> selectOption(opt.id));
    wrap.appendChild(btn);
  });
}

function selectOption(id){
  if(hasVoted) return;
  selectedOption = id;
  document.querySelectorAll('#poll-options .option').forEach(el=>{
    const on = el.dataset.id === id;
    el.classList.toggle('selected', on);
    el.setAttribute('aria-checked', on ? 'true':'false');
  });
  document.getElementById('feedback-wrap').classList.toggle('open', id === 'improve');
  document.getElementById('poll-submit').disabled = false;
}

function renderPoll(data){
  latestPollData = data;
  const votes = data.votes || {};
  const total = Object.values(votes).reduce((s,c)=>s+c,0);
  const results = document.getElementById('poll-results');
  results.innerHTML = '';
  if(total === 0){
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.style.textAlign = 'left';
    p.style.padding = '4px 0';
    p.textContent = 'ยังไม่มีผู้ลงคะแนน';
    results.appendChild(p);
  }else{
    POLL_OPTIONS.forEach((opt,i)=>{
      const count = votes[opt.id] || 0;
      const pct = total ? Math.round((count/total)*100) : 0;
      const row = document.createElement('div');
      row.className = 'bar-row';
      const labelRow = document.createElement('div');
      labelRow.className = 'bar-label';
      const name = document.createElement('span');
      name.textContent = opt.label;
      const count_pct = document.createElement('span');
      count_pct.className = 'count';
      count_pct.textContent = count + ' เสียง · ' + pct + '%';
      labelRow.appendChild(name);
      labelRow.appendChild(count_pct);
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill pos-' + i;
      track.appendChild(fill);
      row.appendChild(labelRow);
      row.appendChild(track);
      results.appendChild(row);
      requestAnimationFrame(()=>{ fill.style.width = pct + '%'; });
    });
  }
  document.getElementById('poll-total').textContent = total ? ('ผู้ลงคะแนนทั้งหมด ' + total + ' คน') : 'ยังไม่มีผู้ลงคะแนน';
}

async function submitVote(){
  if(!selectedOption || hasVoted) return;
  const btn = document.getElementById('poll-submit');
  btn.disabled = true;
  try{
    const update = { votes: { [selectedOption]: increment(1) } };
    if(selectedOption === 'improve'){
      const text = document.getElementById('feedback-text').value.trim();
      if(text) update.feedback = arrayUnion(text);
    }
    await pollRef.set(update, { merge:true });
    hasVoted = true;
    document.getElementById('voted-note').style.display = 'block';
    document.getElementById('poll-submit').style.display = 'none';
    document.querySelectorAll('#poll-options .option').forEach(el=> el.style.cursor='default');
  }catch(e){
    console.error('ส่งคำตอบไม่สำเร็จ', e);
    alert('ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    btn.disabled = false;
  }
}

document.getElementById('poll-submit').addEventListener('click', submitVote);

async function resetData(which){
  const label = which === 'cloud' ? 'คำตอบเวิร์ดคลาวด์' : 'ผลโหวตทั้งหมด';
  if(!confirm('ยืนยันล้าง' + label + '? ใช้สำหรับเริ่มกิจกรรมรอบใหม่เท่านั้น')) return;
  try{
    if(which === 'cloud'){
      await cloudRef.set({ words:{} });
    }else{
      await pollRef.set({ votes:{}, feedback:[] });
      hasVoted = false; selectedOption = null;
      document.getElementById('voted-note').style.display = 'none';
      document.getElementById('poll-submit').style.display = 'block';
      document.getElementById('poll-submit').disabled = true;
      document.querySelectorAll('#poll-options .option').forEach(el=>{
        el.classList.remove('selected'); el.setAttribute('aria-checked','false');
      });
      document.getElementById('feedback-wrap').classList.remove('open');
    }
  }catch(e){
    alert('ล้างข้อมูลไม่สำเร็จ กรุณาลองใหม่');
  }
}

// ---------------- Export to Excel ----------------
function exportCloudExcel(){
  const entries = Object.entries(latestCloudData).sort((a,b)=> b[1]-a[1]);
  if(entries.length === 0){ alert('ยังไม่มีข้อมูลให้ส่งออก'); return; }
  const rows = [['คำตอบ','จำนวนครั้งที่ถูกพิมพ์']].concat(entries);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:30},{wch:20}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'เวิร์ดคลาวด์');
  XLSX.writeFile(wb, 'เวิร์ดคลาวด์-ปัญหาน้ำ-บางปะกง.xlsx');
}

function exportPollExcel(){
  const votes = latestPollData.votes || {};
  const feedback = latestPollData.feedback || [];
  const total = Object.values(votes).reduce((s,c)=>s+c,0);
  if(total === 0 && feedback.length === 0){ alert('ยังไม่มีข้อมูลให้ส่งออก'); return; }

  const summaryRows = [['ตัวเลือก','จำนวนเสียง','ร้อยละ']];
  POLL_OPTIONS.forEach(opt=>{
    const count = votes[opt.id] || 0;
    const pct = total ? Math.round((count/total)*100) : 0;
    summaryRows.push([opt.label, count, pct + '%']);
  });
  summaryRows.push(['รวมทั้งหมด', total, '100%']);
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{wch:36},{wch:14},{wch:10}];

  const feedbackRows = [['ข้อเสนอแนะเพิ่มเติม (จากผู้ที่เลือก "ควรปรับปรุงบางส่วน")']];
  if(feedback.length === 0){ feedbackRows.push(['— ไม่มีข้อเสนอแนะเพิ่มเติม —']); }
  else{ feedback.forEach(f=> feedbackRows.push([f])); }
  const ws2 = XLSX.utils.aoa_to_sheet(feedbackRows);
  ws2['!cols'] = [{wch:70}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'สรุปผลโหวต');
  XLSX.utils.book_append_sheet(wb, ws2, 'ข้อเสนอแนะ');
  XLSX.writeFile(wb, 'ผลโหวต-วิสัยทัศน์-บางปะกง.xlsx');
}

// ---------------- Init + real-time listeners ----------------
buildPollOptions();

cloudRef.onSnapshot(
  doc => renderCloud(doc.exists ? (doc.data().words || {}) : {}),
  err => console.error('เชื่อมต่อ Firestore ไม่สำเร็จ (wordcloud):', err)
);

pollRef.onSnapshot(
  doc => renderPoll(doc.exists ? doc.data() : { votes:{}, feedback:[] }),
  err => console.error('เชื่อมต่อ Firestore ไม่สำเร็จ (poll):', err)
);
