const Letter = require('../models/Letter');
const Employee = require('../models/Employee');
const SiteSetting = require('../models/SiteSetting');

async function getCompany() {
  const s = await SiteSetting.findOne().lean();
  return {
    name: s?.siteName || 'Raxwo Pvt Ltd',
    logo: s?.logoUrl || '',
    address: s?.contactAddress || 'Weliweriya, Sri Lanka',
    email: s?.contactEmail || 'hello@raxwo.com',
    phone: s?.contactPhone || '',
  };
}

const LETTER_TEMPLATES = {
  offer: (emp, data, co) => `
OFFER LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-OFR-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to offer you the position of ${emp.designation} in the ${emp.department} department at ${co.name}.

POSITION DETAILS:
  Position        : ${emp.designation}
  Department      : ${emp.department}
  Start Date      : ${data.startDate || 'To be confirmed'}
  Employment Type : Full-Time Permanent

COMPENSATION:
  Basic Salary    : LKR ${(emp.basicSalary||0).toLocaleString()} per month
  Allowances      : LKR ${(emp.allowances||0).toLocaleString()} per month
  Gross Salary    : LKR ${((emp.basicSalary||0)+(emp.allowances||0)).toLocaleString()} per month

This offer is subject to successful completion of all required background verification and documentation. Please confirm your acceptance within 7 days of receipt.

We look forward to welcoming you to the team.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  appointment: (emp, data, co) => `
APPOINTMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-APT-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to appoint you as ${emp.designation} at ${co.name}, effective from ${emp.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-LK') : 'the agreed date'}.

EMPLOYMENT DETAILS:
  Employee No     : ${emp.employeeNo}
  Department      : ${emp.department}
  Designation     : ${emp.designation}
  EPF No          : ${emp.epfNumber || 'Pending Registration'}

REMUNERATION:
  Basic Salary    : LKR ${(emp.basicSalary||0).toLocaleString()} per month
  Allowances      : LKR ${(emp.allowances||0).toLocaleString()} per month
  EPF (Emp 8%)    : LKR ${Math.round((emp.basicSalary||0)*0.08).toLocaleString()} per month

Please report to the HR Department to complete all onboarding documentation before your start date.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  internship: (emp, data, co) => `
INTERNSHIP APPOINTMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-INT-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to appoint you as an Intern in the ${emp.department} department at ${co.name}.

INTERNSHIP DETAILS:
  Intern Name     : ${emp.userId.name}
  Department      : ${emp.department}
  Supervisor      : ${data.supervisor || 'Department Head'}
  Start Date      : ${data.startDate || new Date().toLocaleDateString('en-LK')}
  End Date        : ${data.endDate || 'To be confirmed'}
  Duration        : ${data.duration || 'As agreed'}

STIPEND / ALLOWANCE:
  Monthly Stipend : LKR ${(emp.basicSalary||0).toLocaleString()} per month

TERMS & CONDITIONS:
  1. This internship is for the specified duration only and does not constitute permanent employment.
  2. The intern is expected to maintain professional conduct and observe company policies.
  3. Confidentiality of company information must be maintained at all times.
  4. A certificate of internship will be issued upon successful completion.

We wish you a productive and enriching internship experience.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  contract: (emp, data, co) => `
CONTRACT EMPLOYMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-CTR-${emp.employeeNo}

Dear ${emp.userId.name},

This letter confirms your engagement as a Contract Employee with ${co.name} under the following terms:

CONTRACT DETAILS:
  Employee No     : ${emp.employeeNo}
  Position        : ${emp.designation}
  Department      : ${emp.department}
  Contract Start  : ${data.startDate || new Date().toLocaleDateString('en-LK')}
  Contract End    : ${data.endDate || 'To be specified'}
  Contract Type   : Fixed-Term Contract

COMPENSATION:
  Basic Salary    : LKR ${(emp.basicSalary||0).toLocaleString()} per month
  Allowances      : LKR ${(emp.allowances||0).toLocaleString()} per month

TERMS & CONDITIONS:
  1. This contract is for the stated period and may be renewed by mutual agreement.
  2. Either party may terminate with ${data.noticePeriod || '30 days'} written notice.
  3. The employee is expected to complete all assigned deliverables within the contract period.
  4. Company policies and confidentiality obligations apply throughout the contract period.
  5. Benefits as applicable under this contract are limited to those specified herein.

Please sign and return a copy of this letter as acknowledgment.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  part_time: (emp, data, co) => `
PART-TIME EMPLOYMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-PTE-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to confirm your appointment as a Part-Time Employee with ${co.name}.

EMPLOYMENT DETAILS:
  Employee No     : ${emp.employeeNo}
  Position        : ${emp.designation}
  Department      : ${emp.department}
  Working Hours   : ${data.workingHours || 'As agreed'}
  Working Days    : ${data.workingDays || 'As agreed'}
  Start Date      : ${data.startDate || new Date().toLocaleDateString('en-LK')}

COMPENSATION:
  Hourly Rate     : LKR ${data.hourlyRate || 'As agreed'}
  Monthly Pay     : LKR ${(emp.basicSalary||0).toLocaleString()} per month (estimated)

TERMS & CONDITIONS:
  1. Employment is on a part-time basis and does not guarantee full-time status.
  2. You are required to adhere to the agreed schedule and company policies.
  3. This arrangement may be reviewed or modified by mutual agreement.
  4. Confidentiality obligations apply at all times.

We look forward to your contributions to the team.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  resignation: (emp, data, co) => `
RESIGNATION ACCEPTANCE LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-RES-${emp.employeeNo}

Dear ${emp.userId.name},

We acknowledge receipt of your resignation letter dated ${data.resignationDate || new Date().toLocaleDateString('en-LK')}.

This letter confirms the acceptance of your resignation from the position of ${emp.designation} in the ${emp.department} department at ${co.name}.

RESIGNATION DETAILS:
  Employee No         : ${emp.employeeNo}
  Position            : ${emp.designation}
  Department          : ${emp.department}
  Resignation Date    : ${data.resignationDate || new Date().toLocaleDateString('en-LK')}
  Last Working Date   : ${data.endDate || 'To be confirmed'}
  Notice Period       : ${data.noticePeriod || '30 days'}

Please ensure the following before your last working day:
  1. Complete handover of all pending assignments and responsibilities.
  2. Return all company assets, equipment, and access credentials.
  3. Settlement of any outstanding financial obligations.
  4. Complete exit interview with the HR Department.

We thank you for your contributions during your tenure and wish you the very best in your future endeavors.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  experience: (emp, data, co) => `
EXPERIENCE / SERVICE LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-EXP-${emp.employeeNo}

TO WHOM IT MAY CONCERN

This is to certify that ${emp.userId.name} (NIC: ${emp.nic || 'N/A'}) was employed at ${co.name} as ${emp.designation} in the ${emp.department} department.

EMPLOYMENT DETAILS:
  Employee No     : ${emp.employeeNo}
  Designation     : ${emp.designation}
  Department      : ${emp.department}
  Period of Service: ${emp.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-LK') : 'N/A'} to ${data.endDate || new Date().toLocaleDateString('en-LK')}

During the period of service, ${emp.userId.name} demonstrated excellent professional conduct and technical skills. We wish them every success in their future career.

This letter is issued upon request for official purposes only.

Sincerely,

${data.issuedByName}
Director of Human Resources
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  salary: (emp, data, co) => `
SALARY CONFIRMATION LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-SAL-${emp.employeeNo}

TO WHOM IT MAY CONCERN

This is to certify that ${emp.userId.name}, Employee No: ${emp.employeeNo}, is currently employed at ${co.name} as ${emp.designation} in the ${emp.department} department.

SALARY DETAILS (as of ${new Date().toLocaleDateString('en-LK')}):
  Basic Salary    : LKR ${(emp.basicSalary||0).toLocaleString()} per month
  Allowances      : LKR ${(emp.allowances||0).toLocaleString()} per month
  Gross Salary    : LKR ${((emp.basicSalary||0)+(emp.allowances||0)).toLocaleString()} per month

This letter is issued for ${data.purpose || 'official purposes'} only and should not be used for any other purpose.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  confirmation: (emp, data, co) => `
CONFIRMATION OF EMPLOYMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-CNF-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to confirm your permanent appointment as ${emp.designation} in the ${emp.department} department of ${co.name}, effective from ${data.confirmationDate || new Date().toLocaleDateString('en-LK')}.

EMPLOYMENT DETAILS:
  Employee No     : ${emp.employeeNo}
  Designation     : ${emp.designation}
  Department      : ${emp.department}
  Confirmation Date: ${data.confirmationDate || new Date().toLocaleDateString('en-LK')}

Your terms and conditions of employment remain as per your original appointment letter, subject to periodic reviews. Benefits and entitlements applicable to permanent employees will take effect from the confirmation date.

Congratulations on your successful confirmation! We look forward to your continued contributions.

Sincerely,

${data.issuedByName}
Human Resources Department
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  service_agreement: (emp, data, co) => `
SERVICE AGREEMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-SVC-${emp.employeeNo}

This agreement is entered into between ${co.name} (hereinafter "the Company") and ${emp.userId.name} (hereinafter "the Employee").

AGREEMENT DETAILS:
  Employee        : ${emp.userId.name} (${emp.employeeNo})
  Position        : ${emp.designation}
  Department      : ${emp.department}
  Service Start   : ${data.startDate || new Date().toLocaleDateString('en-LK')}

SCOPE OF SERVICES:
  ${data.scope || 'As per role responsibilities, company policy, and assigned duties.'}

COMPENSATION:
  Basic Salary    : LKR ${(emp.basicSalary||0).toLocaleString()} per month
  Allowances      : LKR ${(emp.allowances||0).toLocaleString()} per month

Both parties agree to comply with company policies including confidentiality, professional conduct, and operational standards. This agreement is governed by the laws of Sri Lanka.

Signed & Acknowledged:

${data.issuedByName}
Authorized Representative
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,

  custom: (emp, data, co) => `
${data.letterTitle || 'OFFICIAL LETTER'}

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: ${co.name.replace(/\s/g,'-').toUpperCase()}-CST-${emp.employeeNo}

Dear ${emp.userId.name},

${data.customBody || 'Please replace this with your custom letter content.'}

EMPLOYEE DETAILS:
  Employee No     : ${emp.employeeNo}
  Position        : ${emp.designation}
  Department      : ${emp.department}

Sincerely,

${data.issuedByName}
${data.signatoryTitle || 'Human Resources Department'}
${co.name}
${co.address}
${co.email} | ${co.phone}
  `,
};

// @desc    Generate letter
// @route   POST /api/letters/generate
exports.generateLetter = async (req, res, next) => {
  try {
    const { employeeId, type, data = {} } = req.body;
    const employee = await Employee.findById(employeeId).populate('userId', 'name email');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const templateFn = LETTER_TEMPLATES[type];
    if (!templateFn) return res.status(400).json({ success: false, message: 'Invalid letter type' });

    const company = await getCompany();
    data.issuedByName = req.user.name;
    const content = templateFn(employee, data, company);
    const typeLabels = {
      offer:'Offer', appointment:'Appointment', internship:'Internship Appointment',
      contract:'Contract Employment', part_time:'Part-Time Employment',
      resignation:'Resignation Acceptance', experience:'Experience',
      salary:'Salary Confirmation', confirmation:'Employment Confirmation',
      service_agreement:'Service Agreement', custom: data.letterTitle || 'Custom'
    };
    const title = `${typeLabels[type] || type} Letter - ${employee.userId.name}`;

    const letter = await Letter.create({
      employee: employeeId,
      type,
      title,
      content,
      issuedBy: req.user._id,
    });

    res.status(201).json({ success: true, letter });
  } catch (err) { next(err); }
};

// @desc    Get all letters
// @route   GET /api/letters
exports.getLetters = async (req, res, next) => {
  try {
    const { employeeId, type } = req.query;
    let query = {};
    if (employeeId) query.employee = employeeId;
    if (type) query.type = type;
    const letters = await Letter.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: letters.length, letters });
  } catch (err) { next(err); }
};

// @desc    Get single letter
// @route   GET /api/letters/:id
exports.getLetter = async (req, res, next) => {
  try {
    const letter = await Letter.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name');
    if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });
    res.json({ success: true, letter });
  } catch (err) { next(err); }
};

// @desc    Get my letters (employee)
// @route   GET /api/letters/my
exports.getMyLetters = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const letters = await Letter.find({ employee: employee._id }).sort({ createdAt: -1 });
    res.json({ success: true, letters });
  } catch (err) { next(err); }
};

// @desc    Update letter content/details
// @route   PUT /api/letters/:id
exports.updateLetter = async (req, res, next) => {
  try {
    const { title, content, type } = req.body;
    const update = {
      ...(title ? { title } : {}),
      ...(content ? { content } : {}),
      ...(type ? { type } : {}),
    };
    const letter = await Letter.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name');
    if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });
    res.json({ success: true, letter });
  } catch (err) { next(err); }
};

// @desc    Get company branding for letters
// @route   GET /api/letters/company-info
exports.getCompanyInfo = async (req, res, next) => {
  try {
    const company = await getCompany();
    res.json({ success: true, company });
  } catch (err) { next(err); }
};
