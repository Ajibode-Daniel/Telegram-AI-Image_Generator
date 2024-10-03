const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
var bodyParser = require('body-parser')
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');
const OpenAI = require("openai");
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const axios = require("axios");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'));
app.use(bodyParser.json({ limit: '10mb' }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '-' + Date.now() + ext);
    }
});

const upload = multer({ storage: storage });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


const tBot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

function sendErrorMessage(chatId) {
    tBot.sendMessage(chatId, '<pre> </pre>\n\n═══ <b> System Response </b> ═══\n\nRequest failed, try again<pre> </pre>\n\n═══ <b> System Response </b> ═══\n\n', { parse_mode: 'Html', ...restartMarkupOptions });
}

function generateRequestId() {
    let randomId = '';

    for (let i = 0; i < 6; i++) {
        const randomNumber = Math.floor(Math.random() * 10);
        randomId += randomNumber;
    }

    return randomId;
}

async function generateImage(user_id, prompt, msg) {
    console.log(msg);
    try {
        const jobId = generateRequestId();

        db.query("INSERT into jobs(userId,jobId,status,prompt) VALUES(?,?,?,?)", [user_id, jobId, 'pending', prompt], async (err, result) => {


            if (err) {
                console.log(err);
                return;
            }

            const formData = {
                prompt: `${prompt}`,
                output_format: "png"
            };

            const response = await axios.postForm(
                `https://api.stability.ai/v2beta/stable-image/generate/core`,
                axios.toFormData(formData, new FormData()),
                {
                    validateStatus: undefined,
                    responseType: "arraybuffer",
                    headers: {
                        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                        Accept: "image/*"
                    },
                },
            );

            if (response.status === 200) {

                cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
                    if (error) {
                        console.error('Error uploading image to Cloudinary:', error);
                        //return res.send({ feedback: "error", message: "error uploading image" });
                    }
                    console.log(result.secure_url);

                    let imageUrl = result.secure_url;

                    tBot.sendPhoto(msg.chat.id, imageUrl, {
                        caption: `@${msg.from.username}, your image has been generated.\n\nprompt: ${prompt}`,
                        parse_mode: 'Markdown',
                    });

                    db.query("UPDATE jobs SET imageUrl = ?, status = ? WHERE jobId = ?", [result.secure_url, 'completed', jobId]);

                }).end(Buffer.from(response.data));

            } else {
                //throw new Error(`${response.status}: ${response.data.toString()}`);
            }
        });


    } catch (e) {
        console.log(e);
    }
}

function startBot(chatId, parentMessageId) {

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🟢 Generate Image',
                        callback_data: 'button1',
                    }
                ],
                [
                    {
                        text: '🟢 Check Status',
                        callback_data: 'button2',
                    },
                    {
                        text: '🟢 My Images',
                        callback_data: 'button3',
                    },
                ],
            ],
        },
    };

    const responseMessage = '<b> </b> \n\n📷<b>Welcome to ShutterAI</b>⚡️\n\nThis bot helps you to generate any image of your choice by simply sending a text description of the image you want.\n\n✅ Generate images \n✅ Upscale images \n✅ Remove image background  \n\n═══ Copyright - ShutterAI. 2024 ═══\n<pre> </pre>';

    tBot.sendMessage(chatId, responseMessage, { parse_mode: 'Html', ...options }).then((data) => {

        tBot.deleteMessage(chatId, parentMessageId).catch((error) => {
            console.error('Error deleting message:', error);
        });

        const messageId = data.message_id;

        setTimeout(() => {
            tBot.deleteMessage(chatId, messageId).catch((error) => {
                console.error('Error deleting replied-to message:', error);
            });
        }, 10000);
    });
}

const restartMarkupOptions = {
    reply_markup: {
        inline_keyboard: [
            [
                {
                    text: '🟢 Continue',
                    callback_data: 'restart',
                }
            ]
        ],
    },
};

// Listen for the /start command
tBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    startBot(chatId, messageId);
});

// Handle callback queries
tBot.on('callback_query', (query) => {
    //console.log(query);

    const { data } = query;
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    const messageOptions = {
        reply_markup: {
            force_reply: true, 
        },
        disable_web_page_preview: true
    };

    if (data === 'button1') {

        const messageId = query.message.message_id;

        db.query("SELECT * FROM users WHERE telegramId = ?", [userId], (err, result) => {

            if (err) {
                tBot.sendMessage(chatId, 'Request failed, try again');
                return;
            }
            if (result.length > 0) {

                tBot.sendMessage(
                    chatId,
                    'Describe the image you want to generate',
                    messageOptions
                ).then((data) => {
                    const chatId = data.chat.id;

                    /*tBot.deleteMessage(chatId, query.message.message_id).catch((error) => {
                        console.error('Error deleting message:', error);
                    });

                    const repliedMessageId = data.message_id;
                    setTimeout(() => {
                        tBot.deleteMessage(chatId, repliedMessageId).catch((error) => {
                            console.error('Error deleting replied-to message:', error);
                        });
                    }, 120000);*/
                });
                return;

            } else {
                db.query("INSERT INTO users(telegramId) VALUES(?)", [userId], (err, result) => {

                    if (err) {
                        tBot.sendMessage(chatId, 'Request failed, try again');
                        return;
                    }

                    tBot.sendMessage(
                        chatId,
                        'Describe the image you want to generate',
                        messageOptions
                    ).then((data) => {

                        const chatId = data.chat.id;

                        tBot.deleteMessage(chatId, query.message.message_id).catch((error) => {
                            console.error('Error deleting message:', error);
                        });

                        const repliedMessageId = data.message_id;
                        setTimeout(() => {
                            tBot.deleteMessage(chatId, repliedMessageId).catch((error) => {
                                console.error('Error deleting replied-to message:', error);
                            });
                        }, 120000);
                    });
                });
            }
        })

    }

    if (data === 'button2') {

        console.log(query)

        try {

            db.query("SELECT * FROM jobs WHERE userId = ? AND status = 'pending'", [userId], (err, result) => {

                if (err) {
                    tBot.sendMessage(chatId, 'Request failed, try again');
                    return;
                }

                if (result.length > 0) {
                    tBot.sendMessage(query.message.chat.id, '\n\n═══ <b> System Response </b> ═══\n\n @' + query.from.username + ', Your request is in process. You will receive a response shortly\n\n═══ <b> System Response </b> ═══\n\n', { parse_mode: 'Html', ...restartMarkupOptions }).then((data) => {

                        tBot.deleteMessage(chatId, query.message.message_id).catch((error) => {
                            console.error('Error deleting message:', error);
                        });

                    });
                } else {

                    tBot.sendMessage(chatId, 'No pending request found', { parse_mode: 'Html', ...restartMarkupOptions }).then((data) => {

                        tBot.deleteMessage(chatId, data.message_id).catch((error) => {
                            console.error('Error deleting message:', error);
                        });
                    });

                }

            });

        } catch (error) {
            console.log(error);
        }

    }

    if (data === 'allRequests') {

        fetchRequests({ userId, chatId });

    }


    if (data == "restart") {
        startBot(chatId, query.message.message_id);
    }

    tBot.answerCallbackQuery(query.id);
});

tBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.reply_to_message) {

        console.log(msg.reply_to_message.text)
        
        const userReply = msg.text;
        console.log(userReply)

        if (msg.reply_to_message.text === 'Describe the image you want to generate') {

            tBot.deleteMessage(msg.chat.id, msg.message_id).catch((error) => {
                console.error('Error deleting message:', error);
            });

            const repliedMessageId = msg.reply_to_message.message_id;
            tBot.deleteMessage(msg.chat.id, repliedMessageId).catch((error) => {
                console.error('Error deleting replied-to message:', error);
            });

            tBot.sendMessage(msg.chat.id, '\n\n═══ <b> System Response </b> ═══\n\n @' + msg.from.username + ', your request has been received and is currently processing. You will receive a response shortly\n\n═══ <b> System Response </b> ═══\n\n', { parse_mode: 'Html', ...restartMarkupOptions });

            generateImage(userId, userReply, msg);

        }

    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})