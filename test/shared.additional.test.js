import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_DATA,
  accountsPayable,
  dstr,
  estimateTotal,
  expenseBalance,
  expenseStatus,
  getVendorCategories,
  invStatus,
  invTotal,
  isApprovedPetty,
  latestEstimate,
  loadSample,
  materialRequestEstimate,
  mergeLedgerData,
  monthKey,
  normalizeCategories,
  normalizeData,
  overdueInvoices,
  pettyExpenseTotal,
  pettyPaidTotal,
  pettyPayableTotal,
  projectCostControl,
  rollup,
  sum,
  uid,
  vendorBillTotal,
} from '../src/shared.js';

const baseInvoice=(overrides={})=>({
  id:'inv_1',
  projectId:'prj_1',
  status:'sent',
  items:[{desc:'Design',qty:2,rate:500}],
  discount:0,
  taxRate:0,
  ...overrides,
});

const baseLedger=(overrides={})=>({
  projects:[{id:'prj_1',budget:2000}],
  vendors:[{id:'ven_1'}],
  invoices:[],
  expenses:[],
  paymentsReceived:[],
  paymentsMade:[],
  pettyExpenses:[],
  estimates:[],
  materialRequests:[],
  vendorBills:[],
  ...overrides,
});

test('invoice totals round line items and apply capped discounts before tax',()=>{
  assert.deepEqual(invTotal({
    items:[{qty:3,rate:0.335},{qty:'2',rate:'10'}],
    discount:5,
    taxRate:18,
  }),{
    sub:21.01,
    disc:5,
    tax:2.88,
    total:18.89,
  });

  assert.deepEqual(invTotal({
    items:[{qty:1,rate:100}],
    discount:500,
    taxRate:-18,
  }),{sub:100,disc:100,tax:0,total:0});
});

test('invoice status covers draft, paid, partial, overdue, and sent states',()=>{
  const invoice=baseInvoice();
  assert.equal(invStatus({...invoice,status:'draft'},[]).k,'draft');
  assert.equal(invStatus(invoice,[{invoiceId:invoice.id,amount:1000}]).k,'paid');
  assert.equal(invStatus(invoice,[{invoiceId:invoice.id,amount:100}]).k,'partial');
  assert.equal(invStatus({...invoice,dueDate:'2000-01-01'},[]).k,'overdue');
  assert.equal(invStatus({...invoice,dueDate:'2099-01-01'},[]).k,'sent');
});

test('reversed receipts do not change invoice status',()=>{
  const invoice=baseInvoice({dueDate:'2000-01-01'});
  const status=invStatus(invoice,[{
    invoiceId:invoice.id,
    amount:1000,
    reversedAt:'2026-01-01T00:00:00.000Z',
  }]);
  assert.equal(status.k,'overdue');
});

test('expense balance and status cover paid, partial, overdue, due, and open states',()=>{
  const expense={id:'exp_1',amount:500};
  assert.equal(expenseBalance(expense,[{expenseId:expense.id,amount:800}]),0);
  assert.equal(expenseStatus(expense,[{expenseId:expense.id,amount:500}]).key,'paid');
  assert.equal(expenseStatus(expense,[{expenseId:expense.id,amount:100}]).key,'partial');
  assert.equal(expenseStatus({...expense,dueDate:'2000-01-01'},[]).key,'overdue');

  const today=new Date();
  const todayKey=[
    today.getFullYear(),
    String(today.getMonth()+1).padStart(2,'0'),
    String(today.getDate()).padStart(2,'0'),
  ].join('-');
  assert.equal(expenseStatus({...expense,dueDate:todayKey},[]).key,'due');
  assert.equal(expenseStatus({...expense,dueDate:'2099-01-01'},[]).key,'open');
});

test('reversed vendor payments do not reduce expense balances',()=>{
  const expense={id:'exp_1',amount:500};
  const payment={
    expenseId:expense.id,
    amount:500,
    reversedAt:'2026-01-01T00:00:00.000Z',
  };
  assert.equal(expenseBalance(expense,[payment]),500);
  assert.equal(expenseStatus(expense,[payment]).key,'open');
});

test('petty cash helpers separate approved, reimbursed, and payable totals',()=>{
  const ledger=baseLedger({pettyExpenses:[
    {id:'p1',projectId:'prj_1',status:'submitted',amount:10},
    {id:'p2',projectId:'prj_1',status:'approved',amount:20},
    {id:'p3',projectId:'prj_1',status:'reimbursed',amount:30},
    {id:'p4',projectId:'prj_2',status:'approved',amount:40},
  ]});

  assert.equal(isApprovedPetty({status:'submitted'}),false);
  assert.equal(isApprovedPetty({status:'approved'}),true);
  assert.equal(isApprovedPetty({status:'reimbursed'}),true);
  assert.equal(pettyExpenseTotal(ledger,'prj_1'),50);
  assert.equal(pettyPaidTotal(ledger,'prj_1'),30);
  assert.equal(pettyPayableTotal(ledger,'prj_1'),20);
  assert.equal(accountsPayable(ledger,'prj_1'),20);
});

test('rollup includes petty cash once and calculates project profit',()=>{
  const ledger=baseLedger({
    invoices:[baseInvoice()],
    expenses:[{id:'exp_1',projectId:'prj_1',amount:300}],
    paymentsReceived:[{projectId:'prj_1',invoiceId:'inv_1',amount:400}],
    paymentsMade:[{projectId:'prj_1',expenseId:'exp_1',amount:100}],
    pettyExpenses:[
      {projectId:'prj_1',status:'approved',amount:50},
      {projectId:'prj_1',status:'reimbursed',amount:25},
    ],
  });

  assert.deepEqual(rollup('prj_1',ledger),{
    invoiced:1000,
    received:400,
    expenses:375,
    paidOut:125,
    receivable:600,
    payable:250,
    profit:625,
  });
});

test('latest estimate prefers an approved revision and ignores superseded revisions',()=>{
  const ledger=baseLedger({estimates:[
    {id:'draft-v3',projectId:'prj_1',version:3,status:'draft'},
    {id:'approved-v2',projectId:'prj_1',version:2,status:'approved'},
    {id:'approved-v4-old',projectId:'prj_1',version:4,status:'superseded'},
  ]});
  assert.equal(latestEstimate(ledger,'prj_1').id,'approved-v2');
  assert.equal(latestEstimate(ledger,'missing'),null);
});

test('cost control uses an approved estimate as the budget baseline',()=>{
  const approved={
    id:'est_1',
    projectId:'prj_1',
    type:'rough',
    version:1,
    status:'approved',
    area:10,
    baseRate:100,
    contingencyPct:10,
    designFee:50,
  };
  const control=projectCostControl(baseLedger({
    projects:[{id:'prj_1',budget:9999}],
    estimates:[approved],
  }),'prj_1');

  assert.equal(estimateTotal(approved),1150);
  assert.equal(control.budget,1150);
  assert.equal(control.variance,1150);
});

test('cost control excludes delivered and rejected material requests from forecast',()=>{
  const request=status=>({
    id:`req_${status}`,
    projectId:'prj_1',
    status,
    items:[{qty:2,estimatedRate:100}],
  });
  const control=projectCostControl(baseLedger({
    materialRequests:[request('approved'),request('delivered'),request('rejected')],
  }),'prj_1');
  assert.equal(control.pendingRequests,200);
  assert.equal(control.forecast,200);
});

test('quantity helpers tolerate missing and numeric-string inputs',()=>{
  assert.equal(sum([{amount:'10.5'},{amount:null},{}],'amount'),10.5);
  assert.equal(sum([1,'2',undefined]),3);
  assert.equal(materialRequestEstimate({items:[
    {qty:'2',estimatedRate:'50'},
    {qty:null,estimatedRate:100},
  ]}),100);
  assert.equal(vendorBillTotal({}),0);
});

test('category normalization trims, deduplicates, and preserves used vendor categories',()=>{
  assert.deepEqual(normalizeCategories([' Supplier ','Supplier','','Lighting',null]),[
    'Supplier',
    'Lighting',
  ]);
  assert.deepEqual(getVendorCategories({
    settings:{vendorCategories:['Supplier']},
    vendors:[{category:'Custom artisan'},{category:'Supplier'}],
  }),['Supplier','Custom artisan']);
  assert.deepEqual(getVendorCategories({
    settings:{vendorCategories:[]},
    vendors:[],
  }),['Other']);
});

test('normalization restores collection shapes, defaults, and schema version',()=>{
  const normalized=normalizeData({
    schemaVersion:1,
    projects:'invalid',
    vendors:null,
    invoices:null,
    settings:{studioName:'Acme Studio'},
  });

  assert.equal(normalized.schemaVersion,2);
  assert.deepEqual(normalized.projects,[]);
  assert.deepEqual(normalized.vendors,[]);
  assert.deepEqual(normalized.invoices,[]);
  assert.equal(normalized.settings.studioName,'Acme Studio');
  assert.equal(normalized.settings.currency,'INR');
});

test('normalization removes persisted expense status and repairs nested references',()=>{
  const normalized=normalizeData({
    projects:[{id:'prj_1'}],
    vendors:[{id:'ven_1'}],
    supervisors:[{id:'sup_1'}],
    expenses:[{
      id:'exp_1',
      projectId:'prj_1',
      vendorId:'ven_1',
      status:'paid',
      amount:100,
    }],
    materialRequests:[{
      id:'req_1',
      projectId:'prj_1',
      supervisorId:'missing',
      items:null,
    }],
    vendorBills:[{
      id:'bill_1',
      vendorId:'missing',
      lines:[{
        expenseId:'missing',
        projectId:'missing',
        materialRequestId:'req_1',
      }],
    }],
    pettyExpenses:[{id:'petty_1',projectId:'prj_1',supervisorId:'missing'}],
    estimates:[{id:'est_1',projectId:'missing',lines:null}],
    milestones:[{id:'mile_1',projectId:'prj_1',ownerId:'missing'}],
  });

  assert.equal('status' in normalized.expenses[0],false);
  assert.deepEqual(normalized.materialRequests[0].items,[]);
  assert.equal(normalized.materialRequests[0].supervisorId,'');
  assert.deepEqual(normalized.vendorBills[0].lines[0],{
    expenseId:'',
    projectId:'',
    materialRequestId:'req_1',
  });
  assert.equal(normalized.pettyExpenses[0].supervisorId,'');
  assert.equal(normalized.estimates[0].projectId,'');
  assert.deepEqual(normalized.estimates[0].lines,[]);
  assert.equal(normalized.milestones[0].ownerId,'');
});

test('merge keeps the current copy on duplicate IDs and imports new records',()=>{
  const current=baseLedger({
    projects:[{id:'prj_1',name:'Current name'}],
    settings:{studioName:'Current Studio'},
  });
  const incoming=baseLedger({
    projects:[
      {id:'prj_1',name:'Imported overwrite'},
      {id:'prj_2',name:'Imported new project'},
    ],
    settings:{studioName:'Imported Studio'},
  });
  const merged=mergeLedgerData(current,incoming);

  assert.deepEqual(merged.projects.map(({id,name})=>({id,name})),[
    {id:'prj_1',name:'Current name'},
    {id:'prj_2',name:'Imported new project'},
  ]);
  assert.equal(merged.settings.studioName,'Current Studio');
});

test('overdue invoice list includes overdue and partially paid invoices only',()=>{
  const invoices=[
    baseInvoice({id:'overdue',dueDate:'2000-01-01'}),
    baseInvoice({id:'partial',dueDate:'2099-01-01'}),
    baseInvoice({id:'paid',dueDate:'2000-01-01'}),
    baseInvoice({id:'future',dueDate:'2099-01-01'}),
    baseInvoice({id:'draft',status:'draft',dueDate:'2000-01-01'}),
  ];
  const paymentsReceived=[
    {invoiceId:'partial',amount:100},
    {invoiceId:'paid',amount:1000},
  ];
  assert.deepEqual(
    overdueInvoices({invoices,paymentsReceived}).map(invoice=>invoice.id),
    ['overdue','partial'],
  );
});

test('date helpers format empty and calendar date values',()=>{
  assert.equal(monthKey('2026-07-28'),'2026-07');
  assert.equal(monthKey(''),'');
  assert.equal(dstr(''),'—');
  assert.equal(dstr('2026-07-28'),'28 Jul 2026');
});

test('UIDs carry the requested entity prefix',()=>{
  assert.match(uid('invoice'),/^invoice_[a-z0-9]+$/);
});

test('sample loader creates linked operational and financial records',()=>{
  let generated;
  loadSample(updater=>{
    generated=updater({...EMPTY_DATA,settings:{...EMPTY_DATA.settings,studioName:'Test Studio'}});
  });

  assert.equal(generated.settings.studioName,'Test Studio');
  assert.equal(generated.projects.length,3);
  assert.equal(generated.invoices.length,3);
  assert.equal(generated.expenses.length,5);
  assert.ok(generated.invoices.every(invoice=>
    generated.projects.some(project=>project.id===invoice.projectId)
  ));
  assert.ok(generated.vendorBills[0].lines.every(line=>
    generated.expenses.some(expense=>expense.id===line.expenseId)
  ));
});
