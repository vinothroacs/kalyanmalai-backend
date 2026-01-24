const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendSignupMail = async (toEmail, name) => {
  try {
    await transporter.sendMail({
      from: `"Kalyanamalai Matrimony" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: "Welcome to Kalyanamalai Matrimony 🎉",
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now login and complete your profile.</p>
        <br/>
        <b>– Kalyanamalai Matrimony Team</b>
      `,
    });

    console.log("✅ Signup mail sent to", toEmail);
  } catch (err) {
    console.error("❌ Signup mail failed:", err.message);
  }
};

module.exports = sendSignupMail;
