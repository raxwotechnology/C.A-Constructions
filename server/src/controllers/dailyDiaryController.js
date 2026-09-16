const DailyDiary = require('../models/DailyDiary');
const SiteStock = require('../models/SiteStock');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Project = require('../models/Project');

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
      .populate('project', 'name code location title')
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

    const materialsUsedList = materialUsage || s2_materialsReceivedUsed || [];

    const payload = {
      project: projectId,
      date: entryDate,
      siteSupervisor: req.user ? req.user._id : null,
      weather: weather || (s4_weather ? s4_weather.summary : 'Sunny'),
      labourAttendance: labourAttendance || [],
      materialUsage: materialsUsedList,
      machineryUsage: machineryUsage || s3_machineryEquipment || [],
      workCompletedSummary: workCompletedSummary || (s6_workProgressMilestones ? s6_workProgressMilestones.join(', ') : 'Daily site progress logged'),
      hseIncidents: hseIncidents || s5_incidentsAccidents || []
    };

    if (diary) {
      diary = await DailyDiary.findByIdAndUpdate(diary._id, payload, { new: true });
    } else {
      diary = await DailyDiary.create(payload);
    }

    // ─── Auto-Deduct Site Stock & Check Low Stock Threshold ─────────────────────
    if (Array.isArray(materialsUsedList) && materialsUsedList.length > 0 && projectId) {
      const projObj = await Project.findById(projectId);
      const siteName = projObj ? (projObj.name || projObj.title) : 'Site';

      for (const mat of materialsUsedList) {
        const matName = mat.materialName || mat.itemName || mat.name;
        const qtyUsed = Number(mat.quantityUsed || mat.quantity || mat.qty || 0);

        if (matName && qtyUsed > 0) {
          const stockItem = await SiteStock.findOne({
            $or: [
              { itemName: { $regex: new RegExp('^' + matName + '$', 'i') } },
              { itemCode: matName.toUpperCase() },
            ]
          });

          if (stockItem) {
            let currentSiteQty = 0;
            let siteEntry = stockItem.siteStockQty.find(s => s.project?.toString() === projectId.toString());
            
            if (siteEntry) {
              siteEntry.qty = Math.max(0, siteEntry.qty - qtyUsed);
              currentSiteQty = siteEntry.qty;
            } else if (stockItem.centralStockQty > 0) {
              stockItem.centralStockQty = Math.max(0, stockItem.centralStockQty - qtyUsed);
              currentSiteQty = stockItem.centralStockQty;
            }

            await stockItem.save();

            // Check Low Stock Threshold
            const threshold = stockItem.minThresholdQty || 50;
            if (currentSiteQty <= threshold) {
              // Trigger Low Stock Alerts for Admin AND Site Supervisor
              const alertTitle = `LOW STOCK ALERT: ${stockItem.itemName}`;
              const alertMsg = `Stock for ${stockItem.itemName} at site "${siteName}" has fallen to ${currentSiteQty} ${stockItem.unit} (Threshold limit: ${threshold}). Please issue a Material Request or PO immediately.`;

              // Notify Supervisor
              if (req.user) {
                await Notification.create({
                  recipient: req.user._id,
                  title: alertTitle,
                  message: alertMsg,
                  type: 'inventory_alert',
                  link: '/supervisor',
                });
              }

              // Notify Admins
              const adminUsers = await User.find({ role: { $in: ['admin', 'manager'] } });
              for (const admin of adminUsers) {
                await Notification.create({
                  recipient: admin._id,
                  title: alertTitle,
                  message: alertMsg,
                  type: 'inventory_alert',
                  link: '/admin/site-inventory',
                });
              }
            }
          }
        }
      }
    }

    res.status(201).json({ success: true, diary, message: 'Daily Site Report saved. Site stock updated and threshold verified.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDiaryById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      project, date, weather, labourAttendance, materialUsage,
      machineryUsage, workCompletedSummary, hseIncidents, approvedByManager
    } = req.body;

    const updateFields = {};
    if (project) updateFields.project = project;
    if (date) updateFields.date = new Date(date);
    if (weather) updateFields.weather = weather;
    if (labourAttendance !== undefined) updateFields.labourAttendance = labourAttendance;
    if (materialUsage !== undefined) updateFields.materialUsage = materialUsage;
    if (machineryUsage !== undefined) updateFields.machineryUsage = machineryUsage;
    if (workCompletedSummary !== undefined) updateFields.workCompletedSummary = workCompletedSummary;
    if (hseIncidents !== undefined) updateFields.hseIncidents = hseIncidents;
    if (approvedByManager !== undefined) updateFields.approvedByManager = approvedByManager;

    const updatedDiary = await DailyDiary.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('project', 'name code location title')
      .populate('siteSupervisor', 'name email');

    if (!updatedDiary) {
      return res.status(404).json({ success: false, message: 'Daily Site Report not found' });
    }

    res.json({ success: true, diary: updatedDiary, message: 'Daily Site Report updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDiaryById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDiary = await DailyDiary.findByIdAndDelete(id);
    if (!deletedDiary) {
      return res.status(404).json({ success: false, message: 'Daily Site Report not found' });
    }
    res.json({ success: true, message: 'Daily Site Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

