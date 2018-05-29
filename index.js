const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const fetch = require('node-fetch');
const moment = require('moment');
const twilio = require('twilio');
const SID = process.env.SID;
const TOKEN = process.env.TOKEN;

function getBudgetText (dailyBudget, remainingBudget, targetSavings) {
  return dailyBudget > 0 ? 
  `You should only spend $${dailyBudget.toFixed(2)} today if you want to reach your goal of saving $${targetSavings.toFixed(2)} this month.` : 
  `You went over your budget by $${remainingBudget.toFixed(2) * -1}. Maybe only spend about $15 today.`
}

exports.handler = function (event, context) {
  const todaysDate = moment().date();
  const daysInMonth = moment().daysInMonth();
  const daysRemaining = (daysInMonth - todaysDate);
  const filters = [
    'Payment',
    'Utilities',
    'Subscription',
    'Rent',
    'Square Cash',
    'Student Aid and Grants',
    'Loans and Mortgages',
    'Internal Account Transfer',
    'Transfer',
    'Deposit',
    'Telecommunication Services',
    'Education',
    'Bank Fees',
  ];

  const client = new twilio(SID, TOKEN);

  const searchParams = {
    TableName: 'spendle-user-data',
  };

  const data = {

  };

  const headers = {
    'Content-Type': 'application/json',
  };

  dynamoDB.scan(searchParams).promise().then(data => {
    const messages = [];
    data.Items.forEach(item => {
      const toNumber = item.phoneNumber;
      const spentThisMonth = item.spentThisMonth;
      const target = item.targetSavingsPercentage;
      const income = item.incomeAfterBills;
      const remaining = income - spentThisMonth;
      const budget = (income - (income * (target / 100)) - spentThisMonth);
      const today = budget / daysRemaining;

      const userId = item.userId;
      const access_token = item.plaidAccessToken;

      fetch('https://spendle-backend.herokuapp.com/progress_report', {
        method: 'POST',
        body: JSON.stringify({
          access_token: access_token,
          start_date: moment().startOf('month'),
          end_date: moment().endOf('month'),
          filters: filters,
          user_id: userId,
        }),
        headers: headers,
      }).then(reportResponse => reportResponse.json()).then((report) => {
        // text the user their report
        messages.push(client.messages.create({
          body: `
          Hey! Looks like you spent about $${report.totalSpent.toFixed(2)} this month. You spent $${report.spentLastWeek.toFixed(2)} last week and $${report.spentYesterday.toFixed(2)} yesterday. ${getBudgetText(report.dailyBudget, report.remainingBudget, report.targetSavings)}
          `,
          to: `+${toNumber}`,
          from: '+12252636117'
        }));
        Promise.all(messages).then((allTexts) => {
          context.succeed(allTexts);
        }).catch(context.fail);
      }).catch(error => context.fail(error));
    });
  }).catch(error => context.fail(error));
}
