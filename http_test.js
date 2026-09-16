const http = require('http');

async function test() {
  // 1. Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@raxwo.com', password: 'admin' }) // Guessing default admin
  });
  
  if (!loginRes.ok) {
    console.log('Login failed', await loginRes.text());
    return;
  }
  
  const { token } = await loginRes.json();
  console.log('Got token');
  
  // 2. Get bank accounts
  const bankRes = await fetch('http://localhost:5000/api/bank-accounts', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const bankData = await bankRes.json();
  console.log('Banks:', bankData.accounts.map(a => ({ id: a._id, balance: a.currentBalance })));
  
  // 3. Get payrolls
  const payrollRes = await fetch('http://localhost:5000/api/payroll', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const payrollData = await payrollRes.json();
  const last = payrollData.payrolls[0];
  console.log('Last payroll:', last ? { id: last._id, status: last.status, netSalary: last.netSalary, method: last.paymentMethod, bank: last.bankAccount } : 'None');
  
}

test();
