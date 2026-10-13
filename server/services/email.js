import nodemailer from 'nodemailer'

const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']

function brevoService(env) {
  const send = async ({ email, subject, text }) => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email }],
        subject,
        textContent: text,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const detail = String(await response.text()).slice(0, 500)
      throw new Error(`Brevo email API returned ${response.status}: ${detail}`)
    }
  }
  return {
    configured: true,
    verify: async () => true,
    sendCourseNotice: ({ email, studentName, courseName, startDate, endDate, fee, paymentType }) => send({
      email,
      subject: `${studentName} has been enrolled in ${courseName}`,
      text: `Hello,\n\n${studentName} has been enrolled in the accelerated course "${courseName}" (${startDate} to ${endDate}).\nCourse fee: ${fee} (${paymentType}).\n\nPlease contact the school office if you have any questions.`,
    }),
    sendVerificationCode: ({ email, code }) => send({
      email,
      subject: 'Verify your ABC Daycare account',
      text: `Welcome to ABC Daycare!\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not create this account, you can ignore this email.`,
    }),
  }
}

export function createEmailService(env) {
  if (env.NODE_ENV === 'test') return { configured: true, verify: async () => {}, sendVerificationCode: async () => {}, sendCourseNotice: async () => {} }
  if (env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL) return brevoService(env)
  const missing = keys.filter(key => !env[key])
  if (missing.length) return { configured: false, missing }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER.trim(), pass: env.SMTP_PASS.replace(/\s+/g, '') },
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
