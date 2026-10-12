export const teacherBase = '/dashboard/teacher'
export const teacherMenu = [
  ['Dashboard', 'LayoutDashboard', ''],
  ['My Class', 'School', 'my-class'],
  ['Students', 'UsersRound', 'students'],
  ['Attendance', 'CalendarCheck', 'attendance'],
  ['Lesson Plans', 'BookOpen', 'lesson-plans'],
  ['Assessments', 'ClipboardCheck', 'assessments'],
  ['Exams', 'FilePenLine', 'exams'],
  ['Messages', 'MessageCircle', 'messages'],
  ['Reports', 'ChartNoAxesCombined', 'reports'],
  ['Settings', 'Settings', 'settings'],
]
export const subjects = ['Language', 'Math', 'Science', 'Art', 'Social']
const names = ['Omar Ali','Leyla Ahmed','Yusuf Hassan','Fatima Noor','Abdalla Ibrahim','Zahra Mohamed','Sofia Osman','Adam Farah','Hana Yusuf','Idris Noor','Mariam Omar','Bilal Ahmed','Aisha Hassan','Noah Ali','Salma Osman','Ibrahim Farah','Amal Mohamed','Ismail Yusuf']
export const teacherStudents = names.map((name, i) => ({
  id: `KG1-${String(i + 1).padStart(3, '0')}`,
  name,
  age: i % 3 === 0 ? 5 : 4,
  guardian: ['Hassan Ali','Maryam Ahmed','Hawa Hassan','Ahmed Noor','Sara Ibrahim','Ali Mohamed'][i % 6],
  email: `family${i + 1}@example.com`,
  status: [4, 13].includes(i) ? 'Absent' : 'Present',
  notes: '',
}))
export function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Mogadishu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function dateAfter(days) {
  const day = new Date(`${dateKey()}T12:00:00+03:00`)
  day.setDate(day.getDate() + days)
  return dateKey(day)
}
export function friendlyDate(value = dateKey(), options = {}) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options }).format(new Date(`${value}T12:00:00`))
}
export const initialLessons = [
  { id:'LP-1', title:'Numbers 1 to 10', subject:'Math', date:dateKey(), duration:45, status:'Ready', objective:'Recognize and count numbers from 1 to 10 using everyday objects.', materials:'Counting blocks, number cards, crayons', activity:'Start with a counting song. Build groups of blocks, match each group to a number card, and finish with a drawing activity.' },
  { id:'LP-2', title:'A World of Wonderful Words', subject:'Language', date:dateAfter(1), duration:40, status:'Draft', objective:'Identify beginning sounds and describe a favorite story character.', materials:'Picture books, alphabet cards', activity:'Read together, explore the beginning sounds, and invite each learner to share their favorite character.' },
  { id:'LP-3', title:'Colors of Our Garden', subject:'Art', date:dateAfter(2), duration:50, status:'Ready', objective:'Explore primary colors and express ideas through painting.', materials:'Washable paint, paper, leaves, brushes', activity:'Look for colors in the garden, mix primary colors, and make a leaf-print picture.' },
]
export const initialAssignments = [
  { id:'AS-1', title:'Reading Practice', subject:'Language', due:dateAfter(1), description:'Read a favorite picture book with a family member.', status:'Open' },
  { id:'AS-2', title:'Drawing & Coloring', subject:'Art', due:dateAfter(3), description:'Draw something that makes you happy.', status:'Open' },
  { id:'AS-3', title:'Math Worksheet', subject:'Math', due:dateAfter(5), description:'Count and color the objects from 1 to 10.', status:'Open' },
  { id:'AS-4', title:'Show & Tell', subject:'Social', due:dateAfter(7), description:'Bring a favorite object and tell the class about it.', status:'Open' },
  { id:'AS-5', title:'Little Nature Detectives', subject:'Science', due:dateAfter(8), description:'Find three different leaves and describe their shapes.', status:'Open' },
]
export const initialScores = Object.fromEntries(teacherStudents.map((s, i) => [s.id, Object.fromEntries(subjects.map((subject, j) => [subject, Math.min(100, [92,88,85,95,90][j] + (i % 3 - 1) * 3)]))]))
export const initialThreads = [
  { id:'M-1', name:'Hawa Hassan', student:'Yusuf Hassan', unread:true, messages:[{id:'M1-1', sender:'parent', text:'Good morning, Ms. Amina! Yusuf really enjoyed the story activity yesterday. Is there a book we can read together at home?', time:'8:15 AM'}] },
  { id:'M-2', name:'Maryam Ahmed', student:'Leyla Ahmed', unread:true, messages:[{id:'M2-1',sender:'parent',text:'Thank you for the lovely art activity. Leyla has been telling us all about her garden painting!',time:'Yesterday'}] },
  { id:'M-3', name:'School Office', student:'ABC administration', unread:true, messages:[{id:'M3-1',sender:'parent',text:'A friendly reminder: please review your lesson plans for the coming week.',time:'Yesterday'}] },
  { id:'M-4', name:'Hassan Ali', student:'Omar Ali', unread:false, messages:[{id:'M4-1',sender:'parent',text:'Omar is looking forward to Show & Tell. Thank you for keeping us updated.',time:'Oct 3'}] },
]
export const teacherSchedule = [
  ['08:00 – 09:00','Circle Time','Morning welcome & sharing','School','blue'],
  ['09:00 – 10:00','Language & Literacy','Stories, sounds & discovery','BookOpen','green'],
  ['10:15 – 11:15','Arts & Crafts','Create something wonderful','Palette','orange'],
  ['11:15 – 12:00','Outdoor Play','Move, explore & make friends','Trees','purple'],
]
export const initialActivity = [
  {id:'A-1',icon:'BookOpen',title:'Lesson plan prepared',description:'Mathematics · Numbers 1 to 10',tone:'blue'},
  {id:'A-2',icon:'CalendarCheck',title:'Morning attendance recorded',description:'16 students present, 2 absent',tone:'green'},
  {id:'A-3',icon:'ClipboardList',title:'New assignment created',description:'Reading Practice · Family reading time',tone:'pink'},
  {id:'A-4',icon:'MessageCircle',title:'A new message from a parent',description:'Regarding Yusuf Hassan',tone:'purple'},
]
