const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Project = require('../models/Project');
const BOQ = require('../models/BOQ');
const Quotation = require('../models/Quotation');
const Agreement = require('../models/Agreement');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/raxwo_erp';

async function seedKelaniyaProject() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB for Kelaniya Site Seeding');

    // 1. Find or Create Client Account for Mr. P.L.L.P.C. Perera
    let client = await User.findOne({ name: /P\.L\.L\.P\.C\. Perera/i });
    if (!client) {
      client = await User.create({
        name: 'Mr. P.L.L.P.C. Perera',
        email: 'pllpc.perera@example.com',
        phone: '0771234567',
        password: 'Client@2026',
        role: 'client',
        company: 'R A Creations / R A Constructions',
      });
      console.log('✓ Client Created: Mr. P.L.L.P.C. Perera');
    } else {
      console.log('✓ Client Found: Mr. P.L.L.P.C. Perera');
    }

    // 2. Find or Create Project for Site: Kalaniya
    let project = await Project.findOne({ name: /Kalaniya/i });
    if (!project) {
      project = await Project.create({
        name: 'Site : Kalaniya (Mr. P.L.L.P.C. Perera)',
        code: 'PRJ-KALANIYA-2026',
        clientName: 'Mr. P.L.L.P.C. Perera',
        location: 'Kalaniya',
        client: client._id,
        contractValue: 15000000,
        estimatedCost: 15000000,
        status: 'Active',
        startDate: new Date('2026-06-11'),
        expectedCompletionDate: new Date('2027-06-11'),
        description: 'Turnkey House Construction Site at Kalaniya for Mr. P.L.L.P.C. Perera. Total Value: LKR 15,000,000.00.',
      });
      console.log('✓ Project Created: Site : Kalaniya');
    } else {
      project.contractValue = 15000000;
      project.estimatedCost = 15000000;
      project.client = client._id;
      project.clientName = 'Mr. P.L.L.P.C. Perera';
      await project.save();
      console.log('✓ Project Updated: Site : Kalaniya');
    }

    // 3. Seed 23 BOQ Items
    const rawBoqItems = [
      { itemNo: '01', description: 'කම්කරු නවාතැන් සහ වැසිකිලි සෑදීම', quantity: 1, unit: 'LS', rate: 60000, amount: 60000 },
      { itemNo: '02.01', description: 'දිග අඩි 03\' පළල අඩි 03\' ගැඹුර අඩි 03\' වන බේස්වලවල් 07 කව. 12mm කම්බි 4 බැගින් එක් කොලම් එකකට යෙදීම...', quantity: 7, unit: 'nos', rate: 40097.14, amount: 280680 },
      { itemNo: '02.02', description: 'දිග අඩි 02\' පළල අඩි 02\' ගැඹුර අඩි 02\' බේස්වලවල් 07 කව. 12mm කම්බි 4 බැගින් එක් කොලම් එකකට යෙදීම...', quantity: 7, unit: 'nos', rate: 10285.71, amount: 72000 },
      { itemNo: '03', description: 'සැලසුමට අනුකූලව 6" x 9" කළුගල් වලින් අත්තිවාරම බැඳීම. කාණු කැපීම...', quantity: 1, unit: 'LS', rate: 84000, amount: 84000 },
      { itemNo: '04', description: 'සැලසුමට අනුකූලව උස අගල් 12" ක් සහ පළල 09" වන පොලොව උඩට යෙදීම (ප්ලින්ත් බීම් 12mm කම්බි 04 බැගින්)...', quantity: 1, unit: 'LS', rate: 654500, amount: 654500 },
      { itemNo: '05', description: 'පස් පිරවීම දළ වශයෙන් කියුබ් 20 ක් පමණ (පස් පිරවීම, පස් තැලීම)', quantity: 20, unit: 'cubes', rate: 10000, amount: 200000 },
      { itemNo: '06', description: 'සැලසුමට අනුකූලව බිම් මහල බ්ලොක් ගල් බැඳීම. 9" x 9" කොන්ක්‍රීට් කොලම් 07ක් උස අඩි 9 ½ ක් දක්වා කොන්ක්‍රීට් කිරීම...', quantity: 1, unit: 'LS', rate: 1132350, amount: 1132350 },
      { itemNo: '07', description: '1000 ෂීට් පොලිතින් එක යොදා වැලිඩ්‍රා කාපෙට්, සීමන්ති සහ සම්පූර්ණ නිවස ඇතුළත අගල් 2" සනකමට කොන්ක්‍රීට් කිරීම', quantity: 1, unit: 'LS', rate: 385000, amount: 385000 },
      { itemNo: '08', description: '12" x 9" බීම් දැමීම. 12mm කම්බි 04 බැගින්... ස්ලැබ් එකේ සැකිල්ල ගසා 10mm කම්බි අගල් 07" x 08" පරතරයට බැඳ...', quantity: 1, unit: 'LS', rate: 921000, amount: 921000 },
      { itemNo: '09', description: 'සැලසුමට අනුකූලව පළමු මහලේ බ්ලොක්ගල් බැඳීම. කම්බි 02 ක බැගින් කොලම් එකක් සාදනු ලැබේ. උඩුමහලේ බිත්ති සියලෙන්ම...', quantity: 1, unit: 'LS', rate: 604500, amount: 604500 },
      { itemNo: '10', description: 'අගල් 4" සනකමට වතුර ටැංකි ස්ලැබ් එක දැමීම අගල් 5" සනකමට ඉදිරිපස පනෙල් වල ස්ලැබ් එක දැමීම', quantity: 1, unit: 'LS', rate: 214000, amount: 214000 },
      { itemNo: '11', description: 'බිම් මහලේ සහ පළමු මහලේ ෆිනිෂින් වහල ගැසීම (කෙම්පස් ලී මගින්) දෑව ආරක්ෂක ගෑම, අස්බැස්ටෝස් ෂීට් මගින් වහලය සෙවිලි කිරීම', quantity: 1, unit: 'LS', rate: 2094300, amount: 2094300 },
      { itemNo: '12', description: 'බිම් මහල උඩු මහල සැලසුමට අනුව වයරින් කිරීම (Main wire, Earth wire, Bulbs, Plugs, Main breaker 32A, Trip switch 30mA, CCTV 04)', quantity: 1, unit: 'LS', rate: 525000, amount: 525000 },
      { itemNo: '13', description: 'සැලසුමට අනුව නිවසේ ඇතුලත 4"x3" ප්‍රමාණයෙන් කොස් ලී වලින් උළුවහු හා පනෙල් තැබීම. දොර පනෙල් මහෝගනී දැවයෙන් සවි කිරීම', quantity: 1, unit: 'LS', rate: 1281750, amount: 1281750 },
      { itemNo: '14', description: 'බිම් මහල හා උඩුමහල ඇතුලත හා පිටත 1:5 අනුපාතයට කපරාරු කිරීම (කණු සහ බීම් ඇතුළත්ව)', quantity: 1, unit: 'LS', rate: 1111380, amount: 1111380 },
      { itemNo: '15', description: 'P.V.C. බට යෙදීම, වතුර ටැංකිය තැබීම (සෙප්ටික් ටෑන්ක්, සොකෙට් පිට්, වේස්ට් වෝටර් පිට් සෑදීම)', quantity: 1, unit: 'LS', rate: 240000, amount: 240000 },
      { itemNo: '16', description: 'නිවසේ බිම් මහල හා පළමු මහලේ ඇතුලත පොටි කෝට් 02 ක් සිලර් කෝට් 01 ක් හා තීන්ත කෝට් 02 ක් ආලේප කිරීම. පිටත බිත්ති පිලර් 01 & තීන්ත 02', quantity: 1, unit: 'LS', rate: 835890, amount: 835890 },
      { itemNo: '17', description: 'බාथरूम 02 හි ඇතුලත බිත්තිවල අගල් 8" ක් උසට වයිල් ඇතිරීම, පිටින්ස්, ඇලුමිනියම් දොරවල් සවිකිරීම හා water proofing කිරීම', quantity: 2, unit: 'sets', rate: 550000, amount: 1100000 },
      { itemNo: '18', description: 'නිවසේ දොර පනෙල් පියන් වෝටර් බේස් කිරීම', quantity: 1, unit: 'LS', rate: 426000, amount: 426000 },
      { itemNo: '19', description: 'සැලසුමට අනුව වැරන්ඩා, කාපොච් ඇතුළුව මුළු නිවසේම පොලොව ටයිල් කිරීම', quantity: 1, unit: 'LS', rate: 1159000, amount: 1159000 },
      { itemNo: '20', description: 'නිවසේ ඇතුළත ඇති කොන්ක්‍රීට් තරප්පු පෙලේ අත්වැල හා බැල්කනියේ අත්වැල නිම කිරීම (Box Bar)', quantity: 1, unit: 'LS', rate: 218650, amount: 218650 },
      { itemNo: '21', description: 'ECO BOARD යොදා ගෙන පෑන්ට්‍රි කබඩ් ගැසීම (ග්‍රැනයිට් ටොප් එක දැමීම, සිංකිය, අඩි 2" උසට වයිල් කිරීම හා ගෑස් ලිප සවිකිරීම)', quantity: 1, unit: 'LS', rate: 800000, amount: 800000 },
      { itemNo: '22', description: 'වැහි පිහිලි, Wall flashing සහ Down pipe සවිකිරීම', quantity: 1, unit: 'LS', rate: 425000, amount: 425000 },
      { itemNo: '23', description: 'Light fittings සවිකිරීම', quantity: 1, unit: 'LS', rate: 175000, amount: 175000 },
    ];

    const boqItems = rawBoqItems.map(item => ({
      billNo: 'BOQ - Kalaniya',
      itemCode: item.itemNo,
      description: item.description,
      unit: item.unit,
      estimatedQty: item.quantity,
      unitRate: item.rate,
      totalAmount: item.amount,
      status: 'Approved',
    }));

    await BOQ.deleteMany({ project: project._id });
    await BOQ.create({
      project: project._id,
      title: 'BOQ - Site: Kalaniya (Mr. P.L.L.P.C. Perera)',
      serviceType: 'Residential Construction',
      grandTotalEstimated: 15000000,
      finalContractValue: 15000000,
      items: boqItems,
    });
    console.log('✓ BOQ Created (23 items, total LKR 15,000,000.00)');

    // 4. Seed 16 Payment Schedule Stages
    const paymentStages = [
      { stageNo: 1, stageName: 'කම්කරු නවාතැන සහ වැසිකිලිය සෑදීම. පස් කැපීම (3\' x 3\' ) වලවල් පොලොව මට්ටම දක්වා කොන්ක්‍රීට් කිරීම', percentage: 2.91, amount: 436680 },
      { stageNo: 2, stageName: 'උස 12" හා පළල 09" ට බිම් අත්තිවාරම පිහිටි පොලොව උඩට යෙදීම, පස් පිරවීම. පොලොව කොන්ක්‍රීට් කිරීම', percentage: 8.93, amount: 1339500 },
      { stageNo: 3, stageName: 'බිම් මහලේ බිත්ති බැඳීම, 9" x 9" කොලම් කොන්ක්‍රීට් කිරීම, බිම් මහලේ ලින්ටල් දැමීම', percentage: 8.22, amount: 1232350 },
      { stageNo: 4, stageName: 'බිම්,ස්ලැබ් සහ පඩිපෙල ගසා කම්බි බැඳ වයරින් බට දමා බිම් හා ස්ලැබ් කොන්ක්‍රීට් කිරීම', percentage: 6.20, amount: 930000 },
      { stageNo: 5, stageName: 'පළමු මහලේ බිත්ති බැඳීම. අගල් 4" x 4" කොලම් යෙදීම, ලින්ටල් දැමීම, වතුර ටැංකිය තියන ස්ථානය හා බැල්කනි උඩ ස්ලැබ් දැමීම', percentage: 4.46, amount: 669500 },
      { stageNo: 6, stageName: 'බිම් මහලේ ෆිනිෂින් වහලය හා පළමු මහලේ ෆිනිෂින් වහල ගැසීම', percentage: 13.96, amount: 2094300 },
      { stageNo: 7, stageName: 'සියලුම උළුවහු පනෙල් තැබීම හා සවිකිරීම', percentage: 8.55, amount: 1281750 },
      { stageNo: 8, stageName: 'බිම් මහල හා පළමු මහල වයරින් කිරීම (cctv කැමරා 04 ක් සඳහා වයරින් කිරීම)', percentage: 3.50, amount: 525000 },
      { stageNo: 9, stageName: 'බිම් මහල හා පළමු මහල කපරාරු කිරීම', percentage: 7.41, amount: 1111380 },
      { stageNo: 10, stageName: 'නිවසේ බිම් මහල හා පළමු මහලේ ඇතුලත පොටි, සිලර් හා තීන්ත ආලේප කිරීම', percentage: 1.60, amount: 240000 },
      { stageNo: 11, stageName: 'නිවසේ ඇතුලත පොටි ඇදීම හා පිටත හා ඇතුලත බිත්ති වල තීන්ත ආලේප කිරීම', percentage: 5.57, amount: 835890 },
      { stageNo: 12, stageName: 'වැහි පිහිලි සවිකිරීම', percentage: 2.83, amount: 425000 },
      { stageNo: 13, stageName: 'දොර පනෙල් වෝටර් බේස් කිරීම', percentage: 2.84, amount: 426000 },
      { stageNo: 14, stageName: 'තරප්පු පෙල හා බැල්කනි වල අත්වැල ගැසීම (Box bar)', percentage: 1.46, amount: 218650 },
      { stageNo: 15, stageName: 'බිම් මහල හා පළමු මහල වයිල් කිරීම හා බාथरूम වල වැඩ නිම කිරීම', percentage: 15.06, amount: 2259000 },
      { stageNo: 16, stageName: 'නිවසේ පැන්ට්‍රි කබඩ් හා විදුලි පහන් සවි කිරීම', percentage: 6.50, amount: 975000 },
    ];

    await Quotation.deleteMany({ project: project._id });
    await Quotation.create({
      quotationNo: 'QT-2026-KALANIYA',
      title: 'Payment Schedule - Site: Kalaniya (Mr. P.L.L.P.C. Perera)',
      client: client._id,
      project: project._id,
      total: 15000000,
      status: 'accepted',
      quotationDate: new Date('2026-06-11'),
      items: paymentStages.map(s => ({
        description: `Stage ${s.stageNo}: ${s.stageName}`,
        quantity: 1,
        unitPrice: s.amount,
        total: s.amount,
      })),
      notes: `සැ.යු. (Special Notes):
* වෙනත් ඉදිකිරීම්: - ඉඩමේ මායිමේ දෙපැත්තක තාප්පය ඉදිකිරීම සහ රෝලර් ඩෝ, විකට් ගේට් සවිකිරීම. සම්පූර්ණ වටිනාකම - රුපියල් ලක්ෂ දහයක් පමණි (රු.1,000,000.00).
* සැලසුමට පරිබාහිරව ඉදිකිරීමක් හෝ කිසියම් වෙනස් කිරීමක් සිදුවේ නම් ඒ සඳහා යන වියදම් සම්පූර්ණයෙන්ම අයිතිකරු විසින් දැරිය යුතු වේ.`,
    });
    console.log('✓ Payment Schedule Created (16 stages, total LKR 15,000,000.00)');

    console.log('=== KELANIYA SITE SEEDING COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding Kelaniya Site:', err.message);
    process.exit(1);
  }
}

seedKelaniyaProject();
