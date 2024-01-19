const { Telegraf, Markup, Scenes, session } = require("telegraf");
const express = require("express");
const app = express();
const dotenv = require('dotenv').config();
const { CryptoPay, Assets, PaidButtonNames } = require('@foile/crypto-pay-api');
const {connectDB} = require('./db/db') 
const UserDetails = require("./Model/user");
const Marketer = require('./Model/marketer'); 
const nodemailer = require('nodemailer')

const botToken = process.env.botToken || "6707170701:AAHUfdtPjwfuWRYDThtLKEcxckfZqzCDCrY";

const bot = new Telegraf(botToken);
connectDB()
const token = "146147:AAOXC6qly8cwRrJpGxoyPKY00FlmSehnKjh";
const cryptoPay = new CryptoPay(token, {
    hostname: 'pay.crypt.bot',
    protocol: 'https'
});

const getInvoiceStatus = async (invoiceId) => {
    try {
        // Fetch all paid invoices
        const { items: paidInvoices } = await cryptoPay.getInvoices({ asset: 'ETH', count: 10, status: 'paid' });

        // Find the invoice with the specified ID in the list of paid invoices
        const targetInvoice = paidInvoices.find(invoice => invoice.invoice_id === invoiceId);

        if (targetInvoice) {
            console.log('Invoice Details:', targetInvoice);

            // Check the 'status' property in the target invoice object
            if (targetInvoice.status) {
                console.log('Invoice Status:', targetInvoice.status);
                return targetInvoice.status; // Return the status
            } else {
                console.log('Unable to determine invoice status.');
                return null; // Return null if status is unavailable
            }
        } else {
            console.log(`Invoice with ID '${invoiceId}' not found in the list of paid invoices.`);
            return null; // Return null if the invoice is not found
        }
    } catch (error) {
        console.error('Error fetching paid invoices:', error.message);
        return null; // Return null in case of an error
    }
};


const paymentScene = new Scenes.BaseScene("paymentScene");
const couponCodeScene = new Scenes.BaseScene("couponCodeScene");

// Register the scenes with Telegraf
const stage = new Scenes.Stage([
    paymentScene,
    couponCodeScene
]);
bot.use(session());
bot.use(stage.middleware());


bot.use(async (ctx, next) => {
    const userId = ctx.from.id;

    // Check if user details are already in the database
    const existingUser = await UserDetails.findOne({ userId });

    if (!existingUser) {
        // Save user details to the database
        const newUser = new UserDetails({
            userId,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
        });

        await newUser.save();
    }

    // Continue to the next middleware
    next();
});


bot.start(async (ctx) => {
    const userId = ctx.from.id;

    const existingUser = await UserDetails.findOne({ userId });
    console.log("Existing user:", existingUser);

    if (existingUser) {
        const welcomeMessage = `🚀 Welcome to 3BD Coding Bootcamp! 🚀\n\n👤 Participant ID: ${userId}\n\n💰 Payment Status: ${existingUser.payStatus}\n🔒 Access Granted: ${existingUser.payStatus === 'paid' ? 'Yes' : 'No'}`;
        ctx.replyWithVideo(
            { source: "./loo.JPG" },
            {
                caption: welcomeMessage,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Make Payment", callback_data: "make_payment" },
                        ],
                        [
                            { text: "Enter Coupon Code", callback_data: "enter_code" },
                            { text: "Contact Support", url: "https://t.me/Habibilord" }
                        ],
                    ],
                },
            }
        );
    }
});


bot.action('make_payment', async (ctx)=>{
    const userId = ctx.from.id;

    // Check if user details are already in the database
    const existingUser = await UserDetails.findOne({ userId });

    if (existingUser && existingUser.payStatus === 'paid') {
        ctx.reply('You have already paid. No need to make payments.');
    }else{
        ctx.scene.enter("paymentScene")
    }
    
})

bot.action('enter_code', async (ctx) => {
    const userId = ctx.from.id;

    // Check if user details are already in the database
    const existingUser = await UserDetails.findOne({ userId });

    if (existingUser && existingUser.payStatus === 'paid') {
        ctx.reply('You have already paid. No need to enter a coupon code.');
    } else {
        ctx.scene.enter('couponCodeScene');
    }
});


paymentScene.enter(async (ctx) => {
    const userId = ctx.from.id;
    const existingUser = await UserDetails.findOne({ userId });

    // Check if the user is eligible for generating an invoice
    if (existingUser && existingUser.payStatus === 'pending') {
        try {
            // Generate the invoice
            const invoice = await cryptoPay.createInvoice(Assets.USDT, 10, {
                description: '3BD Bootcamp Registration Fee',
                paid_btn_name: PaidButtonNames.OPEN_BOT,
                paid_btn_url: 'https://t.me/AckPay_bot'
            });

            // Save the invoice ID in the session
            ctx.session.invoiceIdToCheck = invoice.invoice_id;

            // Format the created_at date for better readability
            const formattedCreatedAt = new Date(invoice.created_at).toLocaleString();

            // Compose the invoice details message
            const invoiceMessage = `
🧾 *Invoice Details*:
        
🆔 Invoice ID: ${invoice.invoice_id}
📎 Hash: ${invoice.hash}
💸 Amount: ${invoice.amount} ${invoice.asset}
📝 Description: ${invoice.description}
📊 Status: ${invoice.status}
🕒 Created At: ${formattedCreatedAt}
`;

            // Send the invoice details message with Pay Now and Check Payment Status buttons
            await ctx.replyWithMarkdown(invoiceMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Pay Now', url: `${invoice.pay_url}` }],
                        [{ text: 'Check Payment Status', callback_data: 'pay_status' }]
                    ]
                }
            });
        } catch (error) {
            console.error('Error generating invoice:', error.message);
            await ctx.reply('Oops! Something went wrong while generating the invoice. Please try again.');
        }
    } else {
        // Handle the case where the user is not eligible for generating an invoice
        ctx.reply("You've paid");
    }
});


const sendPay = async (email, invoiceId) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'dharmiegra4@gmail.com', // your email
            pass: 'suvujhrzquhdgskr' // your email password or an app password
        }
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"ACK HUB" <dharmiegra4@gmail.com>', // sender address
        to: email, // list of receivers
        subject: '3BD Payment Confirmation', // Subject line
        text: `The payment for invoice ${invoiceId} has been confirmed.`, // plain text body
        html: `<p>The payment for invoice ${invoiceId} has been confirmed.</p>` // html body
    });

    console.log('Email sent: %s', info.messageId);
}

paymentScene.action("pay_status", async (ctx) => {
    await ctx.reply('Checking payment status....');
    const gifPath = './successful.gif';

    try {
        const invoiceIdToCheck = ctx.session.invoiceIdToCheck;
        const paymentStatus = await getInvoiceStatus(invoiceIdToCheck);

        if (paymentStatus === 'paid') {
            await ctx.replyWithAnimation({ source: gifPath }, { caption: 'Payment confirmed✅' });
            await ctx.reply('Coupon code verified successfully. Please join the official community [here](https://t.me/+6S0VeCQRJ1A3ZGQ0).');
            const userEmail = 'dharmiegra4@gmail.com'; // replace with the user's email
            await sendPay(userEmail, invoiceIdToCheck);


            // Update user details after successful payment
            const userId = ctx.from.id;
            await UserDetails.updateOne(
                { userId },
                {
                    $set: {
                        payStatus: 'paid',
                        paymentMethods: 'crypto'  // Assuming paymentMethods is an array field
                    }
                }
            );

           
        } else {
            ctx.reply(`Payment status: ${paymentStatus}. Please make payment.`);
        }

    } catch (error) {
        console.error('Error checking payment status:', error.message);
        ctx.reply('An error occurred while checking the payment status.');
    }
});


couponCodeScene.enter(async (ctx)=>{
    await ctx.reply('Please enter the coupon code')
})



const verifyCode = async (ctx, userId, code) => {
    try {
        // Find the user details based on the userId
        const user = await UserDetails.findOne({ userId });

        // Check if the user exists
        if (!user) {
            throw new Error('User not found');
        }

        // Assuming your user model has a field for couponCode and freeSlots
        const { payStatus } = user;

        // Check if the user has already paid
        if (payStatus === 'paid') {
            ctx.reply('You have already paid');
        }

        // Find the marketer based on the provided code
        const marketer = await Marketer.findOne({ code });

        // Check if the marketer (coupon code) exists
        if (!marketer) {
            ctx.reply('Invalid coupon code, check your code or pay with crypto');
        }

        let updatedFreeSlots
        // Check if there are available free slots
        if (marketer.freeSlots <= 0) {
            ctx.reply('No available free slots');
            return false
        }else{
            // Deduct one from the free slots of the marketer (coupon code)
        updatedFreeSlots = marketer.freeSlots - 1;
        }

        

        // Update the user details with the new freeSlots value and set payStatus to 'paid'
        await UserDetails.updateOne(
            { userId },
            {
                $set: {
                    payStatus: 'paid'
                },
                $push: {
                    paymentMethods: 'couponCode'   // Assuming paymentMethods is an array field
                }
            }
        );

        await Marketer.updateOne(
            { code },
            {
                $set: {
                    freeSlots: updatedFreeSlots
                }
            }
        );

        console.log('Code verification successful');
        return true; // Code verification successful
    } catch (error) {
        console.error('Code verification error:', error.message);
        return false; // Return false on verification error
    }
};

// Example usage in couponCodeScene
couponCodeScene.on('message', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('Verifying code...');
    const couponCode = ctx.message.text;

    try {
        // Verify the coupon code
        const verificationResult = await verifyCode(ctx, userId, couponCode);

        if (verificationResult) {
            // Code verification successful
            await ctx.reply('Coupon code verified successfully. Please join the official community [here](https://t.me/+6S0VeCQRJ1A3ZGQ0).');
            ctx.scene.leave();            
        } else {
            // Code verification failed
            await ctx.reply('Coupon code verification failed. Please check your code.');
        }
    } catch (error) {
        // Handle other errors
        console.error('Coupon code verification error:', error.message);
        ctx.leave()
    }
});

bot.launch()