import { Heart, Sparkles } from 'lucide-react'
export default function Logo({ compact=false }) {
  return <div className={`brand ${compact ? 'brand-compact':''}`}><div className="brand-mark"><span>ABC</span><Sparkles size={12}/></div><div><strong>ABC</strong><small>Daycare & Kindergarten</small></div><Heart className="brand-heart" size={15}/></div>
}
