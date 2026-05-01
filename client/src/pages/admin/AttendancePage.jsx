import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceAPI } from '../../api';
import { StatusBadge, SearchInput, Pagination, TableSkeleton, EmptyState, StatCard, Modal } from '../../components/ui';
import { Clock, CheckCircle, XCircle, MapPin, Monitor, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const { data: todayData } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceAPI.getToday().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', statusFilter, dateRange, page],
    queryFn: () => attendanceAPI.getAll({ ...dateRange, status: statusFilter, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  });

  const clockInMutation = useMutation({
    mutationFn: (data) => attendanceAPI.clockIn(data),
    onSuccess: () => { qc.invalidateQueries(['attendance-today']); qc.invalidateQueries(['attendance']); toast.success('Clocked in!'); }
  });

  const clockOutMutation = useMutation({
    mutationFn: () => attendanceAPI.clockOut(),
    onSuccess: () => { qc.invalidateQueries(['attendance-today']); qc.invalidateQueries(['attendance']); toast.success('Clocked out!'); }
  });

  const records = data?.data || [];
  const pagination = data?.pagination || {};

  const isClockedIn = !!todayData?.clockIn && !todayData?.clockOut;
  const isClockedOut = !!todayData?.clockOut;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Tracking</h1>
          <p className="page-subtitle">Monitor employee clock-in/out and work hours</p>
        </div>
      </div>

      {/* Today's status card for employees */}
      {!isAdmin && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Today's Attendance</h3>
              <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
              {todayData && (
                <div className="flex gap-4 mt-3">
                  {todayData.clockIn && <div><p className="text-xs text-gray-500">Clock In</p><p className="text-sm font-semibold text-green-600">{format(new Date(todayData.clockIn), 'HH:mm')}</p></div>}
                  {todayData.clockOut && <div><p className="text-xs text-gray-500">Clock Out</p><p className="text-sm font-semibold text-red-500">{format(new Date(todayData.clockOut), 'HH:mm')}</p></div>}
                  {todayData.hoursWorked > 0 && <div><p className="text-xs text-gray-500">Hours</p><p className="text-sm font-semibold text-navy">{todayData.hoursWorked.toFixed(1)}h</p></div>}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {!isClockedIn && !isClockedOut && (
                <button
                  onClick={() => clockInMutation.mutate({ isWFH: false })}
                  disabled={clockInMutation.isPending}
                  className="btn-primary"
                >
                  <CheckCircle size={16} /> Clock In
                </button>
              )}
              {isClockedIn && (
                <button
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  className="btn btn-danger"
                >
                  <XCircle size={16} /> Clock Out
                </button>
              )}
              {isClockedOut && (
                <div className="badge-green text-sm px-4 py-2">✓ Completed</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Present Today" value={records.filter(r => r.status === 'present').length} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard icon={XCircle} label="Absent" value={records.filter(r => r.status === 'absent').length} iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard icon={Monitor} label="WFH" value={records.filter(r => r.isWFH).length} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard icon={Clock} label="Late Arrivals" value={records.filter(r => r.status === 'late').length} iconBg="bg-amber-50" iconColor="text-amber-600" />
      </div>

      {/* Records table */}
      <div className="card">
        <div className="card-header flex-wrap gap-3">
          <span className="text-sm text-gray-500">{pagination.total || 0} records</span>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select w-36 h-8 text-xs">
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="wfh">WFH</option>
              <option value="half_day">Half Day</option>
            </select>
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} className="form-input w-36 h-8 text-xs" />
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} className="form-input w-36 h-8 text-xs" />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                {isAdmin && <th>Employee</th>}
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Overtime</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            {isLoading ? <TableSkeleton rows={8} cols={isAdmin ? 8 : 7} /> : (
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 8 : 7}><EmptyState icon={Clock} title="No attendance records" description="Records will appear after employees clock in." /></td></tr>
                ) : records.map((r) => (
                  <tr key={r._id}>
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold">
                            {r.employee?.fullName?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.employee?.fullName}</p>
                            <p className="text-xs text-gray-400">{r.employee?.employeeId}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="text-sm">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                    <td className="text-sm font-medium text-green-600">{r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—'}</td>
                    <td className="text-sm font-medium text-red-500">{r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—'}</td>
                    <td className="text-sm font-semibold">{r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'}</td>
                    <td className="text-sm">{r.overtimeHours > 0 ? <span className="badge-amber">{r.overtimeHours.toFixed(1)}h</span> : '—'}</td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {r.isWFH ? <Monitor size={12} /> : <MapPin size={12} />}
                        {r.isWFH ? 'WFH' : 'Office'}
                      </div>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <Pagination page={page} pages={pagination.pages || 1} onPageChange={setPage} />
      </div>
    </div>
  );
}
