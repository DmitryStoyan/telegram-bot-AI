require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

const bot = new Telegraf("6741874098:AAGCTH6SeD5m4JpaLk4ni4acVUzASuwel3w");

bot.start((ctx) =>
  ctx.reply(
    "Привет! Напиши мне что-нибудь, и я отвечу тебе. Используй /image <описание> для генерации картинки."
  )
);

bot.command("image", async (ctx) => {
  const description = ctx.message.text.split(" ").slice(1).join(" ");
  if (!description) {
    return ctx.reply("Пожалуйста, укажите описание для картинки.");
  }

  // Запрос к DALL-E API для генерации изображения
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
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const imageUrl = response.data.data[0].url;
    ctx.replyWithPhoto({ url: imageUrl });
  } catch (error) {
    console.error("Ошибка при генерации изображения:", error);
    ctx.reply("Извини, произошла ошибка при генерации изображения.");
  }
});

bot.on("text", async (ctx) => {
  try {
    const userMessage = ctx.message.text;
    const openAIResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });
    const reply = openAIResponse.choices[0].message.content;
    ctx.reply(reply);
  } catch (error) {
    console.error("Ошибка при получении ответа от OpenAI:", error);
    ctx.reply("Извини, произошла ошибка.");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
