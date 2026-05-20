import React, { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { FiSave, FiX, FiRefreshCcw, FiImage, FiSettings, FiLayout, FiEye, FiDownload, FiPrinter } from 'react-icons/fi'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { absoluteMediaUrl } from '../../lib/media'
import DocumentAssetPicker from '../branding/DocumentAssetPicker'
import SignaturePad from './SignaturePad'
import { companyContactLines } from '../../lib/companyBranding'

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
  company, 
  employeesList = [],
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

  // We initialize the form with structured data if it exists, otherwise defaults.
  const defaultValues = {
    // DB Meta
    dbEmployeeId: initialData?.employee?._id || initialData?.employee || employee?._id || '',
    dbLetterType: initialData?.type || 'custom',

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
    
    // To
    recipientName: initialData?.structuredData?.recipientName || employee?.userId?.name || '',
    recipientDesignation: initialData?.structuredData?.recipientDesignation || employee?.designation || '',
    recipientCompany: initialData?.structuredData?.recipientCompany || '',
    recipientAddress: initialData?.structuredData?.recipientAddress || '',
    
    // Body
    bodyContent: initialData?.structuredData?.bodyContent || initialData?.content || '',
    
    // Signatures
    hrSignatureName: initialData?.signatures?.hr?.name || company?.signatures?.hr?.name || '',
    hrSignatureTitle: initialData?.signatures?.hr?.title || 'Human Resources',
    hrSignatureData: initialData?.signatures?.hr?.data || '',
    
    managerSignatureName: initialData?.signatures?.manager?.name || employee?.manager?.name || '',
    managerSignatureTitle: initialData?.signatures?.manager?.title || 'Line Manager',
    managerSignatureData: initialData?.signatures?.manager?.data || '',
    
    directorSignatureName: initialData?.signatures?.director?.name || '',
    directorSignatureTitle: initialData?.signatures?.director?.title || 'Director',
    directorSignatureData: initialData?.signatures?.director?.data || '',
    
    sealData: initialData?.signatures?.seal?.data || company?.seal || '',
    
    // Settings
    primaryColor: initialData?.structuredData?.primaryColor || '#1e3a8a',
    fontFamily: initialData?.structuredData?.fontFamily || "'Segoe UI', system-ui, sans-serif",
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
      title: data.subject,
      content: finalHtml,
      dbEmployeeId: data.dbEmployeeId,
      dbLetterType: data.dbLetterType,
      structuredData: {
        ...data,
        sections
      },
      signatures: {
        hr: { name: data.hrSignatureName, title: data.hrSignatureTitle, data: data.hrSignatureData },
        manager: { name: data.managerSignatureName, title: data.managerSignatureTitle, data: data.managerSignatureData },
        director: { name: data.directorSignatureName, title: data.directorSignatureTitle, data: data.directorSignatureData },
        seal: { data: data.sealData }
      }
    }
    onSave(payload)
  }

  // Live Preview Component
  const LivePreview = () => {
    const parts = generateLetterParts(formData, company, sections)
    return (
      <div className="bg-white shadow-xl rounded-xl border border-slate-200 overflow-hidden mx-auto max-w-[794px] min-h-[1123px] relative print:shadow-none print:border-none flex flex-col">
        <style dangerouslySetInnerHTML={{__html: `
          .enterprise-letter { font-family: ${formData.fontFamily}; color: #0f172a; font-size: 11pt; line-height: 1.6; padding: 48px; display: flex; flex-direction: column; min-height: 100%; flex: 1; }
          .enterprise-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${formData.primaryColor}; padding-bottom: 20px; margin-bottom: 24px; }
          .enterprise-logo { max-height: 60px; max-width: 220px; object-fit: contain; }
          .enterprise-co-info { text-align: right; }
          .enterprise-co-name { font-size: 20px; font-weight: 800; color: ${formData.primaryColor}; margin: 0; }
          .enterprise-co-contact { font-size: 9.5pt; color: #475569; margin-top: 8px; line-height: 1.5; }
          .enterprise-meta-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 10pt; }
          .enterprise-meta-col { display: flex; flex-direction: column; gap: 4px; }
          .enterprise-meta-label { color: #64748b; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
          .enterprise-subject { font-size: 13pt; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 20px 0; }
          .enterprise-body { flex: 1; min-height: 300px; }
          .enterprise-body p { margin-bottom: 12px; }
          .enterprise-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .enterprise-body td, .enterprise-body th { border: 1px solid #e2e8f0; padding: 8px; }
          .enterprise-sig-section { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
          .enterprise-sig-block { display: flex; flex-direction: column; align-items: center; min-width: 150px; }
          .enterprise-sig-img { height: 60px; object-fit: contain; margin-bottom: 8px; }
          .enterprise-sig-line { width: 100%; border-top: 1px solid #000; margin: 8px 0; }
          .enterprise-sig-name { font-weight: 600; font-size: 10pt; }
          .enterprise-sig-title { font-size: 9pt; color: #64748b; }
          .enterprise-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
        `}} />
        <div className="enterprise-letter" dangerouslySetInnerHTML={{ __html: parts.full }} />
      </div>
    )
  }

  const parts = activeTab === 'content' || activeTab === 'preview' ? generateLetterParts(formData, company, sections) : null;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
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
          <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
            <FiX /> Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit(handleSave)} 
            disabled={isSaving}
            className="btn-primary btn-sm"
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
                  
                  {sections.header && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Custom Header (Override)</h3>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" {...register('overrideHeader')} className="rounded border-slate-300 text-primary" />
                        Use custom logo and name
                      </label>
                      {formData.overrideHeader && (
                        <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <DocumentAssetPicker 
                            label="Custom Logo" 
                            value={{ data: formData.customLogo }} 
                            onChange={(v) => setValue('customLogo', v.data)} 
                          />
                          <div>
                            <label className="form-label text-xs">Company Name Override</label>
                            <input {...register('customCompanyName')} className="form-input text-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                          <select {...register('dbEmployeeId')} className="form-select text-xs">
                            <option value="">-- Select Employee --</option>
                            {employeesList.map(e => (
                              <option key={e._id} value={e._id}>{e.userId?.name} ({e.designation})</option>
                            ))}
                          </select>
                          <select {...register('dbLetterType')} className="form-select text-xs">
                            <option value="custom">Custom Letter</option>
                            {letterTypesList.filter(t => t.value !== 'custom').map(t => (
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
                      <h3 className="font-bold text-sm text-slate-800">Signatures & Seals</h3>
                      
                      <div className="space-y-2 border-b pb-4">
                        <p className="text-xs font-semibold text-slate-600">HR / Authorized Signatory</p>
                        <input {...register('hrSignatureName')} placeholder="Name" className="form-input text-xs" />
                        <input {...register('hrSignatureTitle')} placeholder="Title" className="form-input text-xs" />
                        <DocumentAssetPicker 
                          label="Upload Signature" 
                          value={{ data: formData.hrSignatureData }} 
                          onChange={(v) => setValue('hrSignatureData', v.data)} 
                        />
                      </div>

                      <div className="space-y-2 border-b pb-4">
                        <p className="text-xs font-semibold text-slate-600">Line Manager (Optional)</p>
                        <input {...register('managerSignatureName')} placeholder="Name" className="form-input text-xs" />
                        <input {...register('managerSignatureTitle')} placeholder="Title" className="form-input text-xs" />
                        <DocumentAssetPicker 
                          label="Upload Signature" 
                          value={{ data: formData.managerSignatureData }} 
                          onChange={(v) => setValue('managerSignatureData', v.data)} 
                        />
                      </div>

                      <div className="space-y-2 border-b pb-4">
                        <p className="text-xs font-semibold text-slate-600">Director (Optional)</p>
                        <input {...register('directorSignatureName')} placeholder="Name" className="form-input text-xs" />
                        <input {...register('directorSignatureTitle')} placeholder="Title" className="form-input text-xs" />
                        <DocumentAssetPicker 
                          label="Upload Signature" 
                          value={{ data: formData.directorSignatureData }} 
                          onChange={(v) => setValue('directorSignatureData', v.data)} 
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-600">Company Seal</p>
                        <DocumentAssetPicker 
                          label="Upload Seal" 
                          assetType="seal"
                          value={{ data: formData.sealData }} 
                          onChange={(v) => setValue('sealData', v.data)} 
                        />
                      </div>

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
                    .enterprise-letter { font-family: ${formData.fontFamily}; color: #0f172a; font-size: 11pt; line-height: 1.6; padding: 48px; display: flex; flex-direction: column; min-height: 100%; flex: 1; }
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

// Helper to generate the final HTML combining all sections
function generateLetterParts(data, company, sections) {
  const cName = (data.overrideHeader && data.customCompanyName) ? data.customCompanyName : company.name
  const logoUrl = (data.overrideHeader && data.customLogo) ? data.customLogo : absoluteMediaUrl(company.logoPath || company.logo)
  
  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" class="enterprise-logo" alt="${cName}" />` 
    : `<h1 class="enterprise-co-name">${cName}</h1>`

  const contactHtml = companyContactLines(company).map(l => `<div><span style="color:#94a3b8">${l.label}:</span> ${l.text}</div>`).join('')

  let before = ''
  let after = ''
  let body = ''

  if (sections.header) {
    before += `
      <div class="enterprise-header">
        <div>${logoHtml}</div>
        <div class="enterprise-co-info">
          ${logoUrl ? `<h2 class="enterprise-co-name" style="font-size:16px;">${cName}</h2>` : ''}
          <div class="enterprise-co-contact">${contactHtml}</div>
        </div>
      </div>
    `
  }

  before += `<div class="enterprise-meta-grid">`
  
  if (sections.info) {
    before += `
      <div class="enterprise-meta-col">
        <span class="enterprise-meta-label">Reference</span>
        <strong>${data.letterRef}</strong>
      </div>
      <div class="enterprise-meta-col" style="text-align: right;">
        <span class="enterprise-meta-label">Date</span>
        <strong>${new Date(data.issuedDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric'})}</strong>
      </div>
    `
  }
  
  before += `</div>`

  if (sections.from || sections.to) {
    before += `<div class="enterprise-meta-grid" style="margin-top: 20px;">`
    
    if (sections.to) {
      before += `
        <div class="enterprise-meta-col">
          <span class="enterprise-meta-label">To</span>
          <strong style="font-size: 11pt;">${data.recipientName}</strong>
          ${data.recipientDesignation ? `<span>${data.recipientDesignation}</span>` : ''}
          ${data.recipientCompany ? `<span>${data.recipientCompany}</span>` : ''}
          ${data.recipientAddress ? `<span style="white-space: pre-wrap;">${data.recipientAddress}</span>` : ''}
        </div>
      `
    }

    if (sections.from) {
      before += `
        <div class="enterprise-meta-col" style="text-align: right;">
          <span class="enterprise-meta-label">From</span>
          <strong style="font-size: 11pt;">${data.senderName}</strong>
          ${data.senderDesignation ? `<span>${data.senderDesignation}</span>` : ''}
          ${data.senderDepartment ? `<span>${data.senderDepartment}</span>` : ''}
        </div>
      `
    }

    before += `</div>`
  }

  if (sections.info && data.subject) {
    before += `<h3 class="enterprise-subject">${data.subject}</h3>`
  }

  if (sections.body) {
    let parsedBody = data.bodyContent || ''
    parsedBody = parsedBody.replace(/{{EMPLOYEE_NAME}}/g, data.recipientName || 'Employee')
    parsedBody = parsedBody.replace(/{{DESIGNATION}}/g, data.recipientDesignation || 'Designation')
    parsedBody = parsedBody.replace(/{{COMPANY_NAME}}/g, cName)
    parsedBody = parsedBody.replace(/{{CURRENT_DATE}}/g, new Date().toLocaleDateString('en-LK'))

    body += `<div class="enterprise-body">${parsedBody}</div>`
  }

  if (sections.signatures) {
    after += `<div class="enterprise-sig-section">`
    
    const renderSig = (name, title, dataUrl) => {
      if (!name && !title && !dataUrl) return ''
      return `
        <div class="enterprise-sig-block">
          ${dataUrl ? `<img src="${dataUrl}" class="enterprise-sig-img" />` : '<div style="height: 60px;"></div>'}
          <div class="enterprise-sig-line"></div>
          <span class="enterprise-sig-name">${name}</span>
          <span class="enterprise-sig-title">${title}</span>
        </div>
      `
    }

    after += renderSig(data.hrSignatureName, data.hrSignatureTitle, data.hrSignatureData)
    after += renderSig(data.managerSignatureName, data.managerSignatureTitle, data.managerSignatureData)
    after += renderSig(data.directorSignatureName, data.directorSignatureTitle, data.directorSignatureData)

    if (data.sealData) {
      after += `
        <div class="enterprise-sig-block" style="justify-content: center;">
          <img src="${data.sealData}" style="max-height: 90px; max-width: 120px; object-fit: contain; mix-blend-mode: multiply;" />
          <span class="enterprise-sig-title" style="margin-top: 4px;">Company Seal</span>
        </div>
      `
    }

    after += `</div>`
  }

  if (sections.footer) {
    after += `
      <div class="enterprise-footer">
        <p>${cName} ${company.address ? `· ${company.address}` : ''}</p>
        <p style="margin-top:4px;">This document was generated electronically and is valid with authorized signatures where applied.</p>
      </div>
    `
  }

  return { before, body, after, full: before + body + after }
}
