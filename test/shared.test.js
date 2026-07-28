import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountsPayable,
  accountsReceivable,
  expenseHasPaymentHistory,
  estimateTotal,
  getPaymentsMade,
  getPaymentsReceived,
  hasProtectedHistory,
  invoiceHasPaymentHistory,
  invoiceBalance,
  localDateKey,
  mergeLedgerData,
  normalizeData,
  materialRequestEstimate,
  milestoneHealth,
  pettyExpenseTotal,
  projectCostControl,
  projectHasFinancialHistory,
  roundMoney,
  rollup,
  vendorHasFinancialHistory,
  vendorBillTotal,
} from '../src/shared.js';

const invoice=(overrides={})=>({
  id:'inv_1',
  projectId:'prj_1',
  status:'sent',
  items:[{desc:'Design fee',qty:1,rate:1000}],
  discount:0,
  taxRate:0,
  ...overrides,
});

const expense=(overrides={})=>({
  id:'exp_1',
  projectId:'prj_1',
  vendorId:'ven_1',
  amount:600,
  ...overrides,
});

const data=(overrides={})=>({
  projects:[{id:'prj_1'}],
  vendors:[{id:'ven_1'}],
  invoices:[invoice()],
  expenses:[expense()],
  paymentsReceived:[],
  paymentsMade:[],
  ...overrides,
});

test('only invoice-allocated receipts reduce accounts receivable',()=>{
  const unallocated={id:'pay_1',projectId:'prj_1',invoiceId:'',amount:400};
  const allocated={...unallocated,invoiceId:'inv_1'};

  assert.equal(accountsReceivable(data({paymentsReceived:[unallocated]})),1000);
  assert.equal(accountsReceivable(data({paymentsReceived:[allocated]})),600);
  assert.equal(invoiceBalance(invoice(),[allocated]),600);
});

test('draft invoices are excluded from accounts receivable',()=>{
  assert.equal(accountsReceivable(data({invoices:[invoice({status:'draft'})]})),0);
});

test('only bill-allocated payments reduce accounts payable',()=>{
  const unallocated={id:'pay_1',projectId:'prj_1',vendorId:'ven_1',expenseId:'',amount:250};
  const allocated={...unallocated,expenseId:'exp_1'};

  assert.equal(accountsPayable(data({paymentsMade:[unallocated]})),600);
  assert.equal(accountsPayable(data({paymentsMade:[allocated]})),350);
});

test('project rollup keeps cash totals separate from AR and AP allocations',()=>{
  const ledger=data({
    paymentsReceived:[{id:'rec_1',projectId:'prj_1',invoiceId:'',amount:400}],
    paymentsMade:[{id:'pay_1',projectId:'prj_1',vendorId:'ven_1',expenseId:'',amount:250}],
  });

  assert.deepEqual(
    {
      received:rollup('prj_1',ledger).received,
      paidOut:rollup('prj_1',ledger).paidOut,
      receivable:rollup('prj_1',ledger).receivable,
      payable:rollup('prj_1',ledger).payable,
    },
    {received:400,paidOut:250,receivable:1000,payable:600}
  );
});

test('AR and AP helpers respect project scope',()=>{
  const ledger=data({
    invoices:[invoice(),invoice({id:'inv_2',projectId:'prj_2',items:[{qty:1,rate:800}]})],
    expenses:[expense(),expense({id:'exp_2',projectId:'prj_2',amount:300})],
  });

  assert.equal(accountsReceivable(ledger,'prj_1'),1000);
  assert.equal(accountsPayable(ledger,'prj_1'),600);
});

test('reversed payments remain in history but no longer affect balances',()=>{
  const reversedAt='2026-07-28T10:00:00.000Z';
  const receipt={id:'rec_1',projectId:'prj_1',invoiceId:'inv_1',amount:400,reversedAt};
  const payment={id:'pay_1',projectId:'prj_1',vendorId:'ven_1',expenseId:'exp_1',amount:250,reversedAt};
  const ledger=data({paymentsReceived:[receipt],paymentsMade:[payment]});

  assert.equal(ledger.paymentsReceived.length,1);
  assert.equal(ledger.paymentsMade.length,1);
  assert.equal(getPaymentsReceived(ledger).length,0);
  assert.equal(getPaymentsMade(ledger).length,0);
  assert.equal(accountsReceivable(ledger),1000);
  assert.equal(accountsPayable(ledger),600);
});

test('financial-history guards include reversed records',()=>{
  const reversedAt='2026-07-28T10:00:00.000Z';
  const ledger=data({
    paymentsReceived:[{id:'rec_1',projectId:'prj_1',invoiceId:'inv_1',amount:400,reversedAt}],
    paymentsMade:[{id:'pay_1',projectId:'prj_1',vendorId:'ven_1',expenseId:'exp_1',amount:250,reversedAt}],
  });

  assert.equal(projectHasFinancialHistory(ledger,'prj_1'),true);
  assert.equal(vendorHasFinancialHistory(ledger,'ven_1'),true);
  assert.equal(invoiceHasPaymentHistory(ledger,'inv_1'),true);
  assert.equal(expenseHasPaymentHistory(ledger,'exp_1'),true);
});

test('normalization detaches broken references without deleting financial records',()=>{
  const repaired=normalizeData({
    projects:[],
    vendors:[],
    invoices:[invoice()],
    expenses:[expense()],
    paymentsReceived:[{id:'rec_1',projectId:'missing',invoiceId:'missing',amount:400}],
    paymentsMade:[{id:'pay_1',projectId:'missing',vendorId:'missing',expenseId:'missing',amount:250}],
    settings:{},
  });

  assert.equal(repaired.invoices[0].projectId,'');
  assert.equal(repaired.expenses[0].projectId,'');
  assert.equal(repaired.expenses[0].vendorId,'');
  assert.deepEqual(
    {
      projectId:repaired.paymentsReceived[0].projectId,
      invoiceId:repaired.paymentsReceived[0].invoiceId,
    },
    {projectId:'',invoiceId:''}
  );
  assert.deepEqual(
    {
      projectId:repaired.paymentsMade[0].projectId,
      vendorId:repaired.paymentsMade[0].vendorId,
      expenseId:repaired.paymentsMade[0].expenseId,
    },
    {projectId:'',vendorId:'',expenseId:''}
  );
});

test('multi-project vendor bills total quantity, rates and line tax',()=>{
  const bill={lines:[
    {projectId:'prj_1',qty:10,rate:100,taxRate:18},
    {projectId:'prj_2',qty:2,rate:500,taxRate:0},
  ]};
  assert.equal(vendorBillTotal(bill),2180);
});

test('rough and detailed estimates use explicit contingency and design fee',()=>{
  assert.equal(estimateTotal({type:'rough',area:1000,baseRate:2000,contingencyPct:10,designFee:100000}),2300000);
  assert.equal(estimateTotal({type:'detailed',contingencyPct:10,designFee:100,
    lines:[{qty:2,materialRate:100,labourRate:50,markupPct:20}]}),496);
});

test('project cost control combines approved small expenses and open requests',()=>{
  const ledger={
    projects:[{id:'prj_1',budget:1000}],
    estimates:[],
    expenses:[{id:'exp_1',projectId:'prj_1',amount:400}],
    pettyExpenses:[
      {id:'petty_1',projectId:'prj_1',amount:50,status:'approved'},
      {id:'petty_2',projectId:'prj_1',amount:80,status:'submitted'},
    ],
    materialRequests:[{id:'req_1',projectId:'prj_1',status:'approved',items:[{qty:2,estimatedRate:100}]}],
  };
  const control=projectCostControl(ledger,'prj_1');
  assert.equal(pettyExpenseTotal(ledger,'prj_1'),50);
  assert.equal(materialRequestEstimate(ledger.materialRequests[0]),200);
  assert.deepEqual({actual:control.actual,forecast:control.forecast,variance:control.variance},{actual:450,forecast:650,variance:350});
});

test('billed material-request value is not forecast twice',()=>{
  const ledger={
    projects:[{id:'prj_1',budget:2000}],estimates:[],pettyExpenses:[],paymentsMade:[],
    materialRequests:[{id:'req_1',projectId:'prj_1',status:'ordered',items:[{qty:10,estimatedRate:100}]}],
    vendorBills:[{id:'bill_1',lines:[{expenseId:'exp_1',projectId:'prj_1',materialRequestId:'req_1',qty:6,rate:100,taxRate:0}]}],
    expenses:[{id:'exp_1',projectId:'prj_1',amount:600}],
  };
  const control=projectCostControl(ledger,'prj_1');
  assert.deepEqual({actual:control.actual,pending:control.pendingRequests,forecast:control.forecast},{actual:600,pending:400,forecast:1000});
});

test('money and date helpers are stable at accounting boundaries',()=>{
  assert.equal(roundMoney(1.005),1.01);
  assert.equal(localDateKey(new Date(2026,0,2,23,30)),'2026-01-02');
});

test('backup merge is additive and never erases current history',()=>{
  const current=data({paymentsReceived:[{id:'rec_current',projectId:'prj_1',invoiceId:'inv_1',amount:100}]});
  const imported=data({paymentsReceived:[{id:'rec_imported',projectId:'prj_1',invoiceId:'inv_1',amount:200}]});
  const merged=mergeLedgerData(current,imported);
  assert.deepEqual(merged.paymentsReceived.map(x=>x.id).sort(),['rec_current','rec_imported']);
  assert.equal(hasProtectedHistory(merged),true);
});

test('milestone health identifies blocked and overdue work',()=>{
  assert.equal(milestoneHealth({status:'blocked',plannedEnd:'2099-01-01'}).key,'blocked');
  assert.equal(milestoneHealth({status:'in-progress',plannedEnd:'2000-01-01'}).key,'overdue');
});
