import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Apple, ArrowRight, Baby, BookOpen, Briefcase, Building2, Bus, Calculator, Calendar, Camera, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, GraduationCap, Heart, Mail, MapPin, Monitor, Music, Palette, Phone, Play, Send, ShieldCheck, Smile,
  Sparkles, Stethoscope, Trees, UserCog, UsersRound, Utensils, X,
} from 'lucide-react'
import Logo from '../components/ui/Logo'

const NAV = ['Home', 'About', 'Programs', 'Pricing', 'Facilities', 'Gallery', 'News', 'Careers', 'Contact']

const programs = [['Infant Care', '0–2 Years', 'Love, care and early stimulation for a strong start.', Baby], ['Toddler Program', '2–3 Years', 'Exploring, discovering and building independence.', Smile], ['Early Learning', '3–4 Years', 'Building basic skills for a brighter future.', BookOpen], ['Kindergarten', '4–6 Years', 'Preparing for school and beyond.', GraduationCap]]

const plans = [
  {
    code: 'standard',
    name: 'Standard',
    price: 1,
    description: 'Everything a single-school team needs to manage daily operations.',
    features: [[Building2, 'Manage 1 school'], [UserCog, '1 administrator account'], [Calculator, '1 accountant account']],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    price: 10,
    description: 'More staff access for growing schools and larger management teams.',
    featured: true,
    features: [[Building2, 'Manage 1 school'], [UserCog, '2 administrator accounts'], [Calculator, '2 accountant accounts']],
  },
]

const facilities = [
  ['Smart Classrooms', 'Bright, air-conditioned rooms with interactive learning displays.', Monitor],
  ['Outdoor Playground', 'Soft-floor play area with age-appropriate climbing and slides.', Trees],
  ['Healthy Kitchen', 'Fresh, nutritionist-planned meals cooked on site every day.', Utensils],
  ['Safe Transport', 'GPS-tracked buses with trained drivers and attendants.', Bus],
  ['Health Room', 'On-call nurse, first-aid station and daily wellness checks.', Stethoscope],
  ['Art & Music Studio', 'Dedicated space for painting, crafts, rhythm and dance.', Palette],
]

const gallery = [
  { cat: 'Classroom', title: 'Creative Art Studio', src: '/gallery/art.png' },
  { cat: 'Outdoor', title: 'Adventure Playground', src: '/gallery/playground.png' },
  { cat: 'Events', title: 'Music & Movement Week', src: '/gallery/music.png' },
  { cat: 'Classroom', title: 'Story Time Corner', src: '/gallery/story.png' },
  { cat: 'Outdoor', title: 'Healthy Dining & Meals', src: '/gallery/lunch.png' },
  { cat: 'Events', title: 'Graduation Ceremony 2026', src: '/gallery/graduation.png' },
]
const GALLERY_TABS = ['All', 'Classroom', 'Outdoor', 'Events']

const news = [
  { tag: 'Event', date: 'Oct 18, 2026', title: 'Family Fun Day & Autumn Harvest Festival', text: 'Join us for games, face painting, a mini farmers’ market and performances by our Kindergarten classes.', img: '/gallery/story.png' },
  { tag: 'Admissions', date: 'Oct 02, 2026', title: '2027 Enrollment Is Now Open', text: 'Limited places available across all age groups. Book a campus tour to meet our teachers.', img: '/gallery/graduation.png' },
  { tag: 'Achievement', date: 'Sep 21, 2026', title: 'ABC Awarded “Best Early Learning Centre”', text: 'Recognised by the regional education board for safety, curriculum quality and parent satisfaction.', img: '/gallery/music.png' },
]

const careers = [
  { role: 'Kindergarten Teacher', type: 'Full-time', team: 'Academics', desc: 'Lead a class of 4–6 year olds with a play-based curriculum. Diploma/Degree in Early Childhood Education required.' },
  { role: 'Infant Care Assistant', type: 'Full-time', team: 'Care', desc: 'Support daily routines, feeding and early stimulation for our youngest learners. First-aid certification preferred.' },
  { role: 'School Bus Driver', type: 'Part-time', team: 'Transport', desc: 'Safely transport children on morning and afternoon routes. Valid licence and clean record required.' },
  { role: 'Kitchen Assistant', type: 'Full-time', team: 'Operations', desc: 'Prepare fresh, nutritious meals following our menu and strict hygiene standards.' },
]

const EMPTY_FORM = { name: '', email: '', phone: '', subject: 'General Inquiry', message: '' }

export default function LandingPage() {
  const [active, setActive] = useState('home')
  const [tab, setTab] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  const [openJob, setOpenJob] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const photos = gallery.filter((g) => g.src)
  const shown = gallery.filter((g) => tab === 'All' || g.cat === tab)

  // Highlight the nav link of the section currently in view
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.toLowerCase())).filter(Boolean)
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && setActive(e.target.id))
    }, { rootMargin: '-45% 0px -50% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Lightbox keyboard controls
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, photos.length])

  const update = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }

  const applyFor = (role) => {
    setForm({ ...form, subject: `Job Application: ${role}` })
    setSent(false)
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please enter your name'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Please enter a valid email'
    if (form.message.trim().length < 10) errs.message = 'Message should be at least 10 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSent(true)
    setForm(EMPTY_FORM)
  }

  return <div className="landing">
    <header className="landing-nav"><Logo /><nav>{NAV.map((x) => <a className={active === x.toLowerCase() ? 'active' : ''} href={`#${x.toLowerCase()}`} key={x}>{x}</a>)}</nav><div className="nav-actions"><a href="#contact" className="search-link">⌕</a><Link to="/login" className="outline-btn">Login</Link><Link to="/register" className="primary-btn">Enroll Now <ArrowRight size={16} /></Link></div></header>

    <section className="landing-hero" id="home"><div className="landing-copy"><span className="eyebrow">🌟 Welcome to ABC Daycare &amp; Kindergarten</span><h1>A Safe, Happy &amp;<br />Bright Future<br /><em>for Your Child</em></h1><p>At ABC Daycare &amp; Kindergarten, we provide a nurturing, safe and stimulating environment where children learn, grow and build the foundation for a successful future.</p><div className="hero-actions"><Link to="/register" className="primary-btn large">Enroll Your Child <ArrowRight size={18} /></Link><a href="#about" className="video-btn"><Play size={16} fill="currentColor" /> Watch Our Story</a></div></div><div className="landing-hero-img"><img src="/references/landing.png" alt="Children learning at ABC Daycare" /></div></section>

    <div className="trust-strip">{[['Safe Environment', 'Your child’s safety is our priority', ShieldCheck], ['Qualified Teachers', 'Experienced & caring staff', UsersRound], ['Modern Facilities', 'Clean, bright and well-equipped', Sparkles], ['Holistic Development', 'Academic, social and emotional growth', Heart]].map(([a, b, I]) => <div key={a}><I /><div><strong>{a}</strong><small>{b}</small></div></div>)}</div>

    <section className="about-section" id="about"><div className="about-illustration"><div className="kids-card">ABC<br /><span>Learn • Grow • Shine</span></div></div><div className="about-copy"><span className="eyebrow">💙 Why Choose Us</span><h2>More Than Just a Daycare</h2><p>We create a warm, loving and structured environment where children feel valued, safe and excited to learn. Our programs nurture every child’s unique potential.</p>{['Caring and experienced teachers', 'Safe and secure premises', 'Fun and engaging learning activities', 'Strong focus on character and values'].map((x) => <div className="check" key={x}><CheckCircle2 size={17} />{x}</div>)}</div><div className="mini-photo"><img src="/references/landing.png" alt="ABC classroom" /><div><Play size={17} fill="currentColor" /><strong>See Our<br />Daycare in Action</strong></div></div></section>

    <section className="program-section" id="programs"><div className="section-heading"><div><span className="eyebrow">📚 Our Programs</span><h2>Programs for Every Stage</h2><p>Thoughtfully designed programs supporting growth and development at every stage.</p></div><a href="#contact">View All Programs →</a></div><div className="program-grid">{programs.map(([a, b, c, I], i) => <div className={`program-card p${i}`} key={a}><div className="program-icon"><I /></div><span>{b}</span><h3>{a}</h3><p>{c}</p><button aria-label={`Learn more about ${a}`}>→</button></div>)}</div></section>

    {/* Pricing */}
    <section className="pricing-section" id="pricing">
      <div className="pricing-heading">
        <span className="eyebrow">💳 Simple Pricing</span>
        <h2>Choose the Plan That Fits Your School</h2>
        <p>Clear pricing with the staff access your school needs. Upgrade whenever your team grows.</p>
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => <article className={`pricing-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>
          {plan.featured && <span className="popular-badge">Best for growing teams</span>}
          <div className="plan-top">
            <div><span className="plan-name">{plan.name}</span><p>{plan.description}</p></div>
            <div className="plan-price"><sup>$</sup><strong>{plan.price}</strong><small>/ month</small></div>
          </div>
          <div className="plan-divider" />
          <p className="feature-label">What’s included</p>
          <ul>{plan.features.map(([Icon, label]) => <li key={label}><span><Icon size={18} /></span>{label}<CheckCircle2 size={17} /></li>)}</ul>
          <Link to={`/register?plan=${plan.code}`} className={plan.featured ? 'primary-btn plan-cta' : 'outline-btn plan-cta'}>Choose {plan.name} <ArrowRight size={16} /></Link>
        </article>)}
      </div>
    </section>

    {/* Facilities */}
    <section className="facility-section" id="facilities">
      <div className="section-heading center"><div><span className="eyebrow">🏫 Our Facilities</span><h2>Spaces Designed for Little Explorers</h2><p>Every corner of our campus is built for safety, comfort and curiosity.</p></div></div>
      <div className="facility-grid">{facilities.map(([t, d, I], i) => <article className={`facility-card f${i % 3}`} key={t}><div className="facility-icon"><I size={22} /></div><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    {/* Gallery */}
    <section className="gallery-section" id="gallery">
      <div className="section-heading"><div><span className="eyebrow">📸 Gallery</span><h2>Moments That Make Us Smile</h2><p>A glimpse into the everyday joy, learning and adventures at ABC.</p></div>
        <div className="filter-tabs" role="tablist">{GALLERY_TABS.map((t) => <button key={t} id={`gallery-tab-${t.toLowerCase()}`} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      </div>
      <div className="gallery-grid">{shown.map((g) => g.src
        ? <button key={g.title} className={`gallery-item ${g.size || ''}`} onClick={() => setLightbox(photos.indexOf(g))} aria-label={`Open ${g.title}`}><img src={g.src} alt={g.title} loading="lazy" /><span className="gallery-cap"><small>{g.cat}</small><strong>{g.title}</strong><Camera size={16} /></span></button>
        : <div key={g.title} className={`gallery-item tile ${g.tone} ${g.size || ''}`}><g.icon size={34} /><small>{g.cat}</small><strong>{g.title}</strong><span>{g.note}</span></div>)}
      </div>
    </section>

    {lightbox !== null && <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
      <button className="lb-close" id="lightbox-close" aria-label="Close"><X /></button>
      <button className="lb-nav prev" id="lightbox-prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length) }}><ChevronLeft /></button>
      <figure onClick={(e) => e.stopPropagation()}><img src={photos[lightbox].src} alt={photos[lightbox].title} /><figcaption>{photos[lightbox].title} <span>{lightbox + 1} / {photos.length}</span></figcaption></figure>
      <button className="lb-nav next" id="lightbox-next" aria-label="Next" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length) }}><ChevronRight /></button>
    </div>}

    {/* News */}
    <section className="news-section" id="news">
      <div className="section-heading"><div><span className="eyebrow">📰 News &amp; Events</span><h2>What’s Happening at ABC</h2><p>Stay up to date with announcements, events and celebrations.</p></div><a href="#contact">Subscribe to Updates →</a></div>
      <div className="news-grid">{news.map((n, i) => <article className={`news-card ${i === 0 ? 'featured' : ''}`} key={n.title}>
        <div className={`news-media ${n.tone || ''}`}>{n.img ? <img src={n.img} alt={n.title} loading="lazy" /> : <n.icon size={40} />}<span className="news-tag">{n.tag}</span></div>
        <div className="news-body"><time><Calendar size={13} />{n.date}</time><h3>{n.title}</h3><p>{n.text}</p><a href="#contact">Read more <ArrowRight size={14} /></a></div>
      </article>)}</div>
    </section>

    {/* Careers */}
    <section className="career-section" id="careers">
      <div className="career-intro">
        <span className="eyebrow">💼 Careers</span><h2>Grow Your Career With Us</h2>
        <p>Join a passionate team that shapes young minds every day. We offer continuous training, a supportive culture and competitive benefits.</p>
        <ul className="career-perks">{['Paid professional development', 'Health insurance & paid leave', 'Childcare discount for staff', 'Friendly, modern workplace'].map((x) => <li key={x}><CheckCircle2 size={16} />{x}</li>)}</ul>
        <div className="career-stats"><div><strong>45+</strong><small>Team members</small></div><div><strong>4.9★</strong><small>Staff rating</small></div><div><strong>12 yrs</strong><small>Of excellence</small></div></div>
      </div>
      <div className="job-list">{careers.map((j, i) => <article key={j.role} className={`job-card ${openJob === i ? 'open' : ''}`}>
        <button className="job-head" id={`job-${i}`} aria-expanded={openJob === i} onClick={() => setOpenJob(openJob === i ? -1 : i)}>
          <span className="job-icon"><Briefcase size={18} /></span>
          <span className="job-title"><strong>{j.role}</strong><small>{j.team} • <Clock size={11} /> {j.type}</small></span>
          <ChevronRight className="job-chev" size={18} />
        </button>
        <div className="job-body"><div><p>{j.desc}</p><button className="primary-btn" onClick={() => applyFor(j.role)}>Apply Now <ArrowRight size={14} /></button></div></div>
      </article>)}</div>
    </section>

    {/* Contact */}
    <section className="contact-section" id="contact">
      <div className="contact-info">
        <span className="eyebrow">📞 Contact Us</span><h2>We’d Love to Hear From You</h2>
        <p>Have a question about admissions, programs or careers? Reach out or visit our campus — our friendly team is here to help.</p>
        {[[MapPin, 'Visit Us', '123 Sunshine Avenue, Bole, Addis Ababa'], [Phone, 'Call Us', '+251 911 234 567'], [Mail, 'Email Us', 'hello@abcdaycare.edu'], [Clock, 'Opening Hours', 'Mon – Fri: 7:00 AM – 6:00 PM']].map(([I, t, v]) => <div className="contact-line" key={t}><span><I size={18} /></span><div><small>{t}</small><strong>{v}</strong></div></div>)}
        <div className="map-card"><MapPin size={22} /><div><strong>ABC Daycare Campus</strong><small>5 min from Bole Medhanialem</small></div><a href="https://maps.google.com/?q=Bole+Addis+Ababa" target="_blank" rel="noreferrer">Directions →</a></div>
      </div>
      <form className="contact-form" onSubmit={submit} noValidate>
        {sent && <div className="form-success" role="status"><CheckCircle2 size={18} /> Thank you! Your message has been received — we’ll reply within 24 hours.</div>}
        <div className="field-row">
          <label className={errors.name ? 'err' : ''}>Full Name<input id="contact-name" value={form.name} onChange={update('name')} placeholder="Jane Doe" />{errors.name && <em>{errors.name}</em>}</label>
          <label className={errors.email ? 'err' : ''}>Email<input id="contact-email" type="email" value={form.email} onChange={update('email')} placeholder="jane@email.com" />{errors.email && <em>{errors.email}</em>}</label>
        </div>
        <div className="field-row">
          <label>Phone<input id="contact-phone" value={form.phone} onChange={update('phone')} placeholder="+251 9XX XXX XXX" /></label>
          <label>Subject<select id="contact-subject" value={form.subject} onChange={update('subject')}>
            {['General Inquiry', 'Admissions & Enrollment', 'Campus Tour', 'News Subscription', ...careers.map((c) => `Job Application: ${c.role}`)].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        </div>
        <label className={errors.message ? 'err' : ''}>Message<textarea id="contact-message" rows={5} value={form.message} onChange={update('message')} placeholder="Tell us how we can help…" />{errors.message && <em>{errors.message}</em>}</label>
        <button type="submit" id="contact-submit" className="primary-btn large">Send Message <Send size={16} /></button>
      </form>
    </section>

    <section className="cta-section" id="enroll"><div><span className="eyebrow">❤️ Ready to Begin?</span><h2>Give Your Child a Bright Place to Learn &amp; Grow.</h2><p>Talk to our team or start your enrollment today.</p></div><Link to="/register" className="primary-btn large">Start Enrollment <ArrowRight /></Link></section>

    <footer className="landing-footer rich">
      <div className="footer-grid">
        <div className="footer-brand"><Logo /><p>A safe, happy and bright place where every child learns, grows and shines.</p></div>
        <div><h4>Explore</h4>{['About', 'Programs', 'Pricing', 'Facilities', 'Gallery'].map((x) => <a key={x} href={`#${x.toLowerCase()}`}>{x}</a>)}</div>
        <div><h4>Community</h4>{['News', 'Careers', 'Contact'].map((x) => <a key={x} href={`#${x.toLowerCase()}`}>{x}</a>)}<Link to="/login">Staff Login</Link></div>
        <div><h4>Get in Touch</h4><span>+251 911 234 567</span><span>hello@abcdaycare.edu</span><span>Mon – Fri, 7AM – 6PM</span></div>
      </div>
      <div className="footer-bottom"><span>© 2026 ABC Daycare &amp; Kindergarten. Learn • Grow • Shine.</span><div><Link to="/login">Staff Login</Link><Link to="/register">Enroll</Link></div></div>
    </footer>
  </div>
}
