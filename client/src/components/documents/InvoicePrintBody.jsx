import { formatMoney } from '../../lib/currencies'
import { buildDocumentLetterheadHtml, directorSealBlockHtml } from '../../lib/documentPrint'

export default function InvoicePrintBody({
  invoice,
  siteSettings = {},
  showLetterhead = true,
  showRefOnDocument = true,
}) {
  const inv = invoice || {}
  const currency = inv.currency || 'LKR'

  return (
    <div className="invoice-doc-inner">
      {showLetterhead && (
        <div className="doc-letterhead-wrap">
          <div
            dangerouslySetInnerHTML={{
              __html: buildDocumentLetterheadHtml(siteSettings, {
                forPrint: false,
                showTagline: siteSettings.letterheadTagline || 'Next Level Tech',
              }),
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h2 className="doc-title text-2xl font-black tracking-wide text-slate-900">TAX INVOICE</h2>
          {inv.project?.title && <p className="text-slate-600 text-sm">{inv.project.title}</p>}
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>
            <span className="text-slate-400 uppercase text-xs font-bold">Invoice date</span>
            <br />
            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
          </p>
          {inv.dueDate && (
            <p className="mt-2">
              <span className="text-slate-400 uppercase text-xs font-bold">Due date</span>
              <br />
              {new Date(inv.dueDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <p className="text-xs uppercase font-bold text-slate-400 mb-1">Billed to</p>
          <p className="font-bold text-slate-800">{inv.client?.name || 'Client'}</p>
          {inv.client?.email && <p className="text-sm text-slate-600">{inv.client.email}</p>}
        </div>
        <div className="sm:text-right text-sm text-slate-600">
          {inv.quotationRef?.quotationNo && (
            <p><span className="text-slate-400">Quotation:</span> {inv.quotationRef.quotationNo}</p>
          )}
          <p className="capitalize mt-1"><span className="text-slate-400">Status:</span> {inv.status}</p>
        </div>
      </div>

      <table className="doc-table w-full text-sm mb-6">
        <thead>
          <tr>
            <th>Description</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Unit price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">{formatMoney(item.unitPrice || 0, currency)}</td>
              <td className="text-right font-medium">{formatMoney(item.total || 0, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-totals space-y-1 mb-6 ml-auto max-w-xs">
        <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatMoney(inv.subtotal || 0, currency)}</span></div>
        {Number(inv.discountTotal) > 0 && (
          <div className="flex justify-between text-sm text-slate-600"><span>Discount</span><span>-{formatMoney(inv.discountTotal, currency)}</span></div>
        )}
        {Number(inv.tax) > 0 && (
          <div className="flex justify-between text-sm text-slate-600"><span>Tax ({inv.taxRate}%)</span><span>{formatMoney(inv.tax, currency)}</span></div>
        )}
        <div className="flex justify-between font-bold text-lg border-t-2 border-sky-500 pt-2">
          <span>Total</span><span>{formatMoney(inv.total || 0, currency)}</span>
        </div>
        {Number(inv.totalPaid) > 0 && (
          <div className="flex justify-between text-sm text-green-700"><span>Paid</span><span>{formatMoney(inv.totalPaid, currency)}</span></div>
        )}
        {Number(inv.remainingBalance) > 0 && (
          <div className="flex justify-between text-sm font-bold text-red-700"><span>Balance due</span><span>{formatMoney(inv.remainingBalance, currency)}</span></div>
        )}
      </div>

      {inv.notes && (
        <div className="text-sm border-t border-slate-100 pt-4 mb-4">
          <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Notes</h4>
          <p className="text-slate-600 whitespace-pre-wrap">{inv.notes}</p>
        </div>
      )}
      {inv.paymentTerms && (
        <div className="text-sm border-t border-slate-100 pt-4">
          <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Payment terms</h4>
          <p className="text-slate-600 whitespace-pre-wrap">{inv.paymentTerms}</p>
        </div>
      )}

      {showRefOnDocument && inv.invoiceNo && (
        <p className="text-[10px] text-slate-400 text-right mt-8 tracking-wide">Ref: {inv.invoiceNo}</p>
      )}
    </div>
  )
}
