import { useEffect, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { Avatar, exportCsv } from '../../../components/ui/TeacherUI'
import { getStudentExamHub, getStudentGrades } from '../api/studentApi'

export default function StudentsGradesSection4({
  studentId,
  firstName,
  grade,
  average,
  notify,
  subjects,
  filteredSubjects,
  ReferenceArt,
  Section,
  progressContent,
  teacher
}) {
  const [hubData, setHubData] = useState(null)
  const [legacyResults, setLegacyResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedResultId, setExpandedResultId] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    Promise.allSettled([
      getStudentExamHub(studentId),
      getStudentGrades(studentId)
    ]).then(([hubRes, legacyRes]) => {
      if (!active) return
      if (hubRes.status === 'fulfilled' && hubRes.value) {
        setHubData(hubRes.value)
      }
      if (legacyRes.status === 'fulfilled' && Array.isArray(legacyRes.value)) {
        setLegacyResults(legacyRes.value)
      }
      if (hubRes.status === 'rejected' && legacyRes.status === 'rejected') {
        setError(hubRes.reason?.message || legacyRes.reason?.message || 'Failed to load exam records.')
      }
      setLoading(false)
    })

    return () => { active = false }
  }, [studentId])

  const scoredSubjects = (subjects || []).filter(s => s.score !== null && s.score !== undefined && Number.isFinite(Number(s.score)))
  const publishedResults = hubData?.publishedResults?.length ? hubData.publishedResults : legacyResults
  const upcomingExams = hubData?.upcomingExams || []
  const reExamNotices = hubData?.reExamNotices || []
  const enrolledCourses = hubData?.courses || []
  const promotionsHistory = hubData?.promotionsHistory || []
  const studentInfo = hubData?.student

  const handleExportCsv = () => {
    const rows = [['Subject', 'Score'], ...scoredSubjects.map(s => [s.name, s.score])]
    exportCsv('my-grades.csv', rows)
    if (notify) notify('Grade report prepared for download')
  }

  return (
    <>
      {/* Hero Banner with Class Progression */}
      <section className="st-grade-hero">
        <span className="st-grade-medal">🏅</span>
        <div>
          <span>LOOK AT YOU GROW!</span>
          <h2>Keep learning, {firstName}!</h2>
          <p>
            {studentInfo?.className ? (
              <>Current Class: <strong>{studentInfo.className}</strong> &nbsp;→&nbsp; Next Pathway: <strong>{studentInfo.nextClassName || 'Next Class'}</strong></>
            ) : (
              'Your official academic exams, results, and learning progress appear here.'
            )}
          </p>
        </div>
        <div className="st-overall-grade">
          <strong>{grade}</strong>
          <span>{scoredSubjects.length ? `${average}% overall` : 'No scores yet'}</span>
        </div>
      </section>

      {/* Re-Exam Notices Alert */}
      {reExamNotices.length > 0 && (
        <section className="st-panel st-exam-alert" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.06)' }}>
          <header className="st-panel-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="st-heading-icon orange">
                <Icon name="AlertTriangle" size={20} />
              </span>
              <div>
                <h2 style={{ color: '#b45309' }}>Re-Exam Notice</h2>
                <small>Important notification regarding scheduled subject re-examinations</small>
              </div>
            </div>
          </header>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reExamNotices.map((notice, idx) => (
              <div key={notice.id || idx} style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#9a3412' }}>
                    {notice.decision || 'Scheduled Re-Examination'}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {notice.notes || 'Please prepare for the upcoming re-test in the designated subjects.'}
                  </span>
                </div>
                <span className="ad-badge orange">
                  <i />{notice.status || 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accelerated Courses & Enrolled Programs */}
      {enrolledCourses.length > 0 && (
        <section className="st-panel st-exam-module st-course-module">
          <header className="st-panel-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="st-heading-icon purple">
                <Icon name="GraduationCap" size={20} />
              </span>
              <div>
                <h2>Accelerated Courses & Special Programs</h2>
                <small>Summer courses and pathway programs you are enrolled in</small>
              </div>
            </div>
          </header>
          <div className="ad-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Dates</th>
                  <th>Target Class</th>
                  <th>Fee & Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enrolledCourses.map(course => (
                  <tr key={course.id}>
                    <td>
                      <strong>{course.courseName}</strong>
                      {course.description && <br />}
                      {course.description && <small>{course.description}</small>}
                    </td>
                    <td>
                      <small>
                        {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'TBD'}
                        {course.endDate ? ` — ${new Date(course.endDate).toLocaleDateString()}` : ''}
                      </small>
                    </td>
                    <td>
                      <span className="ad-badge blue"><i />{course.targetClassName || 'Next Level'}</span>
                    </td>
                    <td>
                      <div>
                        <strong>${Number(course.fee || 0).toFixed(2)}</strong>
                        <br />
                        <small>
                          {course.payment ? (
                            `Paid: $${Number(course.payment.amountPaid || 0).toFixed(2)} (${course.payment.status})`
                          ) : (
                            `Type: ${course.paymentType || 'Standard'}`
                          )}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={`ad-badge ${course.status === 'Completed' ? 'green' : course.status === 'Dropped' ? 'pink' : 'purple'}`}>
                        <i />{course.status || 'Enrolled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Upcoming Exam Schedule */}
      {upcomingExams.length > 0 && (
        <section className="st-panel st-exam-module st-upcoming-module">
          <header className="st-panel-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="st-heading-icon blue">
                <Icon name="CalendarDays" size={20} />
              </span>
              <div>
                <h2>Upcoming Exam Schedule</h2>
                <small>Official timetable for upcoming examinations</small>
              </div>
            </div>
          </header>
          <div className="ad-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Examination</th>
                  <th>Academic Term</th>
                  <th>Exam Dates</th>
                  <th>Submission Window</th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.map(exam => (
                  <tr key={exam.id}>
                    <td><strong>{exam.title}</strong></td>
                    <td><span className="ad-badge blue"><i />{exam.term || 'Regular'}</span></td>
                    <td>
                      <small>
                        {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : 'TBD'}
                        {exam.endDate ? ` to ${new Date(exam.endDate).toLocaleDateString()}` : ''}
                      </small>
                    </td>
                    <td>
                      <small style={{ color: '#64748b' }}>
                        {exam.teacherDeadline ? `Due: ${new Date(exam.teacherDeadline).toLocaleDateString()}` : 'Scheduled'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Official Published Exam Results */}
      <section className="st-panel student-exam-results st-exam-module">
        <header className="st-panel-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="st-heading-icon green">
              <Icon name="ClipboardCheck" size={20} />
            </span>
            <div>
              <h2>Published Exam Results</h2>
              <small>Official recorded results published by school administration</small>
            </div>
          </div>
        </header>

        {error && <p className="ad-form-error">{error}</p>}

        <div className="ad-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Total Earned</th>
                <th>Average</th>
                <th>Rank</th>
                <th>Result</th>
                <th>Subject Details</th>
              </tr>
            </thead>
            <tbody>
              {publishedResults.map(result => {
                const isExpanded = expandedResultId === result.id
                const hasSubjects = Array.isArray(result.subjects) && result.subjects.length > 0

                return (
                  <tr key={result.id} style={{ borderBottom: isExpanded ? 'none' : undefined }}>
                    <td>
                      <strong>{result.examTitle || 'Official Exam'}</strong>
                      {result.term && <br />}
                      {result.term && <small>{result.term}</small>}
                    </td>
                    <td>
                      {result.totalScore != null && result.totalPossible != null ? (
                        <span><strong>{result.totalScore}</strong> <small style={{ color: '#94a3b8' }}>/ {result.totalPossible}</small></span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <strong>{Number(result.average || 0).toFixed(1)}%</strong>
                    </td>
                    <td>
                      {result.rank ? <span className="ad-badge purple"><i />#{result.rank}</span> : '—'}
                    </td>
                    <td>
                      <span className={`ad-badge ${result.outcome === 'Failed' ? 'pink' : 'green'}`}>
                        <i />{result.outcome || 'Passed'}
                      </span>
                    </td>
                    <td>
                      {hasSubjects ? (
                        <button
                          type="button"
                          className="st-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={() => setExpandedResultId(isExpanded ? null : result.id)}
                        >
                          <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} />
                          {isExpanded ? 'Hide' : `View (${result.subjects.length} subjects)`}
                        </button>
                      ) : (
                        <small style={{ color: '#94a3b8' }}>—</small>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Expanded Subject Breakdown */}
          {expandedResultId && (() => {
            const curResult = publishedResults.find(r => r.id === expandedResultId)
            if (!curResult || !curResult.subjects?.length) return null
            return (
              <div className="st-exam-subject-breakdown" style={{ background: '#f8fafc', padding: 16, margin: '8px 16px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="BookOpen" size={16} /> Subject Breakdown for {curResult.examTitle}
                </h4>
                <table style={{ width: '100%', background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#edf2f7', fontSize: '0.8rem' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Mark Earned</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Max Possible</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Pass Mark</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curResult.subjects.map(sub => {
                      const earned = Number(sub.markEarned ?? sub.score ?? 0)
                      const maxM = Number(sub.maxMarks ?? 100)
                      const passM = Number(sub.passMark ?? 50)
                      const isPassing = earned >= passM

                      return (
                        <tr key={sub.id || sub.subjectId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <strong>{sub.subjectName || sub.name || 'Subject'}</strong>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <strong style={{ color: isPassing ? '#15803d' : '#b91c1c' }}>{earned}</strong>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {maxM}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {passM}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span className={`ad-badge ${isPassing ? 'green' : 'pink'}`}>
                              <i />{isPassing ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {!publishedResults.length && !error && !loading && (
            <div className="ad-empty">
              <strong>No published results yet</strong>
              <span>Your official exam results will appear after administration publishes them.</span>
            </div>
          )}
        </div>
      </section>

      {/* Promotion and Progression History */}
      {promotionsHistory.length > 0 && (
        <section className="st-panel st-exam-module st-promotion-module">
          <header className="st-panel-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="st-heading-icon green">
                <Icon name="TrendingUp" size={20} />
              </span>
              <div>
                <h2>Academic Promotion History</h2>
                <small>Record of grade advancement and academic transitions</small>
              </div>
            </div>
          </header>
          <div className="ad-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Previous Class</th>
                  <th>Promoted To</th>
                  <th>Academic Year</th>
                  <th>Type</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {promotionsHistory.map(promo => (
                  <tr key={promo.id}>
                    <td><strong>{promo.fromClassName || 'Previous'}</strong></td>
                    <td>
                      <span className="ad-badge green">
                        <i />{promo.toClassName || 'Graduated / Final'}
                      </span>
                    </td>
                    <td><small>{promo.fromYearName || 'Academic Year'}</small></td>
                    <td>
                      <span className={`ad-badge ${promo.kind === 'Accelerated' ? 'purple' : 'blue'}`}>
                        <i />{promo.kind || 'Regular'}
                      </span>
                    </td>
                    <td>
                      <small style={{ color: '#64748b' }}>
                        {promo.appliedAt ? new Date(promo.appliedAt).toLocaleDateString() : 'Completed'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Learning Progress Section */}
      <div className="st-section-title">
        <h2>My Learning Progress</h2>
        <button
          className="st-secondary"
          disabled={!scoredSubjects.length}
          onClick={handleExportCsv}
        >
          <Icon name="Download" size={15} />
          Download Report
        </button>
      </div>

      <div className="st-grade-grid">
        {(filteredSubjects || []).map(s => (
          <section className="st-panel st-grade-card" key={s.id}>
            {ReferenceArt && s.art && (
              <ReferenceArt x={s.art[0]} y={s.art[1]} w={s.art[2]} h={s.art[3]} width={60} />
            )}
            <div>
              <h3>{s.name}</h3>
              <small>{s.score !== null && s.score !== undefined ? 'Published subject average' : 'No published score yet'}</small>
              <div className="st-grade-track">
                <i style={{ width: `${Math.max(0, Math.min(100, Number(s.score) || 0))}%` }} />
              </div>
            </div>
            <strong>{s.score !== null && s.score !== undefined ? Number(s.score) : '—'}<small>{s.score !== null && s.score !== undefined ? '/100' : ''}</small></strong>
          </section>
        ))}
      </div>

      {(!filteredSubjects || !filteredSubjects.length) && (
        <div className="ad-empty">
          <strong>No subject grades yet</strong>
          <span>Published scores will appear here.</span>
        </div>
      )}

      {/* Bottom Two Columns: Growing & Teacher Note */}
      <div className="st-two-columns">
        {Section && (
          <Section title="Growing in Every Way" icon="Sparkles">
            {progressContent}
          </Section>
        )}
        {Section && (
          <Section title="My Class Teacher" icon="MessageCircle">
            {teacher ? (
              <div className="st-teacher-note">
                <p>Use Messages when you want to ask about an assignment or published result.</p>
                <div>
                  <Avatar name={teacher.name} />
                  <strong>{teacher.name}<small>Class teacher</small></strong>
                </div>
              </div>
            ) : (
              <div className="ad-empty">
                <strong>No class teacher assigned</strong>
                <span>Your school will update this section after assignment.</span>
              </div>
            )}
          </Section>
        )}
      </div>
    </>
  )
}
