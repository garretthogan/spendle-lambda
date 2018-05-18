const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const moment = require('moment');
const twilio = require('twilio');
const SID = process.env.SID;
const TOKEN = process.env.TOKEN;

exports.handler = function (event, context) {
  const todaysDate = moment().date();
  const daysInMonth = moment().daysInMonth();
  const daysRemaining = (daysInMonth - todaysDate);

  const client = new twilio(SID, TOKEN);

  const searchParams = {
    TableName: 'spendle-user-data',
  };

  dynamoDB.scan(searchParams).promise().then(res => {
    res.Items.forEach(item => {
      const toNumber = item.phoneNumber;
      const spentThisMonth = item.spentThisMonth;
      const target = item.targetSavingsPercentage;
      const income = item.incomeAfterBills;
      const remaining = income - spentThisMonth;
      const budget = (income - (income * (target / 100)) - spentThisMonth);
      const today = budget / daysRemaining;
  
      client.messages.create({
        body: `Hey! Looks like you spent about $${spentThisMonth.toFixed(2)} this month. 
                \nYou should probably only spend about $${today.toFixed(2)} today. 
                \nYou have $${remaining.toFixed(2)} remaining in your budget for the month!`,
        to: `+${toNumber}`,
        from: '+12252636117'
      }).then(message => context.succeed(message)).catch(error => context.fail(error));
    });
  }).catch(error => context.fail(error));
}
