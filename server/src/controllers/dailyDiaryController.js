const DailyDiary = require('../models/DailyDiary');

exports.getDiaries = async (req, res) => {
  try {
    const { siteId, date } = req.query;
    const filter = {};
    if (siteId) filter.site = siteId;
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));
      filter.date = { $gte: start, $lte: end };
    }

    const diaries = await DailyDiary.find(filter)
      .populate('site', 'title description')
      .populate('supervisor', 'name email')
      .sort({ date: -1 });

    res.json({ success: true, diaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrUpdateDiary = async (req, res) => {
  try {
    const {
      site, date,
      s1_attendanceSummary, s2_materialsReceivedUsed, s3_machineryEquipment,
      s4_weather, s5_incidentsAccidents, s6_workProgressMilestones,
      s7_delaysObstructions, s8_siteVisitors, s9_progressPhotos,
      s10_qualityInspections, s11_subcontractorWork, s12_supervisorRemarksSignature,
      isOfflineSynced
    } = req.body;

    const entryDate = date ? new Date(date) : new Date();
    const start = new Date(new Date(entryDate).setHours(0,0,0,0));
    const end = new Date(new Date(entryDate).setHours(23,59,59,999));

    let diary = await DailyDiary.findOne({ site, date: { $gte: start, $lte: end } });

    const payload = {
      site,
      date: entryDate,
      supervisor: req.user._id,
      s1_attendanceSummary: s1_attendanceSummary || {},
      s2_materialsReceivedUsed: s2_materialsReceivedUsed || [],
      s3_machineryEquipment: s3_machineryEquipment || [],
      s4_weather: s4_weather || {},
      s5_incidentsAccidents: s5_incidentsAccidents || [],
      s6_workProgressMilestones: s6_workProgressMilestones || [],
      s7_delaysObstructions: s7_delaysObstructions || [],
      s8_siteVisitors: s8_siteVisitors || [],
      s9_progressPhotos: s9_progressPhotos || [],
      s10_qualityInspections: s10_qualityInspections || [],
      s11_subcontractorWork: s11_subcontractorWork || [],
      s12_supervisorRemarksSignature: s12_supervisorRemarksSignature || {
        remarks: 'Recorded via Supervisor Action Deck',
        signedAt: new Date(),
        supervisorName: req.user.name
      },
      isOfflineSynced: !!isOfflineSynced
    };

    if (diary) {
      diary = await DailyDiary.findByIdAndUpdate(diary._id, payload, { new: true });
    } else {
      diary = await DailyDiary.create(payload);
    }

    res.json({ success: true, diary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
