const DailyDiary = require('../models/DailyDiary');

exports.getDiaries = async (req, res) => {
  try {
    const { siteId, date, project } = req.query;
    const filter = {};
    if (siteId) filter.project = siteId;
    if (project) filter.project = project;

    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));
      filter.date = { $gte: start, $lte: end };
    }

    const diaries = await DailyDiary.find(filter)
      .populate('project', 'name code location')
      .populate('siteSupervisor', 'name email')
      .sort({ date: -1 });

    res.json({ success: true, diaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrUpdateDiary = async (req, res) => {
  try {
    const {
      project, site, date,
      weather, labourAttendance, materialUsage, machineryUsage, workCompletedSummary, hseIncidents,
      s1_attendanceSummary, s2_materialsReceivedUsed, s3_machineryEquipment,
      s4_weather, s5_incidentsAccidents, s6_workProgressMilestones
    } = req.body;

    const projectId = project || site;
    const entryDate = date ? new Date(date) : new Date();
    const start = new Date(new Date(entryDate).setHours(0,0,0,0));
    const end = new Date(new Date(entryDate).setHours(23,59,59,999));

    let diary = await DailyDiary.findOne({ project: projectId, date: { $gte: start, $lte: end } });

    const payload = {
      project: projectId,
      date: entryDate,
      siteSupervisor: req.user ? req.user._id : null,
      weather: weather || (s4_weather ? s4_weather.summary : 'Sunny'),
      labourAttendance: labourAttendance || [],
      materialUsage: materialUsage || s2_materialsReceivedUsed || [],
      machineryUsage: machineryUsage || s3_machineryEquipment || [],
      workCompletedSummary: workCompletedSummary || (s6_workProgressMilestones ? s6_workProgressMilestones.join(', ') : 'Daily site progress logged'),
      hseIncidents: hseIncidents || s5_incidentsAccidents || []
    };

    if (diary) {
      diary = await DailyDiary.findByIdAndUpdate(diary._id, payload, { new: true });
    } else {
      diary = await DailyDiary.create(payload);
    }

    res.status(201).json({ success: true, diary, message: 'Daily Site Report (DSR) saved successfully to MongoDB' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
