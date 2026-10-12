import Icon from '../../../components/ui/Icon'

export default function AdminReportsSection3({ Metrics, overviewMetrics = [], search = '', displayDate = '', classes = [], students = [], date = '', statusFor, teachers = [], staff = [], downloadCSV, setToast, Panel, present = 0, Badge, absent = 0 }) {
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeOverview = Array.isArray(overviewMetrics) ? overviewMetrics : [];

  const reportsList = [
    ['Enrollment Summary', 'Student counts and classroom capacity at a glance.', 'UsersRound', 'blue', 'enrollment'],
    ['Attendance Report', 'Today’s check-ins, absences and attendance rate.', 'CalendarCheck', 'green', 'attendance'],
    ['Team Directory', 'An overview of your teaching and support team.', 'BriefcaseBusiness', 'purple', 'team']
  ].filter(([name]) => name.toLowerCase().includes((search || '').toLowerCase()));

  const attendanceRate = safeStudents.length > 0 ? Math.round((present / safeStudents.length) * 100) : 0;

  return (
    <>
      <Metrics items={safeOverview.slice(0, 4)} />
      <div className="ad-section-toolbar">
        <h2>School Reports</h2>
        <span className="ad-report-note">Built from your school database records</span>
      </div>
      <div className="ad-report-grid">
        {reportsList.map(([name, desc, icon, tone, type]) => (
          <section className="ad-panel ad-report-card" key={type}>
            <span className={`ad-icon ${tone}`}><Icon name={icon} size={25} /></span>
            <h2>{name}</h2>
            <p>{desc}</p>
            <small>CSV spreadsheet · {displayDate}</small>
            <button className="ad-button secondary" onClick={() => {
              const rows = type === 'enrollment'
                ? [['Class', 'Teacher', 'Enrolled', 'Capacity'], ...safeClasses.map(c => [c?.name || '', c?.teacher || '', safeStudents.filter(s => s?.group === c?.group).length, c?.capacity || 20])]
                : type === 'attendance'
                  ? [['Date', 'Name', 'Class', 'Status'], ...safeStudents.map(s => [date, s?.name || '', s?.group || '', statusFor ? statusFor(s) : 'Unmarked'])]
                  : [['Name', 'Team', 'Role', 'Email'], ...safeTeachers.map(s => [s?.name || '', 'Teaching', s?.guardian || 'Teacher', s?.email || '']), ...safeStaff.map(s => [s?.name || '', s?.group || 'Staff', s?.guardian || 'Staff', s?.email || ''])];
              downloadCSV(`${type}-report.csv`, rows);
              setToast(`${name} downloaded`);
            }}>
              <Icon name="Download" size={16} /> Download Report
            </button>
          </section>
        ))}
      </div>
      <div className="ad-report-detail">
        <Panel title="Enrollment by Class" icon="School">
          <div className="ad-enrollment-rows">
            {safeClasses.map((c, i) => {
              if (!c) return null;
              const count = safeStudents.filter(s => s && s.group === c.group).length;
              const capacity = Number(c.capacity) || 20;
              const percent = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
              return (
                <div key={c.id || i}>
                  <span>{c.group || c.name || 'Class'}</span>
                  <div className="ad-progress"><span style={{ width: `${percent}%` }} /></div>
                  <b>{count} / {capacity}</b>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Today's Attendance" icon="CalendarCheck">
          <div className="ad-attendance-summary">
            <strong>{attendanceRate}<span>%</span></strong>
            <p>of students present today</p>
            <div>
              <Badge>Present</Badge><b>{present}</b>
              <Badge>Absent</Badge><b>{absent}</b>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

