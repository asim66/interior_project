/* shared.js — data helpers, currency/date utils, storage backend, constants */
const KEY='studio_ledger_v1';
const BACKUP_KEY=KEY+'_last_good';
const SCHEMA_VERSION=2;

let STORAGE_MODE='memory';
let REMOTE_VERSION=0;
let SAVE_CHAIN=Promise.resolve(true);

let MEM=null;



export async function loadData(){
  if(typeof window!=='undefined'&&typeof fetch==='function'){
    try{
      const response=await fetch('/api/ledger',{cache:'no-store'});
      if(response.ok){
        const remote=await response.json();
        STORAGE_MODE='cloud';
        REMOTE_VERSION=Number(remote.version)||0;
        if(remote.data){
          try{localStorage.setItem(KEY,JSON.stringify(remote.data));}catch(e){}
          return remote.data;
        }
        const cached=readLocalData();
        const initial = cached || normalizeData(EMPTY_DATA);
        await saveData(initial, 'System');
        return initial;
      }
    }catch(e){}
  }
  try{ if(typeof window!=='undefined' && window.storage){ STORAGE_MODE='claude';
        const r=await window.storage.get(KEY); return (r&&r.value)?JSON.parse(r.value):null; } }
  catch(e){ STORAGE_MODE='claude'; return null; }
  try{ if(typeof localStorage!=='undefined'){ localStorage.setItem('__t','1'); localStorage.removeItem('__t');
        STORAGE_MODE='local'; const v=localStorage.getItem(KEY);
        if(!v)return null;
        try{return JSON.parse(v);}catch(e){
          const backup=localStorage.getItem(BACKUP_KEY);
          return backup?JSON.parse(backup):null;
        } } }catch(e){}
  STORAGE_MODE='memory'; return MEM;
}

export async function saveData(d, actorName = 'Studio Member'){
  if(STORAGE_MODE==='cloud'){
    try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}
    SAVE_CHAIN=SAVE_CHAIN.catch(()=>false).then(async()=>{
      const response=await fetch('/api/ledger',{
        method:'PUT',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({data:d,expectedVersion:REMOTE_VERSION,actorName})
      });
      if(!response.ok)return false;
      const result=await response.json();
      REMOTE_VERSION=Number(result.version)||REMOTE_VERSION+1;
      return true;
    });
    return SAVE_CHAIN;
  }
  if(STORAGE_MODE==='claude'){ try{ await window.storage.set(KEY,JSON.stringify(d)); return true; }catch(e){} }
  if(STORAGE_MODE==='local'){ try{
    const current=localStorage.getItem(KEY);
    if(current)localStorage.setItem(BACKUP_KEY,current);
    localStorage.setItem(KEY,JSON.stringify(d));
    return true;
  }catch(e){} }
  MEM=d; return STORAGE_MODE!=='memory';
}

export function startCloudSync(onSyncData, intervalMs = 5000) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return () => {};
  const timer = setInterval(async () => {
    if (STORAGE_MODE !== 'cloud') return;
    try {
      const response = await fetch('/api/ledger', { cache: 'no-store' });
      if (response.ok) {
        const remote = await response.json();
        const newVersion = Number(remote.version) || 0;
        if (newVersion > REMOTE_VERSION && remote.data) {
          REMOTE_VERSION = newVersion;
          try { localStorage.setItem(KEY, JSON.stringify(remote.data)); } catch (e) {}
          if (typeof onSyncData === 'function') {
            onSyncData(remote.data, remote.updatedBy);
          }
        }
      }
    } catch (e) {}
  }, intervalMs);
  return () => clearInterval(timer);
}

export const uid=(p='id')=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

export const localDateKey=date=>{
  const d=date||new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};

export const today=()=>localDateKey(new Date());

export function fmt(n,cur){const c=cur||'INR';try{return new Intl.NumberFormat(c==='INR'?'en-IN':'en-US',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(n)||0);}catch(e){return String(n);}}

export const curSym={INR:'₹',USD:'$',EUR:'€',GBP:'£',AED:'د.إ'};

export function dstr(d){if(!d)return'—';const x=new Date(d+'T00:00:00');return x.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}

export function monthKey(d){return d?d.slice(0,7):'';}

export const sum=(a,f)=>a.reduce((s,x)=>{
  const v=typeof f==='function'?f(x):f?x[f]:x;
  return s+(Number(v)||0);
},0);

export const roundMoney=n=>Math.round(((Number(n)||0)+Number.EPSILON)*100)/100;

export function invTotal(inv){
  const sub=roundMoney(sum(inv.items||[],it=>roundMoney((Number(it.qty)||0)*(Number(it.rate)||0))));
  const disc=Math.min(sub,Math.max(0,roundMoney(inv.discount)));
  const taxable=roundMoney(Math.max(0,sub-disc));
  const tax=roundMoney(taxable*(Math.max(0,Number(inv.taxRate)||0)/100));
  return{sub,disc,tax,total:roundMoney(taxable+tax)};
}

export const isActivePayment=payment=>!payment?.reversedAt;

export function getPaymentsReceived(data){
  return (data?.paymentsReceived||[]).filter(isActivePayment);
}

export function invReceived(inv,pr){
  return sum(pr.filter(p=>isActivePayment(p)&&p.invoiceId===inv.id),'amount');
}

export function invoiceBalance(inv,pr){
  return Math.max(0,invTotal(inv).total-invReceived(inv,pr));
}

export function accountsReceivable(data,projectId){
  return sum(
    (data?.invoices||[]).filter(inv=>
      inv.status!=='draft'&&(!projectId||inv.projectId===projectId)
    ),
    inv=>invoiceBalance(inv,data?.paymentsReceived||[])
  );
}

export function invStatus(inv,pr){
  const {total}=invTotal(inv); const rec=invReceived(inv,pr);
  if(inv.status==='draft')return{k:'draft',c:'gray',t:'Draft'};
  if(rec>=total-0.01&&total>0)return{k:'paid',c:'green',t:'Paid'};
  if(rec>0)return{k:'partial',c:'brass',t:'Partial'};
  if(inv.dueDate&&inv.dueDate<today())return{k:'overdue',c:'clay',t:'Overdue'};
  return{k:'sent',c:'amber',t:'Sent'};
}

export function expensePaid(exp,pm){
  return sum(pm.filter(p=>isActivePayment(p)&&p.expenseId===exp.id),'amount');
}

export function getPaymentsMade(data){
  return (data?.paymentsMade||[]).filter(isActivePayment);
}

export function expenseBalance(exp,pm){
  return Math.max(0,(Number(exp.amount)||0)-expensePaid(exp,pm));
}

export function accountsPayable(data,projectId){
  const vendorPayable=sum(
    (data?.expenses||[]).filter(exp=>!projectId||exp.projectId===projectId),
    exp=>expenseBalance(exp,data?.paymentsMade||[])
  );
  return vendorPayable+pettyPayableTotal(data,projectId);
}

export function projectHasFinancialHistory(data,projectId){
  return (data?.invoices||[]).some(x=>x.projectId===projectId)
    ||(data?.expenses||[]).some(x=>x.projectId===projectId)
    ||(data?.paymentsReceived||[]).some(x=>x.projectId===projectId)
    ||(data?.paymentsMade||[]).some(x=>x.projectId===projectId)
    ||(data?.materialRequests||[]).some(x=>x.projectId===projectId)
    ||(data?.pettyExpenses||[]).some(x=>x.projectId===projectId)
    ||(data?.estimates||[]).some(x=>x.projectId===projectId)
    ||(data?.milestones||[]).some(x=>x.projectId===projectId)
    ||(data?.collectionActivities||[]).some(x=>x.projectId===projectId)
    ||(data?.vendorBills||[]).some(b=>(b.lines||[]).some(x=>x.projectId===projectId));
}

export function vendorHasFinancialHistory(data,vendorId){
  return (data?.expenses||[]).some(x=>x.vendorId===vendorId)
    ||(data?.paymentsMade||[]).some(x=>x.vendorId===vendorId)
    ||(data?.vendorBills||[]).some(x=>x.vendorId===vendorId);
}

export function invoiceHasPaymentHistory(data,invoiceId){
  return (data?.paymentsReceived||[]).some(x=>x.invoiceId===invoiceId)
    ||(data?.collectionActivities||[]).some(x=>x.invoiceId===invoiceId);
}

export function expenseHasPaymentHistory(data,expenseId){
  return (data?.paymentsMade||[]).some(x=>x.expenseId===expenseId);
}

export function hasProtectedHistory(data){
  return [
    'invoices','expenses','paymentsReceived','paymentsMade','materialRequests',
    'vendorBills','pettyExpenses','estimates','milestones','collectionActivities'
  ].some(key=>(data?.[key]||[]).length>0);
}

export function mergeLedgerData(current,incoming){
  const safeCurrent=normalizeData(current);
  const safeIncoming=normalizeData(incoming);
  const collections=[
    'projects','vendors','expenses','invoices','paymentsReceived','paymentsMade',
    'supervisors','materialRequests','vendorBills','pettyExpenses','estimates',
    'milestones','collectionActivities'
  ];
  const merged={...safeCurrent};
  collections.forEach(key=>{
    const existing=new Set((safeCurrent[key]||[]).map(record=>record.id));
    merged[key]=[...(safeCurrent[key]||[]),...(safeIncoming[key]||[]).filter(record=>!existing.has(record.id))];
  });
  return normalizeData(merged);
}

export function expenseStatus(exp,pm){
  const paid=expensePaid(exp,pm);
  const balance=expenseBalance(exp,pm);
  if((Number(exp.amount)||0)>0&&balance<=0.01)return{key:'paid',c:'green',t:'Paid'};
  if(paid>0)return{key:'partial',c:'brass',t:'Partial'};
  if(exp.dueDate&&exp.dueDate<today())return{key:'overdue',c:'clay',t:'Overdue'};
  if(exp.dueDate&&exp.dueDate<=today())return{key:'due',c:'amber',t:'Due'};
  return{key:'open',c:'gray',t:'Open'};
}

export const NAV=[
  ['dashboard','◱','Dashboard'],['projects','▤','Projects'],['estimates','▧','Estimates'],
  ['procurement','▦','Procurement'],['schedule','◫','Schedule'],['invoices','❋','Invoices'],
  ['collections','◎','Collections'],['expenses','▾','Expenses'],['vendors','⬡','Vendors'],
  ['payments','⇄','Payments'],['settings','⚙','Settings']
];

export const EXP_CATS=['Materials','Labour','Furniture','Fixtures & fittings','Lighting','Transport','Subcontractor','Site expenses','Studio overhead','Software','Marketing','Other'];

export const VEN_CATS=['Supplier','Carpenter','Electrician','Plumber','Painter','Fabricator','Furniture','Lighting','Textiles','Flooring','Contractor','Freelancer','Other'];

export const UNITS=['nos','sq ft','running ft','m','sq m','kg','litre','lot','day','hour'];

export const REQUEST_STATUSES=['submitted','approved','ordered','part-delivered','delivered','rejected'];

export const MILESTONE_STATUSES=['not-started','in-progress','blocked','completed'];

export const normalizeCategories=cats=>Array.from(new Set((cats||[]).map(c=>String(c||'').trim()).filter(Boolean)));

export function getVendorCategories(data){
  const saved=data?.settings?.vendorCategories;
  const configured=Array.isArray(saved)?saved:VEN_CATS;
  const used=(data?.vendors||[]).map(v=>v.category);
  const categories=normalizeCategories([...configured,...used]);
  return categories.length?categories:['Other'];
}

export const SESSION_USER_KEY = 'studio_ledger_session_user_v1';

export const DEFAULT_USERS = [
  { id: 'usr_owner', name: 'Studio Owner', email: 'owner@studiovista.in', role: 'super_admin', roleLabel: 'Studio Owner / Super Admin', pin: '9999', avatar: 'SO', color: '#f59e0b' },
  { id: 'usr_admin', name: 'Ananya Sharma', email: 'admin@studiovista.in', role: 'admin', roleLabel: 'Principal Architect', pin: '1234', avatar: 'AS', color: '#6366f1' },
  { id: 'usr_designer', name: 'Rahul Verma', email: 'designer@studiovista.in', role: 'designer', roleLabel: 'Senior Designer', pin: '1234', avatar: 'RV', color: '#ec4899' },
  { id: 'usr_supervisor', name: 'Vikram Singh', email: 'site@studiovista.in', role: 'site_supervisor', roleLabel: 'Site Supervisor', pin: '1234', avatar: 'VS', color: '#10b981' },
  { id: 'usr_finance', name: 'Priya Mehta', email: 'finance@studiovista.in', role: 'finance', roleLabel: 'Finance Lead', pin: '1234', avatar: 'PM', color: '#f59e0b' },
];

export function isSuperAdmin(user) {
  return user?.role === 'super_admin';
}

export function isAdmin(user) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export function canManageUsers(user) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export function loadSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY) || sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveSession(user, remember = true) {
  if (typeof window === 'undefined') return;
  try {
    const str = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(SESSION_USER_KEY, str);
    } else {
      sessionStorage.setItem(SESSION_USER_KEY, str);
    }
  } catch (e) {}
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
  } catch (e) {}
}

export const EMPTY_DATA={
  schemaVersion:SCHEMA_VERSION,
  users: [...DEFAULT_USERS],
  projects:[],vendors:[],expenses:[],invoices:[],paymentsReceived:[],paymentsMade:[],
  supervisors:[],materialRequests:[],vendorBills:[],pettyExpenses:[],estimates:[],milestones:[],collectionActivities:[],
  settings:{studioName:'Your Studio',address:'',currency:'INR',taxLabel:'GST',taxRate:18,invPrefix:'INV-',invSeq:1,vendorCategories:[...VEN_CATS]}};

export function normalizeData(d){
  const merged={...EMPTY_DATA,...(d||{})};
  const settings={...EMPTY_DATA.settings,...((d&&d.settings)||{})};
  const rawUsers = Array.isArray(merged.users) && merged.users.length > 0 ? merged.users : DEFAULT_USERS;
  const users = rawUsers.map(u => ({
    id: u.id || uid('usr'),
    name: u.name || 'Studio Member',
    email: u.email || 'user@studio-ledger.com',
    role: u.role || 'designer',
    roleLabel: u.roleLabel || 'Team Member',
    pin: u.pin || '1234',
    avatar: u.avatar || (u.name ? u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'SM'),
    color: u.color || '#6366f1',
  }));
  const projects=Array.isArray(merged.projects)?merged.projects:[];
  const vendors=Array.isArray(merged.vendors)?merged.vendors:[];
  const projectIds=new Set(projects.map(p=>p.id));
  const vendorIds=new Set(vendors.map(v=>v.id));
  const expenses=Array.isArray(merged.expenses)?merged.expenses.map(e=>{
    const {status,...expense}=e||{};
    return{
      ...expense,
      projectId:expense.projectId&&projectIds.has(expense.projectId)?expense.projectId:'',
      vendorId:expense.vendorId&&vendorIds.has(expense.vendorId)?expense.vendorId:''
    };
  }):[];
  const invoices=Array.isArray(merged.invoices)?merged.invoices.map(inv=>({
    ...inv,
    projectId:inv.projectId&&projectIds.has(inv.projectId)?inv.projectId:''
  })):[];
  const expenseIds=new Set(expenses.map(e=>e.id));
  const invoiceIds=new Set(invoices.map(i=>i.id));
  const paymentsReceived=Array.isArray(merged.paymentsReceived)?merged.paymentsReceived.map(p=>({
    ...p,
    projectId:p.projectId&&projectIds.has(p.projectId)?p.projectId:'',
    invoiceId:p.invoiceId&&invoiceIds.has(p.invoiceId)?p.invoiceId:''
  })):[];
  const paymentsMade=Array.isArray(merged.paymentsMade)?merged.paymentsMade.map(p=>({
    ...p,
    projectId:p.projectId&&projectIds.has(p.projectId)?p.projectId:'',
    vendorId:p.vendorId&&vendorIds.has(p.vendorId)?p.vendorId:'',
    expenseId:p.expenseId&&expenseIds.has(p.expenseId)?p.expenseId:''
  })):[];
  const supervisors=Array.isArray(merged.supervisors)?merged.supervisors:[];
  const supervisorIds=new Set(supervisors.map(s=>s.id));
  const materialRequests=Array.isArray(merged.materialRequests)?merged.materialRequests.map(r=>({
    ...r,
    projectId:r.projectId&&projectIds.has(r.projectId)?r.projectId:'',
    supervisorId:r.supervisorId&&supervisorIds.has(r.supervisorId)?r.supervisorId:'',
    items:Array.isArray(r.items)?r.items:[]
  })):[];
  const requestIds=new Set(materialRequests.map(r=>r.id));
  const vendorBills=Array.isArray(merged.vendorBills)?merged.vendorBills.map(b=>({
    ...b,
    vendorId:b.vendorId&&vendorIds.has(b.vendorId)?b.vendorId:'',
    lines:Array.isArray(b.lines)?b.lines.map(line=>({
      ...line,
      projectId:line.projectId&&projectIds.has(line.projectId)?line.projectId:'',
      expenseId:line.expenseId&&expenseIds.has(line.expenseId)?line.expenseId:'',
      materialRequestId:line.materialRequestId&&requestIds.has(line.materialRequestId)?line.materialRequestId:''
    })):[]
  })):[];
  const pettyExpenses=Array.isArray(merged.pettyExpenses)?merged.pettyExpenses.map(exp=>({
    ...exp,
    projectId:exp.projectId&&projectIds.has(exp.projectId)?exp.projectId:'',
    supervisorId:exp.supervisorId&&supervisorIds.has(exp.supervisorId)?exp.supervisorId:''
  })):[];
  const estimates=Array.isArray(merged.estimates)?merged.estimates.map(est=>({
    ...est,
    projectId:est.projectId&&projectIds.has(est.projectId)?est.projectId:'',
    lines:Array.isArray(est.lines)?est.lines:[]
  })):[];
  const milestones=Array.isArray(merged.milestones)?merged.milestones.map(m=>({
    ...m,
    projectId:m.projectId&&projectIds.has(m.projectId)?m.projectId:'',
    ownerId:m.ownerId&&supervisorIds.has(m.ownerId)?m.ownerId:''
  })):[];
  const collectionActivities=Array.isArray(merged.collectionActivities)?merged.collectionActivities.map(a=>({
    ...a,
    projectId:a.projectId&&projectIds.has(a.projectId)?a.projectId:'',
    invoiceId:a.invoiceId&&invoiceIds.has(a.invoiceId)?a.invoiceId:''
  })):[];
  return{
    ...merged,
    schemaVersion:SCHEMA_VERSION,
    users,supervisors,materialRequests,vendorBills,pettyExpenses,estimates,milestones,collectionActivities,
    projects,
    vendors,
    expenses,
    invoices,
    paymentsReceived,
    paymentsMade,
    settings:{
      ...settings,
      vendorCategories:getVendorCategories({settings,vendors})
    }
  };
}

export function rollup(pid,d){
  const inv=d.invoices.filter(i=>i.projectId===pid&&i.status!=='draft');
  const invoiced=sum(inv,i=>invTotal(i).total);
  const received=sum(getPaymentsReceived(d).filter(p=>p.projectId===pid),'amount');
  const expenses=sum(d.expenses.filter(e=>e.projectId===pid),'amount')+pettyExpenseTotal(d,pid);
  const paidOut=sum(getPaymentsMade(d).filter(p=>p.projectId===pid),'amount')+pettyPaidTotal(d,pid);
  return{invoiced,received,expenses,paidOut,
    receivable:accountsReceivable(d,pid),
    payable:accountsPayable(d,pid),
    profit:invoiced-expenses};
}

export const isApprovedPetty=exp=>['approved','reimbursed'].includes(exp?.status);

export function pettyExpenseTotal(data,projectId){
  return sum(
    (data?.pettyExpenses||[]).filter(exp=>isApprovedPetty(exp)&&(!projectId||exp.projectId===projectId)),
    'amount'
  );
}

export function pettyPaidTotal(data,projectId){
  return sum(
    (data?.pettyExpenses||[]).filter(exp=>exp.status==='reimbursed'&&(!projectId||exp.projectId===projectId)),
    'amount'
  );
}

export function pettyPayableTotal(data,projectId){
  return sum(
    (data?.pettyExpenses||[]).filter(exp=>exp.status==='approved'&&(!projectId||exp.projectId===projectId)),
    'amount'
  );
}

export function vendorBillTotal(bill){
  return roundMoney(sum(bill?.lines||[],line=>{
    const base=(Number(line.qty)||0)*(Number(line.rate)||0);
    return roundMoney(base+base*(Math.max(0,Number(line.taxRate)||0)/100));
  }));
}

export function materialRequestEstimate(request){
  return sum(request?.items||[],item=>(Number(item.qty)||0)*(Number(item.estimatedRate)||0));
}

export function estimateTotal(estimate){
  const contingency=(Number(estimate?.contingencyPct)||0)/100;
  if(estimate?.type==='rough'){
    const execution=(Number(estimate.area)||0)*(Number(estimate.baseRate)||0);
    const design=Number(estimate.designFee)||0;
    return execution+(execution*contingency)+design;
  }
  const subtotal=sum(estimate?.lines||[],line=>{
    const cost=(Number(line.qty)||0)*((Number(line.materialRate)||0)+(Number(line.labourRate)||0));
    return cost+(cost*((Number(line.markupPct)||0)/100));
  });
  return subtotal+(subtotal*contingency)+(Number(estimate?.designFee)||0);
}

export function latestEstimate(data,projectId){
  const estimates=(data?.estimates||[])
    .filter(e=>e.projectId===projectId&&e.status!=='superseded')
    .sort((a,b)=>(Number(b.version)||0)-(Number(a.version)||0));
  return estimates.find(e=>e.status==='approved')||estimates[0]||null;
}

export function projectCostControl(data,projectId){
  const estimate=latestEstimate(data,projectId);
  const budget=estimate?estimateTotal(estimate):Number((data?.projects||[]).find(p=>p.id===projectId)?.budget)||0;
  const actual=sum((data?.expenses||[]).filter(e=>e.projectId===projectId),'amount')+pettyExpenseTotal(data,projectId);
  const billedByRequest={};
  (data?.vendorBills||[]).forEach(bill=>(bill.lines||[]).forEach(line=>{
    if(!line.materialRequestId)return;
    const base=(Number(line.qty)||0)*(Number(line.rate)||0);
    billedByRequest[line.materialRequestId]=(billedByRequest[line.materialRequestId]||0)+base+(base*((Number(line.taxRate)||0)/100));
  }));
  const pendingRequests=sum(
    (data?.materialRequests||[]).filter(r=>r.projectId===projectId&&!['delivered','rejected'].includes(r.status)),
    request=>Math.max(0,materialRequestEstimate(request)-(billedByRequest[request.id]||0))
  );
  const forecast=actual+pendingRequests;
  return{estimate,budget,actual,pendingRequests,forecast,variance:budget-forecast};
}

export function milestoneHealth(milestone){
  if(milestone.status==='completed')return{key:'completed',c:'green',t:'Completed'};
  if(milestone.status==='blocked')return{key:'blocked',c:'clay',t:'Blocked'};
  if(milestone.plannedEnd&&milestone.plannedEnd<today())return{key:'overdue',c:'clay',t:'Overdue'};
  if(milestone.status==='in-progress')return{key:'in-progress',c:'brass',t:'In progress'};
  return{key:'not-started',c:'gray',t:'Not started'};
}

export function overdueInvoices(data){
  return (data?.invoices||[]).filter(inv=>{
    const st=invStatus(inv,data?.paymentsReceived||[]);
    return st.k==='overdue'||st.k==='partial';
  });
}

export const METHODS=['Bank transfer','UPI','Cash','Cheque','Card','Other'];

export function loadSample(setData){
  const p1=uid('prj'),p2=uid('prj'),p3=uid('prj');
  const v1=uid('ven'),v2=uid('ven'),v3=uid('ven');
  const i1=uid('inv'),i2=uid('inv'),i3=uid('inv');
  const e1=uid('exp'),e2=uid('exp'),e3=uid('exp'),e4=uid('exp'),e5=uid('exp');
  const s1=uid('sup'),s2=uid('sup'),r1=uid('req'),b1=uid('bill');
  const d=n=>{const x=new Date();x.setDate(x.getDate()-n);return localDateKey(x);};
  setData(prev=>({
    ...EMPTY_DATA, settings:prev.settings,
    projects:[
      {id:p1,name:'Kapoor Residence — Full Home',client:'Anaya Kapoor',clientEmail:'anaya.k@email.com',clientPhone:'+91 98111 22334',address:'A-402, Palm Meadows\nBengaluru',status:'active',budget:1800000,startDate:d(60),notes:'3BHK turnkey. Priority on living & kitchen.'},
      {id:p2,name:'Verma Cafe — Interiors',client:'Rohit Verma',clientEmail:'rohit@vermacafe.in',clientPhone:'+91 90000 55667',address:'Shop 7, MG Road\nPune',status:'active',budget:900000,startDate:d(35),notes:'Industrial-warm theme, 1400 sqft.'},
      {id:p3,name:'Sethi Office Cabin',client:'Priya Sethi',clientEmail:'',clientPhone:'',address:'Cyber Tower, Hyderabad',status:'completed',budget:350000,startDate:d(120),notes:''},
    ],
    vendors:[
      {id:v1,name:'Woodcraft Interiors',category:'Carpenter',contact:'Suresh',phone:'+91 98220 11223',email:'',notes:'Custom joinery.'},
      {id:v2,name:'Lumina Lighting Co.',category:'Lighting',contact:'Meera',phone:'+91 99887 66554',email:'sales@lumina.in',notes:''},
      {id:v3,name:'StoneHouse Marbles',category:'Supplier',contact:'Farhan',phone:'',email:'orders@stonehouse.in',notes:'Italian marble.'},
    ],
    supervisors:[
      {id:s1,name:'Arjun Nayak',phone:'+91 98765 21001',email:'',role:'Site supervisor',active:true},
      {id:s2,name:'Kavita Rao',phone:'+91 98765 21002',email:'',role:'Project manager',active:true},
    ],
    invoices:[
      {id:i1,number:'INV-001',projectId:p1,date:d(55),dueDate:d(40),status:'sent',taxRate:18,discount:0,notes:'50% advance on project value.',items:[{desc:'Design & concept fee',qty:1,rate:250000},{desc:'Advance — execution (50%)',qty:1,rate:400000}]},
      {id:i2,number:'INV-002',projectId:p2,date:d(30),dueDate:d(-5),status:'sent',taxRate:18,discount:0,notes:'Milestone 1.',items:[{desc:'Design fee',qty:1,rate:150000},{desc:'Furniture advance',qty:1,rate:200000}]},
      {id:i3,number:'INV-003',projectId:p3,date:d(100),dueDate:d(85),status:'sent',taxRate:18,discount:0,notes:'Final invoice.',items:[{desc:'Turnkey cabin fit-out',qty:1,rate:350000}]},
    ],
    paymentsReceived:[
      {id:uid('pay'),projectId:p1,invoiceId:i1,amount:767000,date:d(52),method:'Bank transfer',reference:'NEFT-9921',notes:''},
      {id:uid('pay'),projectId:p3,invoiceId:i3,amount:413000,date:d(80),method:'Cheque',reference:'CHQ-114',notes:'Full & final.'},
      {id:uid('pay'),projectId:p2,invoiceId:i2,amount:200000,date:d(20),method:'UPI',reference:'UPI-5567',notes:'Partial.'},
    ],
    expenses:[
      {id:e1,projectId:p1,vendorId:v1,billId:b1,category:'Labour',description:'Living room TV unit & wardrobe',amount:145000,date:d(30),dueDate:d(20)},
      {id:e2,projectId:p1,vendorId:v3,category:'Materials',description:'Marble flooring — living',amount:98000,date:d(25),dueDate:d(-5)},
      {id:e3,projectId:p1,vendorId:v2,category:'Lighting',description:'Profile & pendant lights',amount:62000,date:d(18),dueDate:d(10)},
      {id:e4,projectId:p2,vendorId:v1,billId:b1,category:'Furniture',description:'Cafe seating & counters',amount:180000,date:d(15),dueDate:d(-7)},
      {id:e5,projectId:p3,vendorId:v1,category:'Labour',description:'Cabin joinery',amount:120000,date:d(90),dueDate:d(75)},
    ],
    paymentsMade:[
      {id:uid('pay'),projectId:p1,vendorId:v1,expenseId:e1,amount:145000,date:d(28),method:'Bank transfer',reference:'',notes:''},
      {id:uid('pay'),projectId:p1,vendorId:v2,expenseId:e3,amount:62000,date:d(16),method:'UPI',reference:'',notes:''},
      {id:uid('pay'),projectId:p3,vendorId:v1,expenseId:e5,amount:120000,date:d(88),method:'Cash',reference:'',notes:''},
    ],
    materialRequests:[
      {id:r1,number:'MR-0001',projectId:p1,supervisorId:s1,date:d(12),requiredBy:d(-3),priority:'urgent',status:'approved',notes:'Required before ceiling closure.',
        items:[{id:uid('mri'),description:'BWP plywood 19mm',category:'Materials',qty:24,unit:'nos',estimatedRate:3200},{id:uid('mri'),description:'Soft-close channels',category:'Fixtures & fittings',qty:18,unit:'nos',estimatedRate:1100}]}
    ],
    vendorBills:[
      {id:b1,vendorId:v1,invoiceNumber:'WCI-1842',date:d(30),dueDate:d(7),notes:'Combined invoice for two active sites.',lines:[
        {id:uid('vbl'),expenseId:e1,projectId:p1,materialRequestId:'',description:'Living room TV unit & wardrobe',category:'Labour',qty:1,unit:'lot',rate:145000,taxRate:0},
        {id:uid('vbl'),expenseId:e4,projectId:p2,materialRequestId:'',description:'Cafe seating & counters',category:'Furniture',qty:1,unit:'lot',rate:180000,taxRate:0},
      ]}
    ],
    pettyExpenses:[
      {id:uid('petty'),projectId:p1,supervisorId:s1,date:d(4),description:'Site fasteners and masking tape',category:'Site expenses',amount:1850,paymentMethod:'Cash',receiptRef:'PETTY-104',notes:'',status:'approved',approvedAt:new Date().toISOString()}
    ],
    estimates:[
      {id:uid('est'),projectId:p1,type:'rough',version:1,status:'superseded',date:d(70),area:1800,finishLevel:'premium',baseRate:2200,designFee:250000,contingencyPct:10,assumptions:'Pre-design area-based budget.',exclusions:'Loose appliances.',lines:[]},
      {id:uid('est'),projectId:p1,type:'detailed',version:1,status:'approved',date:d(50),area:0,finishLevel:'premium',baseRate:0,designFee:250000,contingencyPct:8,approvedAt:new Date().toISOString(),assumptions:'Issued after measured floor plan.',exclusions:'Loose appliances.',lines:[
        {id:uid('boq'),room:'Living',description:'Custom TV wall and storage',category:'Furniture',qty:1,unit:'lot',materialRate:360000,labourRate:95000,markupPct:15},
        {id:uid('boq'),room:'Kitchen',description:'Modular kitchen',category:'Furniture',qty:1,unit:'lot',materialRate:520000,labourRate:140000,markupPct:15},
      ]}
    ],
    milestones:[
      {id:uid('mile'),projectId:p1,ownerId:s1,name:'False ceiling and first-fix electrical',plannedStart:d(18),plannedEnd:d(3),actualEnd:'',status:'blocked',progress:75,blocker:'Pendant-light specification awaiting client approval',notes:''},
      {id:uid('mile'),projectId:p2,ownerId:s2,name:'Cafe furniture installation',plannedStart:d(8),plannedEnd:d(-6),actualEnd:'',status:'in-progress',progress:55,blocker:'',notes:''},
    ],
    collectionActivities:[
      {id:uid('collect'),invoiceId:i2,projectId:p2,date:d(2),type:'promise',promiseDate:d(-2),note:'Client committed to clear the milestone balance after site review.'}
    ],
  }));
}

export function getStorageMode(){ return STORAGE_MODE; }

function readLocalData(){
  try{
    const value=localStorage.getItem(KEY);
    if(!value)return null;
    try{return JSON.parse(value);}catch(e){
      const backup=localStorage.getItem(BACKUP_KEY);
      return backup?JSON.parse(backup):null;
    }
  }catch(e){return null;}
}
