const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars').default; // <-- THIS LINE
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fenilsavani1111@gmail.com',
    pass: 'nuxv tbox eaxx fckn',
  },
});

const handlebarOptions = {
  viewEngine: {
    extname: '.hbs',
    partialsDir: path.resolve(__dirname, '../templates'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, '../templates'),
  extName: '.hbs',
};

transporter.use('compile', hbs(handlebarOptions));

exports.sendJobLinkEmail = async (to, token) => {
  const link = `https://aiinterview.deepvox.ai/?token=${token}`;
  await transporter.sendMail({
    from: '"AI Interview" <your_email@gmail.com>',
    to,
    subject: 'Your AI Interview Link',
    template: 'jobLink',
    context: { link },
  });
};