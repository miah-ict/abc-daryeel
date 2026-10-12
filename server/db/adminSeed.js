export const initialStudents = [
 {id:'ST-001',name:'Omar Ali',group:'KG 1',guardian:'Hassan Ali',email:'hassan@example.com',status:'Present'},
 {id:'ST-002',name:'Leyla Ahmed',group:'KG 1',guardian:'Maryam Ahmed',email:'maryam@example.com',status:'Present'},
 {id:'ST-003',name:'Yusuf Hassan',group:'KG 2',guardian:'Amina Hassan',email:'amina@example.com',status:'Present'},
 {id:'ST-004',name:'Fatima Noor',group:'KG 1',guardian:'Ahmed Noor',email:'ahmed@example.com',status:'Present'},
 {id:'ST-005',name:'Abdalla Ibrahim',group:'Toddler',guardian:'Hawa Ibrahim',email:'hawa@example.com',status:'Absent'},
 {id:'ST-006',name:'Zahra Mohamed',group:'KG 2',guardian:'Ali Mohamed',email:'ali@example.com',status:'Present'},
 {id:'ST-007',name:'Sofia Osman',group:'Toddler',guardian:'Osman Yusuf',email:'osman@example.com',status:'Present'},
 {id:'ST-008',name:'Adam Farah',group:'Infant',guardian:'Nadia Farah',email:'nadia@example.com',status:'Absent'},
]
export const initialTeachers = [
 {id:'TC-001',name:'Amina Hassan',email:'amina@abcdaycare.edu',phone:'+252 61 555 0101',location:'Hodan',employmentType:'salary',monthlySalary:600,status:'Active'},
 {id:'TC-002',name:'Maryam Ali',email:'maryam@abcdaycare.edu',phone:'+252 61 555 0102',location:'Wadajir',employmentType:'salary',monthlySalary:550,status:'Active'},
 {id:'TC-003',name:'Fatima Ahmed',email:'fatima@abcdaycare.edu',phone:'+252 61 555 0103',location:'Waberi',employmentType:'internship',internshipMonths:6,status:'Active'},
 {id:'TC-004',name:'Nadia Osman',email:'nadia@abcdaycare.edu',phone:'+252 61 555 0104',location:'Karaan',employmentType:'salary',monthlySalary:500,status:'Active'},
]
export const initialSubjects = [
 {id:'SUB-001',name:'Mathematics',teacherIds:['TC-001','TC-002']},
 {id:'SUB-002',name:'English',teacherIds:['TC-002','TC-004']},
 {id:'SUB-003',name:'Science',teacherIds:['TC-001','TC-003']},
]
export const initialStaff = [
 {id:'SF-001',name:'Ali Hassan',group:'Operations',guardian:'Facilities Coordinator',email:'ali@abcdaycare.edu',status:'Active'},
 {id:'SF-002',name:'Fatima Mohamed',group:'Kitchen',guardian:'Head Cook',email:'fatima.m@abcdaycare.edu',status:'Active'},
 {id:'SF-003',name:'Mohamed Omar',group:'Transport',guardian:'School Bus Driver',email:'mohamed@abcdaycare.edu',status:'Active'},
 {id:'SF-004',name:'Ahmed Ibrahim',group:'ICT',guardian:'IT Support',email:'ahmed@abcdaycare.edu',status:'Active'},
]
export const initialClasses = [
 {id:'CL-001',name:'Hillaac',level:'Lower',group:'Lower',capacity:20},
 {id:'CL-002',name:'Horumar',level:'Middle',group:'Middle',capacity:20},
 {id:'CL-003',name:'Mustaqbal',level:'Upper',group:'Upper',capacity:20},
]
