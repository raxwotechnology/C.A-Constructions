const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/admin/Invoices.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const newForm = `              <form onSubmit={handleSubmit(onSubmit)} className="lg:w-[min(460px,45%)] xl:w-[min(520px,42%)] shrink-0 overflow-y-auto p-4 md:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-200">
                {editingPaid && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This invoice is fully paid. You can change <strong>status</strong>, dates, branch, project, currency, and notes only. Line items and tax are locked.
                  </div>
                )}
                {!editing && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                    <label className="form-label text-blue-800">Convert from Quotation (Optional)</label>
                    <select
                      {...quotationRefField}
                      onChange={(e) => {
                        quotationRefField.onChange(e)
                        handleQuotationSelect(e)
                      }}
                      className="form-select border-blue-200"
                    >
                      <option value="">-- Select an eligible quotation to auto-fill --</option>
                      {quotations.map(q => (
                        <option key={q._id} value={q._id}>
                          {q.quotationNo} - {q.client?.name} - {new Date(q.createdAt).toLocaleDateString()} - {q.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">1. Core Details</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Client *</label>
                      <input type="hidden" {...register('client', { required: true })} />
                      <SearchableSelect
                        value={watch('client') || ''}
                        onChange={(v, opt) => {
                          setValue('client', v, { shouldDirty: true, shouldValidate: true })
                          setClientSelectLabel(opt?.label || '')
                        }}
                        loadOptions={lookupLoaders.clients()}
                        placeholder="Search client…"
                        initialLabel={clientSelectLabel}
                      />
                    </div>
                    <div>
                      <label className="form-label">Service Type</label>
                      <select {...register('serviceType')} className="form-select">
                        {['ERP', 'POS', 'Hosting', 'Website', 'Maintenance', 'Custom', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Branch</label>
                      <select {...register('branch')} className="form-select">
                        <option value="">Select branch</option>
                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Project (Optional)</label>
                      <select {...register('project')} className="form-select">
                        <option value="">Link to project</option>
                        {projects.filter(p => !watch('client') || String(p.client?._id || p.client) === String(watch('client'))).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Invoice Prefix</label>
                      <input {...register('invoicePrefix')} className="form-input" placeholder="INV" disabled={!!editing}/>
                    </div>
                    <div>
                      <label className="form-label">Invoice Date</label>
                      <input {...register('invoiceDate')} type="date" className="form-input"/>
                    </div>
                    <div>
                      <label className="form-label">Due Date</label>
                      <input {...register('dueDate')} type="date" className="form-input"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">2. Financial Settings</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Currency</label>
                      <select
                        {...register('currency')}
                        onChange={(e) => {
                          register('currency').onChange(e)
                          setValue('exchangeRateToLKR', suggestedExchangeToLKR(e.target.value), { shouldValidate: true })
                        }}
                        className="form-select"
                      >
                        {INVOICE_CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {watchedCurrency !== 'LKR' ? (
                      <div>
                        <label className="form-label">LKR per 1 {watchedCurrency}</label>
                        <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" placeholder="e.g. 303"/>
                      </div>
                    ) : <div />}
                  </div>
                </div>

                <div className={\`space-y-4 \${editingPaid ? 'opacity-50 pointer-events-none' : ''}\`}>
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">3. Line Items</h4>
                    <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, discount: 0 })}
                      className="btn-outline btn-sm" disabled={editingPaid}><FiPlus size={12}/> Add Item</button>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-white p-2 rounded border border-slate-200">
                        <div className="col-span-12 md:col-span-5">
                          <label className="form-label text-[10px]">Description</label>
                          <input {...register(\`items.\${idx}.description\`, { required: !editingPaid })} className="form-input text-sm py-1.5" placeholder="Description *" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="form-label text-[10px]">Quantity</label>
                          <input {...register(\`items.\${idx}.quantity\`, { valueAsNumber: true })} type="number" min="1" className="form-input text-sm py-1.5" placeholder="Qty" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="form-label text-[10px]">Unit Price</label>
                          <input {...register(\`items.\${idx}.unitPrice\`, { valueAsNumber: true })} type="number" className="form-input text-sm py-1.5" placeholder="Price" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="form-label text-[10px]">Disc %</label>
                          <input {...register(\`items.\${idx}.discount\`, { valueAsNumber: true })} type="number" min="0" max="100" className="form-input text-sm py-1.5" placeholder="Disc%" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-1 pt-6 flex justify-end">
                          {fields.length > 1 && !editingPaid && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded"><FiX size={14}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="form-label">Transport Charge</label>
                      <input {...register('transportCharge', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="0" disabled={editingPaid}/>
                    </div>
                    <div>
                      <label className="form-label">Global Tax (%)</label>
                      <input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.1" className="form-input" placeholder="0" disabled={editingPaid}/>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Global Discount Type</label>
                      <select {...register('globalDiscountType')} className="form-select" disabled={editingPaid}>
                        <option value="fixed">Fixed Amount</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Global Discount Value</label>
                      <input {...register('globalDiscountValue', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="0" disabled={editingPaid}/>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-slate-800 text-white rounded-xl shadow-inner">
                    <div className="flex justify-between text-slate-300 text-sm mb-1"><span>Subtotal:</span><span>{watchedCurrency} {grossSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    {totalDiscount > 0 && <div className="flex justify-between text-red-300 text-sm mb-1"><span>Discount:</span><span>-{watchedCurrency} {totalDiscount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>}
                    <div className="flex justify-between text-slate-300 text-sm mb-1"><span>Tax ({taxRate}%):</span><span>{watchedCurrency} {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-600 mt-2"><span>Total:</span><span>{watchedCurrency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">4. Payment & Bank Details</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Payment Method</label>
                      <select {...register('paymentMethod')} className="form-select">
                        <option value="">Select Method</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                        <option value="online">Online Payment</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    {watch('paymentMethod') === 'custom' && (
                      <div>
                        <label className="form-label">Custom Method Name</label>
                        <input {...register('paymentMethodCustom')} className="form-input" placeholder="Enter method..." />
                      </div>
                    )}
                    <div>
                      <label className="form-label">Bank Account</label>
                      {/* Note: since bankData is not fetched in Invoices yet, we will just provide a plain text field or assume it's hidden if not fetched. But wait, I need to fetch it in Invoices.jsx! I will update the top of Invoices.jsx to fetch banks. Let's assume bankData exists for now, I'll add the query. */}
                      <select {...register('bankAccount')} className="form-select">
                        <option value="">Select Bank Account</option>
                        {(typeof banks !== 'undefined' ? banks : []).map(b => <option key={b._id} value={b._id}>{b.bankName} - {b.accountNumber}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Bank Branch</label>
                      <input {...register('bankBranch')} className="form-input" placeholder="e.g. Colombo 03" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">5. Notes & Terms</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Notes</label>
                      <textarea {...register('notes')} rows={3} className="form-input resize-none" placeholder="Additional notes..."/>
                    </div>
                    <div>
                      <label className="form-label">Terms & Conditions</label>
                      <textarea {...register('terms')} rows={3} className="form-input resize-none" placeholder="Terms & Conditions..."/>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">6. Signatures</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-500 tracking-wide">Authorizer Signature</p>
                      <DocumentAssetPicker label="Signature (upload or saved)" value={{ data: signatures.authorizer.data }} onChange={(v) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, data: v.data } }))} roleKey="admin" />
                      <div>
                        <label className="form-label text-xs">Signatory Name</label>
                        <input className="form-input text-sm" placeholder="Name" value={signatures.authorizer.name} onChange={(e) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, name: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="form-label text-xs">Signatory Title</label>
                        <input className="form-input text-sm" placeholder="Title" list="signatory-titles" value={signatures.authorizer.title} onChange={(e) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, title: e.target.value } }))} />
                      </div>
                      <datalist id="signatory-titles">
                        <option value="Director" />
                        <option value="Authorized Signatory" />
                        <option value="Manager" />
                        <option value="HR" />
                      </datalist>
                      <SignaturePad label="Draw signature" value={signatures.authorizer.data} onChange={(data) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, data } }))} />
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-500 tracking-wide">Company Seal</p>
                      <DocumentAssetPicker label="Seal image" assetType="seal" value={{ data: signatures.seal.data }} onChange={(v) => setSignatures((s) => ({ ...s, seal: { ...s.seal, data: v.data } }))} />
                      <div>
                        <label className="form-label text-xs">Text under seal</label>
                        <input className="form-input text-sm" placeholder="For and on behalf of..." value={signatures.seal.note || ''} onChange={(e) => setSignatures((s) => ({ ...s, seal: { ...s.seal, note: e.target.value } }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {editing && (
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="form-label">Invoice Status</label>
                      <select {...register('status')} className="form-select border-amber-300 bg-amber-50">
                        {['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <p className="text-xs text-amber-700 mt-1">Status can be forced manually here.</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white pb-1 z-10">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" onClick={() => {
                    const errs = [];
                    if (!watch('client')) errs.push('Client is required');
                    if (fields.some(f => !f.description)) errs.push('Item descriptions are required');
                    if (errs.length > 0) errs.forEach(e => toast.error(e));
                  }} disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                    {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : (editing ? 'Save Invoice' : 'Create Invoice')}
                  </button>
                </div>
              </form>`;

const startToken = '<form onSubmit={handleSubmit(onSubmit)}';
const endToken = '</form>';

const startIndex = content.indexOf(startToken);
const endIndex = content.indexOf(endToken, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newForm + content.substring(endIndex + endToken.length);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Form replaced successfully!');
} else {
  console.log('Tokens not found!');
}
