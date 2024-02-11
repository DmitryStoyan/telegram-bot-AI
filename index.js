require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const OpenAI = require("openai");
const mongoose = require("mongoose");
const User = require("./models/users.js");

// Подключение к MongoDB
const db = `mongodb+srv://dimastamc:${process.env.DB_PASSWORD}@cluster0.avg14zw.mongodb.net/node-uesrs?retryWrites=true&w=majority`;

mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((res) => console.log("Connected to DB"))
  .catch((error) => console.log(error));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const bot = new Telegraf(process.env.TELEGRAM_API_KEY);

bot.telegram.setMyCommands([
  { command: "/start", description: "Начальное приветствие" },
  { command: "/info", description: "Получить информацию о боте" },
]);

bot.start((ctx) =>
  ctx.reply(
    "Привет! Напиши мне что-нибудь, и я отвечу тебе! Используй /image <описание> для генерации картинки."
  )
);

bot.command("image", async (ctx) => {
  const description = ctx.message.text.split(" ").slice(1).join(" ");
  if (!description) {
    return ctx.reply("Пожалуйста, укажите описание для картинки.");
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        prompt: description,
        n: 1,
        size: "1024x1024",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const imageUrl = response.data.data[0].url;
    ctx.replyWithPhoto({ url: imageUrl });

    const userId = ctx.message.from.id.toString();
    await User.findOneAndUpdate(
      { userId },
      { $inc: { imageCount: 1 } },
      { new: true }
    );
  } catch (error) {
    console.error("Ошибка при генерации изображения:", error);
    ctx.reply("Извини, произошла ошибка при генерации изображения.");
  }
});

bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id.toString();
  const {
    first_name: firstName,
    last_name: lastName,
    username,
  } = ctx.message.from;

  try {
    let user = await User.findOne({ userId: userId });
    if (user) {
      user.firstName = firstName;
      user.lastName = lastName;
      user.username = username;
      user.textCount += 1;
      await user.save();
    } else {
      user = new User({ userId, firstName, lastName, username, textCount: 1 });
      await user.save();
    }

    const userMessage = ctx.message.text;
    const openAIResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });
    const reply = openAIResponse.choices[0].message.content;
    ctx.reply(reply);
  } catch (error) {
    console.error("Ошибка ", error);
    ctx.reply("Произошла ошибка.");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
