const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

// Step 1: Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'surbhivasoya11@gmail.com',
    pass: 'hvey iiqt jqfz krxc',
  },
});

// Step 2: Set handlebars options
const handlebarOptions = {
  viewEngine: {
    extname: '.handlebars',
    partialsDir: path.resolve(__dirname, '../templates'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, '../templates'),
  extName: '.handlebars',
};

// Step 3: Use handlebars plugin
transporter.use('compile', hbs(handlebarOptions));

// Step 4: Send email
exports.sendJobLinkEmail = async (to, token) => {
  const link = `https://aiinterview.deepvox.ai/?token=${token}`;
  await transporter.sendMail({
    from: '"AI Interview" <fenilsavani1111@gmail.com>',
    to,
    subject: 'Your AI Interview Link',
    template: 'jobLink',
    context: { link },
  });
};
