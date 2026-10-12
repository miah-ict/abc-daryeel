import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { teacherBase, subjects } from '../../data/teacherData'

export function Avatar({ name, index = 0, large = false }) {
  return <span className={`ad-avatar av-${index % 6} ${large ? 'large' : ''}`} aria-hidden="true">{name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
}
export function Badge({ children }) {
  const tone = ['Absent', 'Needs support'].includes(children) ? 'pink' : ['Draft', 'Unmarked', 'Open'].includes(children) ? 'orange' : 'green'
  return <span className={`ad-badge ${tone}`}><i />{children}</span>
}
export function Panel({ title, icon, children, link, label = 'View all', className = '' }) {
  return <section className={`ad-panel ${className}`}><div className="ad-panel-head"><h2><span className="ad-icon blue"><Icon name={icon} /></span>{title}</h2>{link && <Link to={`${teacherBase}/${link}`}>{label} <Icon name="ArrowRight" size={13} /></Link>}</div>{children}</section>
}
export function Metrics({ items }) {
  return <div className={`ad-metrics ad-metrics-${items.length}`}>{items.map(([label, value, note, icon, tone]) => <div className="ad-metric" key={label}><span className={`ad-icon ${tone}`}><Icon name={icon} size={23} /></span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>)}</div>
}
export function PerformanceChart({ scores, students }) {
  const averages = subjects.map(subject => {
    const values = students.map(s => scores[s.id]?.[subject]).filter(v => typeof v === 'number')
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  })
  return <div className="tc-chart" role="img" aria-label={subjects.map((s, i) => `${s}: ${averages[i]} percent`).join(', ')}><div className="tc-chart-axis">{[100,75,50,25,0].map(n => <span key={n}>{n}%</span>)}</div><div className="tc-chart-bars">{subjects.map((subject,i) => <div className="tc-chart-column" key={subject}><div className={`tc-chart-bar tc-bar-${i}`} style={{height:`${averages[i]}%`}}><b>{averages[i]}%</b></div><small>{subject}</small></div>)}</div></div>
}
export function Empty({ title = 'Nothing here yet', children }) {
  return <div className="ad-empty"><Icon name="Search" size={30} /><strong>{title}</strong><span>{children || 'Try another search or filter.'}</span></div>
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current.querySelector('button')?.focus()
    function keydown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = [...ref.current.querySelectorAll('button,a[href],input,textarea,select')].filter(el => !el.disabled)
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [])
  return <div className="ad-modal-overlay" onClick={onClose}><section className="ad-modal tc-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title" onClick={e => e.stopPropagation()}><div className="ad-modal-head"><h2 id="teacher-modal-title">{title}</h2><button aria-label="Close dialog" onClick={onClose}><Icon name="X" size={20} /></button></div>{children}</section></div>
}
export function exportCsv(filename, rows) {
  const cell = value => {
    const text = String(value ?? '')
    return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"'
  }
  const csv = '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
