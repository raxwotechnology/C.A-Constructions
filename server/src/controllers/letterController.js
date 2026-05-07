const Letter = require('../models/Letter');
const Employee = require('../models/Employee');

const LETTER_TEMPLATES = {
  offer: (emp, data) => `
OFFER LETTER

Date: ${new Date().toLocaleDateString('en-LK')}

Dear ${emp.userId.name},

We are pleased to offer you the position of ${emp.designation} in our ${emp.department} department at Raxwo Pvt Ltd.

Position: ${emp.designation}
Department: ${emp.department}
Start Date: ${data.startDate || emp.joinedDate?.toLocaleDateString('en-LK') || 'TBD'}
Basic Salary: LKR ${emp.basicSalary?.toLocaleString()} per month
Allowances: LKR ${emp.allowances?.toLocaleString()} per month

This offer is subject to successful completion of background verification.

Please confirm your acceptance within 7 days.

Sincerely,
${data.issuedByName}
Raxwo Pvt Ltd
Colombo, Sri Lanka
  `,

  appointment: (emp, data) => `
APPOINTMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: RXW-APT-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to appoint you as ${emp.designation} at Raxwo Pvt Ltd with effect from ${emp.joinedDate?.toLocaleDateString('en-LK')}.

Employee No: ${emp.employeeNo}
Department: ${emp.department}
Designation: ${emp.designation}
EPF No: ${emp.epfNumber || 'Pending'}

Your remuneration package is as follows:
- Basic Salary: LKR ${emp.basicSalary?.toLocaleString()}
- Allowances: LKR ${emp.allowances?.toLocaleString()}
- EPF (Employee - 8%): LKR ${Math.round(emp.basicSalary * 0.08)?.toLocaleString()}

Please report to HR to complete all onboarding documentation.

Sincerely,
${data.issuedByName}
Human Resources Department
Raxwo Pvt Ltd
  `,

  experience: (emp, data) => `
EXPERIENCE / SERVICE LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: RXW-EXP-${emp.employeeNo}

TO WHOM IT MAY CONCERN

This is to certify that ${emp.userId.name} (NIC: ${emp.nic || 'N/A'}) has been employed at Raxwo Pvt Ltd as ${emp.designation} in the ${emp.department} department.

Period of Service: ${emp.joinedDate?.toLocaleDateString('en-LK')} to ${data.endDate || new Date().toLocaleDateString('en-LK')}

During this period, ${emp.userId.name} has demonstrated excellent professional conduct and technical skills. We wish them all the best in their future endeavors.

Sincerely,
${data.issuedByName}
Director of Human Resources
Raxwo Pvt Ltd
  `,

  salary: (emp, data) => `
SALARY CONFIRMATION LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: RXW-SAL-${emp.employeeNo}

TO WHOM IT MAY CONCERN

This is to certify that ${emp.userId.name}, Employee No: ${emp.employeeNo}, is currently employed at Raxwo Pvt Ltd as ${emp.designation}.

Current Salary Details:
- Basic Salary: LKR ${emp.basicSalary?.toLocaleString()} per month
- Allowances: LKR ${emp.allowances?.toLocaleString()} per month
- Gross Salary: LKR ${(emp.basicSalary + emp.allowances)?.toLocaleString()} per month

This letter is issued for ${data.purpose || 'official purposes'} only.

Sincerely,
${data.issuedByName}
Human Resources Department
Raxwo Pvt Ltd
  `,

  service_agreement: (emp, data) => `
SERVICE AGREEMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: RXW-SVC-${emp.employeeNo}

This agreement confirms that ${emp.userId.name} (${emp.employeeNo}) serves as ${emp.designation} in the ${emp.department} department.

Service Start Date: ${data.startDate || emp.joinedDate?.toLocaleDateString('en-LK') || 'TBD'}
Scope of Service: ${data.scope || 'As per role responsibilities and assigned company policies.'}
Compensation: Basic LKR ${emp.basicSalary?.toLocaleString()} + Allowances LKR ${emp.allowances?.toLocaleString()}

Both parties agree to comply with company confidentiality, conduct, and operational standards.

Sincerely,
${data.issuedByName}
Raxwo Pvt Ltd
  `,

  confirmation: (emp, data) => `
CONFIRMATION OF EMPLOYMENT LETTER

Date: ${new Date().toLocaleDateString('en-LK')}
Ref: RXW-CNF-${emp.employeeNo}

Dear ${emp.userId.name},

We are pleased to confirm your permanent appointment as ${emp.designation} in the ${emp.department} department of Raxwo Pvt Ltd, effective from ${data.confirmationDate || new Date().toLocaleDateString('en-LK')}.

Your terms and conditions of employment remain as per your original appointment letter, subject to annual reviews.

Congratulations on your confirmation!

Sincerely,
${data.issuedByName}
Human Resources Department
Raxwo Pvt Ltd
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

    data.issuedByName = req.user.name;
    const content = templateFn(employee, data);
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Letter - ${employee.userId.name}`;

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
