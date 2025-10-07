#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📧 Email Service Setup for Sun Power Services ERP');
console.log('================================================\n');

console.log('This script will help you set up email configuration for quotation emails.\n');

const questions = [
  {
    key: 'SMTP_HOST',
    question: 'SMTP Host (default: smtp.gmail.com): ',
    default: 'smtp.gmail.com'
  },
  {
    key: 'SMTP_PORT',
    question: 'SMTP Port (default: 587): ',
    default: '587'
  },
  {
    key: 'SMTP_USER',
    question: 'Email address: ',
    required: true
  },
  {
    key: 'SMTP_PASS',
    question: 'Email password/app password: ',
    required: true
  },
  {
    key: 'EMAIL_FROM_NAME',
    question: 'From name (default: Sun Power Services): ',
    default: 'Sun Power Services'
  },
  {
    key: 'EMAIL_FROM_ADDRESS',
    question: 'From email address: ',
    required: true
  }
];

const config = {};

function askQuestion(index) {
  if (index >= questions.length) {
    generateEnvFile();
    return;
  }

  const q = questions[index];
  const prompt = q.required ? `${q.question}` : `${q.question}`;
  
  rl.question(prompt, (answer) => {
    if (q.required && !answer.trim()) {
      console.log('❌ This field is required. Please try again.\n');
      askQuestion(index);
      return;
    }
    
    config[q.key] = answer.trim() || q.default || '';
    askQuestion(index + 1);
  });
}

function generateEnvFile() {
  console.log('\n📝 Generating .env file...\n');
  
  const envContent = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/sun-power-erp

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REMEMBER_ME_EXPIRES_IN=30d

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (SMTP)
SMTP_HOST=${config.SMTP_HOST}
SMTP_PORT=${config.SMTP_PORT}
SMTP_USER=${config.SMTP_USER}
SMTP_PASS=${config.SMTP_PASS}
EMAIL_FROM_NAME=${config.EMAIL_FROM_NAME}
EMAIL_FROM_ADDRESS=${config.EMAIL_FROM_ADDRESS}

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./src/assets/uploads
PDF_UPLOAD_PATH=./src/assets/uploadPdfs
`;

  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   SMTP Host: ${config.SMTP_HOST}`);
    console.log(`   SMTP Port: ${config.SMTP_PORT}`);
    console.log(`   Email User: ${config.SMTP_USER}`);
    console.log(`   From Name: ${config.EMAIL_FROM_NAME}`);
    console.log(`   From Address: ${config.EMAIL_FROM_ADDRESS}`);
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Restart your API server: npm run dev');
    console.log('2. Test sending a quotation email');
    console.log('\n💡 For Gmail users: Make sure to use an App Password, not your regular password.');
    console.log('   Enable 2FA and generate an App Password in your Google Account settings.');
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    console.log('\n📝 Manual Setup:');
    console.log('Create a .env file in the api directory with the following content:');
    console.log('\n' + envContent);
  }
  
  rl.close();
}

console.log('💡 Important Notes:');
console.log('- For Gmail: Use an App Password, not your regular password');
console.log('- Enable 2-Factor Authentication in your Google Account');
console.log('- Generate App Password: Security → 2-Step Verification → App passwords\n');

askQuestion(0);
