import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
})

export async function sendEmail({
  to,
  subject,
  body,
  trackingId,
}: {
  to: string
  subject: string
  body: string
  trackingId: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  const trackingPixel = `<img src="${baseUrl}/api/track/${trackingId}" width="1" height="1" style="display:none" alt="" />`

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;font-size:15px;line-height:1.7;color:#333">
      ${body.replace(/\n/g, '<br>')}
      ${trackingPixel}
    </div>
  `

  await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to,
    subject,
    html: htmlBody,
    text: body,
  })
}
