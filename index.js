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
  const toNumber = 12253374350;

  const searchParams = {
    TableName: 'spendle-user-data',
    Key: {
      userId: 'abc123'
    }
  };

  dynamoDB.get(searchParams).promise().then(res => {
    const spentThisMonth = res.Item.spentThisMonth;
    const target = res.Item.targetSavingsPercentage;
    const income = res.Item.incomeAfterBills;
    const remaining = income - spentThisMonth;
    const budget = remaining * (target / 100);
    const today = budget / daysRemaining;

    client.messages.create({
      body: `Hey! Looks like you spent about $${spentThisMonth.toFixed(2)} this month. 
              \nYou should probably only spend about $${today.toFixed(2)} today. 
              \nYou have $${remaining.toFixed(2)} remaining in your budget for the month!`,
      to: `+${toNumber}`,
      from: '+12252636117'
    }).then(message => context.succeed(message)).catch(error => context.fail(error));    
  }).catch(error => context.fail(error));
}
