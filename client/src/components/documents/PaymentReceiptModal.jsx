import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiPrinter, FiDownload, FiCheckCircle } from 'react-icons/fi'
import { formatMoney } from '../../lib/currencies'
import { buildDocumentLetterheadHtml, directorSealBlockHtml, printHtmlContent } from '../../lib/documentPrint'
import { mediaUrl } from '../../lib/media'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  invoice,
  payment,
  siteSettings = {},
}) {
  const receiptRef = useRef(null)

  if (!isOpen || !payment) return null

  const inv = invoice || {}
  const pay = payment || {}
  const currency = inv.currency || 'LKR'
  const payAmount = Number(pay.amount || 0)
  const prevBal = typeof pay.previousBalance === 'number' ? pay.previousBalance : Number(inv.total || 0)
  const balAfter = typeof pay.remainingBalanceAfter === 'number' ? pay.remainingBalanceAfter : Math.max(0, prevBal - payAmount)
  const receiptNo = pay.receiptNo || `REC-${inv.invoiceNo || 'INV'}-${Date.now().toString().slice(-4)}`
  const payDate = pay.date ? new Date(pay.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-LK')
  const payMethod = (pay.method || 'cash').replace('_', ' ')

  const hasCustomSig = inv.signatures?.authorizer?.data || 
                       inv.signatures?.seal?.data || 
                       inv.signatures?.authorizer?.name

  const handlePrint = () => {
    if (!receiptRef.current) return
    printHtmlContent({
      title: `Payment Receipt - ${receiptNo}`,
      bodyHtml: `<div class="doc-print-frame" style="padding: 14mm; font-family: 'Segoe UI', system-ui, sans-serif;">${receiptRef.current.innerHTML}</div>`,
      extraCss: '@page { margin: 10mm; }',
    })
  }

  const handleDownloadPdf = async () => {
    try {
      if (inv._id && (pay._id || pay.receiptNo)) {
        const payId = pay._id || pay.receiptNo
        const res = await api.get(`/invoices/${inv._id}/payments/${payId}/receipt?html=true&t=${Date.now()}`, { responseType: 'text' })
        const htmlStr = typeof res.data === 'string' ? res.data : await res.data.text()
        const { htmlStringToPdfDownload } = await import('../../lib/pdfGenerator')
        toast.loading('Generating Receipt PDF...', { id: 'pdf-toast' })
        await htmlStringToPdfDownload(htmlStr, `Receipt_${receiptNo}.pdf`)
        toast.success('Receipt PDF downloaded', { id: 'pdf-toast' })
      } else {
        handlePrint()
      }
    } catch (err) {
      console.error(err)
      toast.error('Could not download PDF, opening print preview instead')
      handlePrint()
    }
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FiCheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Payment Receipt</h3>
                <p className="text-xs text-slate-500">{receiptNo} • Invoice: {inv.invoiceNo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="btn-outline btn-sm flex items-center gap-1.5"
              >
                <FiDownload size={14} /> PDF
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <FiPrinter size={14} /> Print Receipt
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors ml-2"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Printable Receipt Frame */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100/60">
            <div
              ref={receiptRef}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto text-slate-800"
              style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
            >
              {/* Letterhead */}
              <div
                dangerouslySetInnerHTML={{
                  __html: buildDocumentLetterheadHtml(siteSettings, {
                    forPrint: false,
                    showTagline: siteSettings.letterheadTagline || '',
                    branch: inv.branch,
                  }),
                }}
              />

              <div className="border-t border-slate-200 pt-6 mt-4">
                {/* Receipt Title & Meta */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-md tracking-wider mb-2">
                      Official Receipt
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0">PAYMENT RECEIPT</h2>
                    <p className="text-sm font-semibold text-secondary mt-1">{receiptNo}</p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p className="m-0">
                      <span className="text-xs uppercase font-bold text-slate-400 block">Receipt Date</span>
                      <span className="font-semibold text-slate-800">{payDate}</span>
                    </p>
                    <p className="m-0 mt-2">
                      <span className="text-xs uppercase font-bold text-slate-400 block">Invoice Ref</span>
                      <span className="font-bold text-slate-900">{inv.invoiceNo || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                {/* Client & Payment Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Received From</p>
                    <p className="font-bold text-slate-900 text-base">{inv.client?.name || 'Client'}</p>
                    {inv.client?.phone && <p className="text-xs text-slate-500 mt-1">Tel: {inv.client.phone}</p>}
                    {inv.client?.email && <p className="text-xs text-slate-500 mt-0.5">{inv.client.email}</p>}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left sm:text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</p>
                    <p className="font-bold text-slate-800 capitalize text-sm">{payMethod}</p>
                    {pay.reference && <p className="text-xs text-slate-500 mt-1">Ref: {pay.reference}</p>}
                    {inv.project?.title && <p className="text-xs text-slate-500 mt-0.5">Project: {inv.project.title}</p>}
                  </div>
                </div>

                {/* Amount Highlight Box */}
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 mb-6 text-center">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Amount Received</p>
                  <h3 className="text-3xl font-black text-emerald-700 tracking-tight m-0">
                    {formatMoney(payAmount, currency)}
                  </h3>
                  {pay.notes && (
                    <p className="text-xs text-emerald-800 italic mt-2">Note: {pay.notes}</p>
                  )}
                </div>

                {/* Ledger Breakdown Table */}
                <table className="w-full border-collapse mb-6 text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase font-bold text-left">
                      <th className="p-3 border-b border-slate-200">Description</th>
                      <th className="p-3 border-b border-slate-200 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 text-slate-700">Invoice Total ({inv.invoiceNo})</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatMoney(inv.total, currency)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-700">Previous Balance Due</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatMoney(prevBal, currency)}</td>
                    </tr>
                    <tr className="bg-emerald-50/70">
                      <td className="p-3 font-bold text-emerald-800">
                        Payment Amount Received ({pay.isAdvance ? 'Advance' : 'Installment'})
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        - {formatMoney(payAmount, currency)}
                      </td>
                    </tr>
                    <tr className="bg-rose-50/70">
                      <td className="p-3.5 font-bold text-rose-800 text-base">
                        Remaining Balance Outstanding
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-rose-700 text-base">
                        {formatMoney(balAfter, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures */}
                {hasCustomSig && (
                  <div className="flex justify-end mt-8">
                    <div className="w-60 text-center">
                      {inv.signatures?.authorizer?.data ? (
                        <img
                          src={mediaUrl(inv.signatures.authorizer.data)}
                          alt="Signature"
                          className="max-h-16 mx-auto mb-2"
                        />
                      ) : (
                        <div className="h-14" />
                      )}
                      <div className="border-t-2 border-slate-800 pt-2 mb-2">
                        <p className="font-bold text-xs uppercase tracking-wider text-slate-900 m-0">
                          {inv.signatures?.authorizer?.name || 'Authorized Signatory'}
                        </p>
                        {inv.signatures?.authorizer?.title && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{inv.signatures.authorizer.title}</p>
                        )}
                      </div>
                      {inv.signatures?.seal?.data && (
                        <img
                          src={mediaUrl(inv.signatures.seal.data)}
                          alt="Seal"
                          className="max-h-20 mx-auto mt-2"
                        />
                      )}
                    </div>
                  </div>
                )}

                {!hasCustomSig && siteSettings && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: directorSealBlockHtml({
                        directorName: siteSettings.quotationDirectorName || '',
                        sealUrl: siteSettings.sealUrl || '',
                        forPrint: false,
                      }),
                    }}
                  />
                )}

                <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
                  This is an official system generated payment receipt. Thank you for your payment!
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
