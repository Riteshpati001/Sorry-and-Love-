const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendProposalEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"HeartLink ❤️" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return false;
  }
};

const sendAcceptanceEmail = async (senderEmail, senderName, receiverName) => {
  const subject = 'Proposal Accepted ❤️';
  const html = `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%); border-radius: 20px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 20px;">💍</div>
      <h1 style="color: #FF4D6D; font-size: 32px; margin-bottom: 10px;">Congratulations! 🎉</h1>
      <p style="color: #333; font-size: 18px; line-height: 1.6;">Hello <strong>${senderName}</strong>,</p>
      <p style="color: #333; font-size: 18px; line-height: 1.6;">Great news! Your proposal has been <strong style="color: #FF4D6D;">ACCEPTED</strong> ❤️</p>
      <div style="background: white; border-radius: 15px; padding: 20px; margin: 20px 0; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.1);">
        <p style="margin: 5px 0; color: #666;"><strong>Receiver:</strong> ${receiverName}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #333; font-size: 16px;">Your love story begins here! 💕</p>
      <div style="margin-top: 30px; font-size: 40px;">❤️ 💍 💕</div>
    </div>
  `;
  return sendProposalEmail(senderEmail, subject, html);
};

const sendRejectionEmail = async (senderEmail, senderName, receiverName) => {
  const subject = 'Proposal Update';
  const html = `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); border-radius: 20px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 20px;">💔</div>
      <h1 style="color: #666; font-size: 28px; margin-bottom: 10px;">Proposal Update</h1>
      <p style="color: #333; font-size: 18px; line-height: 1.6;">Hello <strong>${senderName}</strong>,</p>
      <p style="color: #333; font-size: 18px; line-height: 1.6;">Unfortunately, your proposal was <strong style="color: #999;">declined</strong>.</p>
      <div style="background: white; border-radius: 15px; padding: 20px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <p style="margin: 5px 0; color: #666;"><strong>Receiver:</strong> ${receiverName}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #666; font-size: 16px;">Thank you for using HeartLink.</p>
      <p style="color: #999; font-size: 14px;">Stay strong. The right one is out there. 💪</p>
    </div>
  `;
  return sendProposalEmail(senderEmail, subject, html);
};

module.exports = { sendAcceptanceEmail, sendRejectionEmail };
