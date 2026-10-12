import nodemailer from 'nodemailer'

const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']

export function createEmailService(env) {
  if (env.NODE_ENV === 'test') return { configured: true, verify: async () => {}, sendVerificationCode: async () => {}, sendCourseNotice: async () => {} }
  const missing = keys.filter(key => !env[key])
  if (missing.length) return { configured: false, missing }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
  })
  return {
    configured: true,
    verify: () => transporter.verify(),
    sendCourseNotice: ({ email, studentName, courseName, startDate, endDate, fee, paymentType }) => transporter.sendMail({
      from: env.SMTP_FROM, to: email, subject: `${studentName} has been enrolled in ${courseName}`,
      text: `Hello,\n\n${studentName} has been enrolled in the accelerated course "${courseName}" (${startDate} to ${endDate}).\nCourse fee: ${fee} (${paymentType}).\n\nPlease contact the school office if you have any questions.`,
    }),
    sendVerificationCode: ({ email, code }) => transporter.sendMail({
      from: env.SMTP_FROM, to: email, subject: 'Verify your ABC Daycare account',
      text: `Welcome to ABC Daycare!\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not create this account, you can ignore this email.`,
    }),
  }
}
