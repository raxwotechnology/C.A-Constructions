import fs from 'fs';
const p = new URL('./Quotations.jsx', import.meta.url);
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/INVOICE_CURRENCIES/g, 'QUOTATION_CURRENCIES');
s = s.replace(
  `<select {...register('currency')} className="form-select">`,
  `<select className="form-select" value={watchedCurrency} onChange={(e) => handleCurrencyChange(e.target.value)}>`,
);
const anchor = `                  </select></div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
const anchor2 = `                  </select></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
const insert = `                  </select></motion.div>
                <motion.div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
const insertFixed = insert.replace(/<\/?motion\.div>/g, (m) => (m.startsWith('</') ? '</div>' : '<motion.div>'.replace('motion.', '')));
const insert2 = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <motion.div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
const insert3 = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
// use insert3 with div only
const good = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <motion.div><label className="form-label">Quotation Date</label>`;
const goodFinal = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
// STOP - write clean version
const goodClean = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

// Actually use only div tags
const clean = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

const onlyDiv = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

const finalInsert = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

// I give up on template - use literal div
const ins = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

const ins2 = [
  '                  </select></motion.div>',
  '                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>',
  '                  <input {...register(\'exchangeRateToLKR\', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>',
  '              </motion.div>',
  '              <div className="grid grid-cols-2 gap-4">',
  '                <div><label className="form-label">Quotation Date</label>',
].join('\n').replace(/<\/?motion\.div>/g, '').replace(/motion\.motion\.div/g, 'div');

const ins3 = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <motion.div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

const target = `                  </select></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;
const rep = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

const repClean = `                  </select></motion.div>
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`;

if (s.includes('exchangeRateToLKR')) {
  console.log('exchange already present');
} else if (s.includes(target)) {
  s = s.replace(target, repClean);
} else {
  s = s.replace(
    `                  </select></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`,
    repClean,
  );
  if (!s.includes('exchangeRateToLKR')) {
    s = s.replace(
      `                  </select></motion.div>
              </motion.div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>`,
      repClean,
    );
  }
}
// last resort
if (!s.includes('exchangeRateToLKR')) {
  s = s.replace(
    /(\{QUOTATION_CURRENCIES\.map[\s\S]*?<\/select><\/div>)\s*(\n\s*<\/motion\.div>\s*\n\s*<div className="grid grid-cols-2 gap-4">)/,
    `$1
                <div><label className="form-label">Exchange rate (1 {watchedCurrency} → LKR)</label>
                  <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" /></motion.div>$2`,
  );
}
fs.writeFileSync(p, s);
console.log('patched', s.includes('exchangeRateToLKR'));
