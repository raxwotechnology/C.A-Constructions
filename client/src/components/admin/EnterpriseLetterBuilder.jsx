import React, { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { FiSave, FiX, FiRefreshCcw, FiImage, FiSettings, FiLayout, FiEye, FiDownload, FiPrinter } from 'react-icons/fi'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import DocumentAssetPicker from '../branding/DocumentAssetPicker'
import SignaturePad from './SignaturePad'
import { buildLetterheadHtml, buildRefDateHtml, buildSigsHtml } from '../../lib/letterDocument'
import { LETTER_SIGNATORY_ROLES, applySignatoryRole, letterSignaturesToPayload } from '../../lib/letterSignatures'

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ font: [] }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['table'],
    ['link', 'image'],
    ['clean']
  ],
}
const QUILL_FORMATS = ['bold', 'italic', 'underline', 'strike', 'size', 'font', 'color', 'background', 'align', 'list', 'bullet', 'link', 'image', 'table']

export default function EnterpriseLetterBuilder({ 
  initialData = null, 
  employee, 
  clientData = null,
  company, 
  employeesList = [],
  clientsList = [],
  letterTypesList = [],
  onSave, 
  onCancel, 
  isSaving = false 
}) {
  const [activeTab, setActiveTab] = useState('content') // content, style, preview
  const [sections, setSections] = useState({
    header: true,
    from: false,
    to: true,
    info: true,
    body: true,
    signatures: true,
    footer: true
  })

  // Detect recipient type from initialData
  const isClientRecipient = initialData?.recipientType === 'client'

  // We initialize the form with structured data if it exists, otherwise defaults.
  const defaultValues = {
    // DB Meta
    dbEmployeeId: initialData?.employee?._id || initialData?.employee || employee?._id || '',
    dbClientId: initialData?.client?._id || initialData?.dbClientId || clientData?._id || '',
    dbRecipientType: initialData?.recipientType || (clientData ? 'client' : 'employee'),
    dbLetterType: initialData?.type || 'custom',
    letterName: initialData?.title || 'Custom Letter',

    // Info
    letterRef: initialData?.letterRef || `LTR-${new Date().getFullYear()}-XXXX`,
    issuedDate: initialData?.issuedDate ? new Date(initialData.issuedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    subject: initialData?.title || initialData?.structuredData?.subject || 'Official Communication',
    
    // Header overrides
    overrideHeader: initialData?.structuredData?.overrideHeader || false,
    customLogo: initialData?.structuredData?.customLogo || '',
    customCompanyName: initialData?.structuredData?.customCompanyName || '',
    
    // From
    senderName: initialData?.structuredData?.senderName || company?.signatures?.hr?.name || '',
    senderDesignation: initialData?.structuredData?.senderDesignation || 'Human Resources',
    senderDepartment: initialData?.structuredData?.senderDepartment || '',
    
    // To — pre-fill from client if this is a client letter
    recipientName: initialData?.structuredData?.recipientName || (isClientRecipient ? clientData?.name : employee?.userId?.name) || '',
    recipientDesignation: initialData?.structuredData?.recipientDesignation || (isClientRecipient ? '' : employee?.designation) || '',
    recipientCompany: initialData?.structuredData?.recipientCompany || (isClientRecipient ? clientData?.company || '' : '') || '',
    recipientAddress: initialData?.structuredData?.recipientAddress || (isClientRecipient ? clientData?.address || '' : '') || '',
    
    // Body
    bodyContent: initialData?.structuredData?.bodyContent || initialData?.content || '',
    
    signatoryRole: initialData?.signatures?.activeRole || initialData?.structuredData?.signatoryRole || 'admin',
    signatoryName: initialData?.signatures?.signatory?.name || initialData?.signatures?.hr?.name || company?.signatures?.admin?.label || '',
    signatoryTitle: initialData?.signatures?.signatory?.title || initialData?.signatures?.hr?.title || 'Authorized Signatory',
    signatoryData: initialData?.signatures?.signatory?.data || initialData?.signatures?.hr?.data || company?.signatures?.admin?.url || '',
    sealData: initialData?.signatures?.seal?.data || company?.seal || '',
    includeSignature: initialData?.signatures?.includeSignature !== false,
    includeSeal: initialData?.signatures?.includeSeal !== false,

    // Settings
    primaryColor: initialData?.structuredData?.primaryColor || '#1e3a8a',
    fontFamily: initialData?.structuredData?.fontFamily || "'Segoe UI', system-ui, sans-serif",
    documentFrame: initialData?.structuredData?.documentFrame || false,
  }

  // Restore sections if exists
  useEffect(() => {
    if (initialData?.structuredData?.sections) {
      setSections(initialData.structuredData.sections)
    }
  }, [initialData])

  const { register, control, watch, setValue, handleSubmit } = useForm({ defaultValues })
  const formData = watch()

  // Dynamic placehodlers
  const insertPlaceholder = (ph) => {
    const val = formData.bodyContent || ''
    setValue('bodyContent', val + ` {{${ph}}} `)
  }

  const handleSave = (data) => {
    // Generate final HTML from structured data
    const parts = generateLetterParts(data, company, sections)
    const finalHtml = parts.full
    
    const payload = {
      title: data.letterName || data.subject,
      content: finalHtml,
      dbEmployeeId: data.dbEmployeeId,
      dbClientId: data.dbClientId,
      dbRecipientType: data.dbRecipientType,
      dbLetterType: data.dbLetterType,
      structuredData: {
        ...data,
        sections
      },
      signatures: letterSignaturesToPayload({
        activeRole: data.signatoryRole,
        includeSignature: data.includeSignature,
        includeSeal: data.includeSeal,
        signatory: {
          role: data.signatoryRole,
          name: data.signatoryName,
          title: data.signatoryTitle,
          data: data.signatoryData,
        },
        seal: { data: data.sealData },
      }),
    }
    onSave(payload)
  }

  // Live Preview Component
  const LivePreview = () => {
    const parts = generateLetterParts(formData, company, sections)
    return (
      <div className="bg-white shadow-xl rounded-xl border border-slate-200 overflow-hidden mx-auto max-w-[794px] min-h-[1123px] relative print:shadow-none print:border-none flex flex-col">
        <style dangerouslySetInnerHTML={{__html: `
          .enterprise-letter { font-family: ${formData.fontFamily}; color: #0f172a; font-size: 11pt; line-height: 1.6; padding: 48px; display: flex; flex-direction: column; min-height: 100%; flex: 1; ${formData.documentFrame ? `border: 12px double ${formData.primaryColor}; border-radius: 8px; outline: 2px solid ${formData.primaryColor}; outline-offset: -8px; padding: 36px;` : ''} }
          .enterprise-letter-body { font-size: 11pt; line-height: 1.55; }
          .enterprise-meta-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 10pt; }
          .enterprise-meta-col { display: flex; flex-direction: column; gap: 4px; }
          .enterprise-meta-label { color: #64748b; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
          .enterprise-subject { font-size: 13pt; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 20px 0; }
          .enterprise-body { flex: 1; min-height: 300px; }
          .enterprise-body p { margin-bottom: 12px; }
          .enterprise-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .enterprise-body td, .enterprise-body th { border: 1px solid #e2e8f0; padding: 8px; }
          .enterprise-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
        `}} />
        <div className="enterprise-letter" dangerouslySetInnerHTML={{ __html: parts.full }} />
      </div>
    )
  }

  const parts = activeTab === 'content' || activeTab === 'preview' ? generateLetterParts(formData, company, sections) : null;

  return (
    <div className="letter-builder flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onCancel} className="btn-ghost btn-sm gap-2 mr-2 border border-slate-200 hover:bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div className="h-6 w-[1px] bg-slate-200"></div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <FiLayout className="text-primary" /> Enterprise Letter Builder
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('content')} 
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'content' ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Content Edit
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Layout & Settings
            </button>
            <button 
              onClick={() => setActiveTab('preview')} 
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Live Preview
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={handleSubmit(handleSave)} 
            disabled={isSaving}
            className="btn-primary btn-sm px-6"
          >
            {isSaving ? <span className="spinner" /> : <><FiSave /> Save Letter</>}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar Controls */}
        {(activeTab === 'content' || activeTab === 'settings') && (
          <div className="w-[420px] bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar shrink-0 flex flex-col">
            <div className="p-4 space-y-6">
              
              {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Design & Branding</h3>
                    <div>
                      <label className="form-label text-xs">Primary Color</label>
                      <div className="flex gap-2">
                        <input type="color" {...register('primaryColor')} className="w-10 h-10 p-1 rounded cursor-pointer border border-slate-200" />
                        <input type="text" {...register('primaryColor')} className="form-input text-xs flex-1 uppercase" />
                      </div>
                    </div>
                    <div>
                      <label className="form-label text-xs">Font Family</label>
                      <select {...register('fontFamily')} className="form-select text-xs">
                        <option value="'Segoe UI', system-ui, sans-serif">Modern Sans (Default)</option>
                        <option value="Georgia, serif">Classic Serif (Georgia)</option>
                        <option value="'Times New Roman', Times, serif">Formal (Times New Roman)</option>
                        <option value="'Inter', sans-serif">Clean (Inter)</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                      <input type="checkbox" {...register('documentFrame')} className="form-checkbox text-primary rounded" />
                      Add decorative border frame
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Visible Sections</h3>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      {Object.keys(sections).map(sec => (
                        <label key={sec} className="flex items-center gap-2 text-sm capitalize">
                          <input 
                            type="checkbox" 
                            checked={sections[sec]} 
                            onChange={(e) => setSections(s => ({...s, [sec]: e.target.checked}))}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          {sec} Section
                        </label>
                      ))}
                    </div>
                  </div>
                  

                </div>
              )}

              {activeTab === 'content' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {sections.info && (
                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <h3 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                        <FiEye /> Letter Information
                      </h3>
                      <div>
                        <label className="form-label text-xs">Reference Number</label>
                        <input {...register('letterRef')} className="form-input text-xs font-mono" />
                      </div>
                      <div>
                        <label className="form-label text-xs">Issued Date</label>
                        <input type="date" {...register('issuedDate')} className="form-input text-xs" />
                      </div>
                      <div>
                        <label className="form-label text-xs">Letter Title / Subject</label>
                        <input {...register('subject')} className="form-input text-xs font-bold" />
                      </div>
                      
                      {/* Database Meta Fields */}
                      <div className="border-t border-blue-200 pt-3 mt-3">
                        <label className="form-label text-xs font-semibold text-blue-800 mb-1">System Tracking (Internal)</label>
                        <div className="space-y-2">
                          <div>
                            <label className="form-label text-xs">Letter Name (For Dashboard)</label>
                            <input {...register('letterName')} className="form-input text-xs" />
                          </div>
                          {formData.dbRecipientType === 'client' ? (
                            <>
                              <label className="form-label text-xs">Customer (For Dashboard)</label>
                              <select
                                {...register('dbClientId')}
                                className="form-select text-xs"
                                onChange={(e) => {
                                  register('dbClientId').onChange(e)
                                  const sel = clientsList.find(c => String(c._id) === String(e.target.value))
                                  if (sel) {
                                    setValue('recipientName', sel.name || '')
                                    setValue('recipientCompany', sel.company || '')
                                    setValue('recipientAddress', sel.address || '')
                                    setValue('recipientDesignation', '')
                                  }
                                }}
                              >
                                <option value="">-- Select Customer --</option>
                                {clientsList.map(c => (
                                  <option key={c._id} value={c._id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
                                ))}
                              </select>
                            </>
                          ) : (
                            <select {...register('dbEmployeeId')} className="form-select text-xs">
                              <option value="">-- Select Employee --</option>
                              {employeesList.map(e => (
                                <option key={e._id} value={e._id}>{e.userId?.name} ({e.designation})</option>
                              ))}
                            </select>
                          )}
                          <select {...register('dbLetterType')} className="form-select text-xs">
                            <option value="custom">Custom Letter</option>
                            {letterTypesList
                              .filter(t => t.value !== 'custom')
                              .filter(t => !t.category || t.category === 'both' || t.category === formData.dbRecipientType)
                              .map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {sections.from && (
                    <div className="space-y-3 p-4 rounded-xl border border-slate-200">
                      <h3 className="font-bold text-sm text-slate-800">Sender (From)</h3>
                      <input {...register('senderName')} placeholder="Name" className="form-input text-xs" />
                      <input {...register('senderDesignation')} placeholder="Designation" className="form-input text-xs" />
                      <input {...register('senderDepartment')} placeholder="Department (Optional)" className="form-input text-xs" />
                    </div>
                  )}

                  {sections.to && (
                    <div className="space-y-3 p-4 rounded-xl border border-slate-200">
                      <h3 className="font-bold text-sm text-slate-800">Recipient (To)</h3>
                      <input {...register('recipientName')} placeholder="Name" className="form-input text-xs" />
                      <input {...register('recipientDesignation')} placeholder="Designation" className="form-input text-xs" />
                      <input {...register('recipientCompany')} placeholder="Company (Optional)" className="form-input text-xs" />
                      <textarea {...register('recipientAddress')} placeholder="Address" rows={2} className="form-input text-xs resize-none" />
                    </div>
                  )}

                  {sections.signatures && (
                    <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <h3 className="font-bold text-sm text-slate-800">Signature &amp; seal</h3>
                      <p className="text-xs text-slate-500">Select signatory from Settings. Shown on the right when printed.</p>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input type="checkbox" {...register('includeSignature')} className="form-checkbox rounded" />
                          Include signature
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input type="checkbox" {...register('includeSeal')} className="form-checkbox rounded" />
                          Include company seal
                        </label>
                      </div>
                      <div>
                        <label className="form-label text-xs">Signatory</label>
                        <select
                          {...register('signatoryRole')}
                          className="form-select text-xs"
                          onChange={(e) => {
                            register('signatoryRole').onChange(e)
                            const next = applySignatoryRole(e.target.value, { signatures: company?.signatures, sealUrl: company?.seal, quotationDirectorName: '' }, {})
                            setValue('signatoryName', next.signatory?.name || '')
                            setValue('signatoryTitle', next.signatory?.title || '')
                            setValue('signatoryData', next.signatory?.data || '')
                            if (next.seal?.data) setValue('sealData', next.seal.data)
                          }}
                        >
                          {LETTER_SIGNATORY_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <input {...register('signatoryName')} placeholder="Signatory name" className="form-input text-xs" />
                      <input {...register('signatoryTitle')} placeholder="Title" className="form-input text-xs" list="signatory-titles" />
                      <datalist id="signatory-titles">
                        <option value="Director" />
                        <option value="Authorized Signatory" />
                        <option value="Manager" />
                        <option value="HR" />
                      </datalist>
                      <DocumentAssetPicker
                        label="Signature"
                        value={{ data: formData.signatoryData }}
                        onChange={(v) => setValue('signatoryData', v.data)}
                        roleKey={formData.signatoryRole === 'custom' ? 'admin' : formData.signatoryRole}
                      />
                      <SignaturePad label="Draw signature" value={formData.signatoryData} onChange={(d) => setValue('signatoryData', d)} />
                      <DocumentAssetPicker label="Company seal" assetType="seal" value={{ data: formData.sealData }} onChange={(v) => setValue('sealData', v.data)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Editor or Preview */}
        <div className="flex-1 bg-slate-100 flex flex-col relative overflow-hidden min-h-0">
          
          {activeTab === 'preview' ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
               <LivePreview />
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-slate-100 min-h-0 overflow-hidden">
              <div className="bg-white px-4 py-2 border-b border-slate-200 flex flex-wrap gap-2 items-center shrink-0 shadow-sm z-20 relative">
                <span className="text-xs font-bold text-slate-500 uppercase">Insert Dynamic Variable:</span>
                <button type="button" onClick={() => insertPlaceholder('EMPLOYEE_NAME')} className="badge badge-gray hover:bg-slate-200 cursor-pointer">Employee Name</button>
                <button type="button" onClick={() => insertPlaceholder('DESIGNATION')} className="badge badge-gray hover:bg-slate-200 cursor-pointer">Designation</button>
                <button type="button" onClick={() => insertPlaceholder('COMPANY_NAME')} className="badge badge-gray hover:bg-slate-200 cursor-pointer">Company Name</button>
                <button type="button" onClick={() => insertPlaceholder('CURRENT_DATE')} className="badge badge-gray hover:bg-slate-200 cursor-pointer">Current Date</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-100">
                <div className="bg-white shadow-xl rounded-xl border border-slate-200 mx-auto max-w-[794px] min-h-[1123px] relative flex flex-col">
                  <style dangerouslySetInnerHTML={{__html: `
                    .enterprise-letter { font-family: ${formData.fontFamily}; color: #0f172a; font-size: 11pt; line-height: 1.6; padding: 48px; display: flex; flex-direction: column; min-height: 100%; flex: 1; ${formData.documentFrame ? `border: 12px double ${formData.primaryColor}; border-radius: 8px; outline: 2px solid ${formData.primaryColor}; outline-offset: -8px; padding: 36px;` : ''} }
                    .enterprise-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${formData.primaryColor}; padding-bottom: 20px; margin-bottom: 24px; }
                    .enterprise-logo { max-height: 60px; max-width: 220px; object-fit: contain; }
                    .enterprise-co-info { text-align: right; }
                    .enterprise-co-name { font-size: 20px; font-weight: 800; color: ${formData.primaryColor}; margin: 0; }
                    .enterprise-co-contact { font-size: 9.5pt; color: #475569; margin-top: 8px; line-height: 1.5; }
                    .enterprise-meta-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 10pt; }
                    .enterprise-meta-col { display: flex; flex-direction: column; gap: 4px; }
                    .enterprise-meta-label { color: #64748b; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
                    .enterprise-subject { font-size: 13pt; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 20px 0; }
                    .enterprise-sig-section { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
                    .enterprise-sig-block { display: flex; flex-direction: column; align-items: center; min-width: 150px; }
                    .enterprise-sig-img { height: 60px; object-fit: contain; margin-bottom: 8px; }
                    .enterprise-sig-line { width: 100%; border-top: 1px solid #000; margin: 8px 0; }
                    .enterprise-sig-name { font-weight: 600; font-size: 10pt; }
                    .enterprise-sig-title { font-size: 9pt; color: #64748b; }
                    .enterprise-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
                    .enterprise-quill-wrapper { margin: 10px -15px 0 -15px; position: relative; z-index: 10; }
                    .enterprise-quill-wrapper .ql-container { font-family: inherit; font-size: inherit; border: 2px dashed #cbd5e1 !important; border-radius: 8px; background: #f8fafc; transition: all 0.2s; cursor: text; height: 500px !important; }
                    .enterprise-quill-wrapper .ql-container:hover { border-color: #94a3b8 !important; background: #fff; }
                    .enterprise-quill-wrapper .ql-container:focus-within { background: #fff; border-style: solid !important; border-color: ${formData.primaryColor} !important; box-shadow: 0 0 0 4px ${formData.primaryColor}20; }
                    .enterprise-quill-wrapper .ql-toolbar { border: 1px solid #e2e8f0 !important; margin-bottom: 12px; background: #fff; padding: 10px !important; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: sticky; top: 0; z-index: 20; }
                    .enterprise-quill-wrapper .ql-editor { height: 100% !important; overflow-y: auto !important; padding: 24px; font-size: 11pt; }
                    .enterprise-quill-wrapper .ql-editor p { margin-bottom: 12px; }
                    .enterprise-quill-wrapper .ql-editor.ql-blank::before { font-style: normal; color: #94a3b8; font-size: 11pt; }
                  `}} />
                  <div className="enterprise-letter">
                    <div dangerouslySetInnerHTML={{ __html: parts?.before || '' }} />
                    {sections.body ? (
                      <div className="enterprise-quill-wrapper">
                        <Controller
                          name="bodyContent"
                          control={control}
                          render={({ field }) => (
                            <ReactQuill
                              theme="snow"
                              value={field.value}
                              onChange={field.onChange}
                              modules={QUILL_MODULES}
                              formats={QUILL_FORMATS}
                              placeholder="Click here to type the body of your letter..."
                              className="w-full"
                            />
                          )}
                        />
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-4 text-sm font-semibold">
                        Body Section is hidden. Enable it in Layout & Settings.
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: parts?.after || '' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper to generate the final HTML combining all sections (matches issued-letter print layout)
export function generateLetterParts(data, company, sections) {
  const cName = company.name
  const co = { ...company }

  const siteSettings = {
    signatures: company.signatures || {},
    sealUrl: company.seal || '',
    quotationDirectorName: '',
  }

  let before = ''
  let after = ''
  let body = ''

  if (sections.header) {
    before += buildLetterheadHtml(co)
  }

  if (sections.info) {
    before += buildRefDateHtml(
      data.letterRef,
      data.issuedDate
        ? new Date(data.issuedDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
    )
  }

  if (sections.from || sections.to) {
    before += `<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:24px;font-size:10pt">`
    if (sections.to) {
      before += `
        <div style="flex:1;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <p style="margin:0 0 6px;font-size:9pt;font-weight:700;color:#94a3b8;text-transform:uppercase">To</p>
          <p style="margin:0;font-weight:700;color:#0f172a">${data.recipientName || ''}</p>
          ${data.recipientDesignation ? `<p style="margin:4px 0 0;color:#475569">${data.recipientDesignation}</p>` : ''}
          ${data.recipientCompany ? `<p style="margin:2px 0 0;color:#475569">${data.recipientCompany}</p>` : ''}
          ${data.recipientAddress ? `<p style="margin:4px 0 0;color:#475569;white-space:pre-wrap">${data.recipientAddress}</p>` : ''}
        </div>`
    }
    if (sections.from) {
      before += `
        <div style="flex:1;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:right">
          <p style="margin:0 0 6px;font-size:9pt;font-weight:700;color:#94a3b8;text-transform:uppercase">From</p>
          <p style="margin:0;font-weight:700;color:#0f172a">${data.senderName || ''}</p>
          ${data.senderDesignation ? `<p style="margin:4px 0 0;color:#475569">${data.senderDesignation}</p>` : ''}
          ${data.senderDepartment ? `<p style="margin:2px 0 0;color:#475569">${data.senderDepartment}</p>` : ''}
        </div>`
    }
    before += `</div>`
  }

  if (sections.info && data.subject) {
    before += `<h2 style="margin:0 0 20px;font-size:15pt;font-weight:800;color:#0f172a;border-left:4px solid #0ea5e9;padding-left:12px">${data.subject}</h2>`
  }

  if (sections.body) {
    let parsedBody = data.bodyContent || ''
    parsedBody = parsedBody.replace(/{{EMPLOYEE_NAME}}/g, data.recipientName || 'Employee')
    parsedBody = parsedBody.replace(/{{DESIGNATION}}/g, data.recipientDesignation || 'Designation')
    parsedBody = parsedBody.replace(/{{COMPANY_NAME}}/g, cName)
    parsedBody = parsedBody.replace(/{{CURRENT_DATE}}/g, new Date().toLocaleDateString('en-LK'))
    body += `<div class="enterprise-letter-body letter-body">${parsedBody}</div>`
  }

  if (sections.signatures) {
    const sigPayload = letterSignaturesToPayload({
      activeRole: data.signatoryRole,
      includeSignature: data.includeSignature,
      includeSeal: data.includeSeal,
      signatory: {
        role: data.signatoryRole,
        name: data.signatoryName,
        title: data.signatoryTitle,
        data: data.signatoryData,
      },
      seal: { data: data.sealData },
    })
    after += buildSigsHtml(sigPayload, { siteSettings })
  }

  if (sections.footer) {
    after += ``
  }

  return { before, body, after, full: before + body + after }
}
