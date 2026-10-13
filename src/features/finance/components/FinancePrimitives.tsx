import { useState, type FormEvent, type ReactNode } from 'react'
import Icon from '../../../components/ui/Icon'
import { money, displayDate } from '../../../data/accountantData'

type AnyRecord = Record<string, any>
type CardProps = { title: ReactNode; description?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string }
type StatProps = { label: ReactNode; value: ReactNode | number; icon?: string; tone?: string; detail?: ReactNode }
type BadgeProps = { children?: any; tone?: string }
type Column = { label: string; key?: string; render?: (row: AnyRecord) => ReactNode }
type TableProps = { columns: Column[]; rows: AnyRecord[]; empty?: string; onRow?: (row: AnyRecord) => void }
type FieldOption = string | { value: string; label: string }
type Field = { name: string; label: string; wide?: boolean; help?: string; options?: FieldOption[]; type?: string; min?: string; max?: string; step?: string; defaultValue?: any; placeholder?: string; required?: boolean }
type ActionFormProps = { title: ReactNode; description?: ReactNode; fields: Field[]; submitLabel: string; onSubmit: (values: AnyRecord) => unknown | Promise<unknown>; disabled?: boolean; children?: ReactNode; initial?: AnyRecord; review?: boolean }

export function Card({title,description,action,children,className=''}: CardProps){
 return <section className={`fin-card ${className}`}><div className="fin-card-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>{children}</section>
}
export function Stat({label,value,icon='WalletCards',tone='blue',detail}: StatProps){
 return <div className={`fin-stat fin-${tone}`}><span className="fin-stat-icon"><Icon name={icon} size={22}/></span><div><span>{label}</span><strong>{typeof value==='number'?money(value):value}</strong>{detail&&<small>{detail}</small>}</div></div>
}
export function Badge({children,tone}: BadgeProps){
 const kind=tone||(['Paid','Active','Closed'].includes(children)?'good':['Overdue','Refund'].includes(children)?'bad':'warn')
 return <span className={`fin-badge fin-${kind}`}>{children}</span>
}
export function Table({columns,rows,empty='No records yet',onRow}: TableProps){
 return <div className="fin-table-wrap"><table className="fin-table"><thead><tr>{columns.map(c=><th key={c.key||c.label}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.id||row.number||index} onClick={onRow?()=>onRow(row):undefined} className={onRow?'fin-clickable':''}>{columns.map(c=><td key={c.key||c.label} data-label={c.label}>{c.render?c.render(row):row[c.key]??'—'}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="fin-empty">{empty}</p>}</div>
}
export function ActionForm({title,description,fields,submitLabel,onSubmit,disabled=false,children,initial={},review=false}: ActionFormProps){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reviewValues,setReviewValues]=useState(null)
 const shouldReview=review||/^Record (payment|income|expense|staff payment|bill payment|refund)/i.test(submitLabel)
 const submit=async (event: FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('')
  const form=event.currentTarget,values=reviewValues||Object.fromEntries(new FormData(form))
  if(shouldReview&&!reviewValues){setReviewValues(values);return}
  setBusy(true)
  try{await onSubmit(values);form.reset();setReviewValues(null)}catch(err){setError(err instanceof Error?err.message:'Could not save this record.');setReviewValues(null)}
  finally{setBusy(false)}
 }
 return <form className="fin-form" onSubmit={submit}><div className="fin-form-intro"><h3>{title}</h3>{description&&<p>{description}</p>}</div><div className="fin-form-grid">{fields.map(field=><label key={field.name} className={field.wide?'fin-wide':''}><span>{field.label}{field.required&&' *'}</span>{field.help&&<small>{field.help}</small>}{field.options?<select name={field.name} required={field.required} defaultValue={initial[field.name]??field.defaultValue??''} disabled={disabled||busy||!!reviewValues}><option value="" disabled>Select…</option>{field.options.map(option=>typeof option==='string'?<option key={option} value={option}>{option}</option>:<option key={option.value} value={option.value}>{option.label}</option>)}</select>:field.type==='textarea'?<textarea name={field.name} rows={3} defaultValue={initial[field.name]??field.defaultValue??''} placeholder={field.placeholder} required={field.required} disabled={disabled||busy||!!reviewValues}/>:<input name={field.name} type={field.type||'text'} min={field.min} max={field.max} step={field.step} defaultValue={initial[field.name]??field.defaultValue??''} placeholder={field.placeholder} required={field.required} disabled={disabled||busy||!!reviewValues}/>}</label>)}</div>{children}{reviewValues&&<div className="fin-review" role="status"><strong>Review before posting</strong><dl>{fields.filter(field=>reviewValues[field.name]).map(field=><div key={field.name}><dt>{field.label}</dt><dd>{(field.options?.find(option=>typeof option==='string'?option===reviewValues[field.name]:option.value===reviewValues[field.name]) as {label?: string}|undefined)?.label||reviewValues[field.name]}</dd></div>)}</dl><button type="button" className="fin-text-button" onClick={()=>setReviewValues(null)}>Back to edit</button></div>}{error&&<p className="fin-form-error" role="alert">{error}</p>}<button className="fin-primary" disabled={disabled||busy}>{busy?'Saving…':reviewValues?'Confirm and save':shouldReview?'Review details':submitLabel}</button></form>
}
export function ReceiptView({receipt,settings,onClose}: { receipt: AnyRecord | null; settings: AnyRecord; onClose: () => void }){
 if(!receipt)return null
 const tx=receipt.transaction||receipt
 const schoolName=settings?.schoolName||settings?.receiptName||settings?.school||'School receipt',initials=schoolName.split(/\s+/).filter(Boolean).map(word=>word[0]).slice(0,2).join('').toUpperCase()
 return <div className="fin-receipt-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><article className="fin-receipt" role="dialog" aria-modal="true" aria-label={`Receipt ${receipt.number||receipt.receipt?.number||''}`}><div className="fin-receipt-actions"><button className="fin-secondary" onClick={()=>window.print()}><Icon name="Printer" size={16}/>Print receipt</button><button className="fin-icon-button" aria-label="Close receipt" onClick={onClose}><Icon name="X" size={18}/></button></div><div className="fin-receipt-body"><div className="fin-receipt-brand"><span>{settings?.schoolLogo?<img src={settings.schoolLogo} alt=""/>:initials}</span><div><strong>{schoolName}</strong><small>{settings?.receiptAddress||settings?.address||''}</small><small>{settings?.receiptPhone||settings?.phone||''}</small></div></div><div className="fin-receipt-title"><p>PAYMENT RECEIPT · RASIIDH</p><h2>{receipt.number||receipt.receipt?.number}</h2></div><dl><dt>Date</dt><dd>{tx.date?displayDate(tx.date):'—'}</dd><dt>Payer</dt><dd>{receipt.payer||'—'}</dd><dt>For</dt><dd>{tx.description||'Payment'}</dd><dt>Method</dt><dd>{tx.method||'—'}</dd><dt>Transaction</dt><dd>{tx.id||receipt.transactionId||'—'}</dd></dl><div className="fin-receipt-total"><span>Amount paid</span><strong>{money(Number(tx.amount||0))}</strong></div><p className="fin-receipt-note">Recorded by the school accountant. Keep this receipt for your records.</p></div></article></div>
}
