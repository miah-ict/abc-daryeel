export const studentBase = '/dashboard/student'
export const studentMenu = [
  ['Dashboard','House',''], ['My Classes','UsersRound','my-classes'],
  ['My Assignments','ClipboardList','my-assignments'], ['Attendance','Clock3','attendance'],
  ['Grades','ClipboardCheck','grades'], ['Messages','MessageCircle','messages'],
  ['Gallery','Image','gallery'], ['Profile','UserRound','profile'], ['Settings','Settings','settings'],
]
export const studentSubjects = [
  {id:'english',name:'English',icon:'BookOpen',tone:'blue',label:'Today',score:90,teacher:'Amina Hassan',description:'Stories, sounds, and a wonderful world of words.',time:'08:00 – 09:00',art:[309,505,66,66]},
  {id:'math',name:'Math',icon:'Calculator',tone:'green',label:'Today',score:85,teacher:'Amina Hassan',description:'Count, sort, and discover patterns all around you.',time:'09:00 – 10:00',art:[418,505,66,66]},
  {id:'science',name:'Science',icon:'FlaskConical',tone:'blue',label:'Tomorrow',score:92,teacher:'Maryam Ali',description:'Ask questions and explore the wonders of nature.',time:'Tomorrow · 09:00',art:[526,505,66,66]},
  {id:'art',name:'Art',icon:'Palette',tone:'blue',label:'Tomorrow',score:95,teacher:'Fatima Noor',description:'Create, imagine, and express yourself with colors.',time:'10:15 – 11:15',art:[634,505,66,66]},
  {id:'islamic',name:'Islamic Studies',icon:'Landmark',tone:'orange',label:'In Progress',score:94,teacher:'Amina Hassan',description:'Learn about kindness, good manners, and caring for others.',time:'Tomorrow · 11:15',art:[742,505,66,66]},
]
export function studentDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
export function daysFromNow(n) {
  const date = new Date(`${studentDate()}T12:00:00+03:00`)
  date.setDate(date.getDate()+n)
  return studentDate(date)
}
export function showDate(date, options={}) {
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',...options}).format(new Date(`${date}T12:00:00`))
}
export const studentAssignments = [
  {id:'HW-1',title:'My Favorite Story',subject:'English',due:daysFromNow(1),description:'Read a picture book with your family. Draw your favorite character and tell us why you like them.',status:'Pending',icon:'BookOpen',tone:'purple',response:''},
  {id:'HW-2',title:'Count & Color',subject:'Math',due:daysFromNow(2),description:'Find five things at home. Draw them, count them, and write the numbers from 1 to 5.',status:'Pending',icon:'Calculator',tone:'blue',response:''},
  {id:'HW-3',title:'Little Nature Explorer',subject:'Science',due:daysFromNow(3),description:'Look for three different leaves. Tell us about their colors and shapes.',status:'Pending',icon:'Sprout',tone:'green',response:''},
  {id:'HW-4',title:'A Rainbow of Feelings',subject:'Art',due:daysFromNow(4),description:'Make a colorful picture that shows how you feel today. Give your artwork a name.',status:'Pending',icon:'Palette',tone:'pink',response:''},
  {id:'HW-5',title:'My Act of Kindness',subject:'Islamic Studies',due:daysFromNow(5),description:'Do something kind for a friend or family member. Tell us what you did and how it made you feel.',status:'Pending',icon:'Heart',tone:'orange',response:''},
]
export const studentActivities = [
  {id:'ACT-1',time:'08:00 – 09:00',title:'English Lesson',description:'Classroom Activity',icon:'BookOpen',tone:'purple',status:'Completed',subject:'english'},
  {id:'ACT-2',time:'09:00 – 10:00',title:'Math Activity',description:'Numbers & Counting',icon:'Calculator',tone:'green',status:'Completed',subject:'math'},
  {id:'ACT-3',time:'10:15 – 11:15',title:'Arts & Crafts',description:'Drawing & Coloring',icon:'Palette',tone:'purple',status:'Upcoming',subject:'art'},
  {id:'ACT-4',time:'11:15 – 12:00',title:'Outdoor Play',description:'Playground',icon:'Trees',tone:'green',status:'Upcoming',subject:'science'},
]
export const studentAnnouncements = [
  {id:'N-1',title:'New School Supplies',tag:'School News',date:daysFromNow(-2),image:'/gallery/art.png',description:'We have new learning materials for all KG classes.',body:'Our classrooms have new crayons, books, building blocks, and creative materials. Your teacher will introduce them during class this week. Come ready to explore and create!'},
  {id:'N-2',title:'Sports Day',tag:'Event',date:daysFromNow(-4),image:'/gallery/playground.png',description:'Join us for our annual sports day event.',body:'Get ready for a cheerful day of games and teamwork. Wear comfortable clothes and bring your water bottle. Your teacher will share the final schedule with your family.'},
  {id:'N-3',title:'Parent Meeting',tag:'Notice',date:daysFromNow(-7),image:'/gallery/story.png',description:'Parent-teacher meeting will be held next week.',body:'We look forward to celebrating your progress with your family. Please ask your parent or guardian to contact the class teacher to arrange a meeting time.'},
]
export const studentGallery = [
  {id:'P-1',title:'Little Artists at Work',category:'Classroom',src:'/gallery/art.png'},
  {id:'P-2',title:'Playground Adventures',category:'Outdoor',src:'/gallery/playground.png'},
  {id:'P-3',title:'A Story to Share',category:'Classroom',src:'/gallery/story.png'},
  {id:'P-4',title:'Music & Happy Moments',category:'Events',src:'/gallery/music.png'},
  {id:'P-5',title:'Lunch With Friends',category:'Classroom',src:'/gallery/lunch.png'},
  {id:'P-6',title:'Our Graduation Celebration',category:'Events',src:'/gallery/graduation.png'},
]
export const studentThreads = [
  {id:'T-1',name:'Amina Hassan',role:'Class teacher',unread:true,messages:[{id:'S-1',from:'teacher',text:'Hello Ahmed! You did a wonderful job reading today. Keep practicing with your family — I’m proud of your progress!',time:'9:30 AM'}]},
  {id:'T-2',name:'School Office',role:'Administration',unread:true,messages:[{id:'S-2',from:'teacher',text:'Welcome to your student workspace! You can find your class activities, assignments, and happy classroom memories here.',time:'Yesterday'}]},
  {id:'T-3',name:'Maryam Ali',role:'Science teacher',unread:true,messages:[{id:'S-3',from:'teacher',text:'Our next science lesson is all about leaves. Look for different shapes and colors on your way to school!',time:'Yesterday'}]},
]
export function makeStudentAttendance() {
  const records=[]
  const date=new Date(`${studentDate()}T12:00:00+03:00`)
  while(records.length<25) {
    if(date.getDay()!==0&&date.getDay()!==6) {
      const i=records.length
      records.push({date:studentDate(date),status:[6,17].includes(i)?'Absent':i===11?'Late':'Present',arrival:[6,17].includes(i)?'—':i===11?'08:20 AM':'07:55 AM'})
    }
    date.setDate(date.getDate()-1)
  }
  return records
}
