const {
    Telegraf,
    Markup,
    Extra,
    session,
    Scenes: { BaseScene, Stage }
} = require("telegraf");

const sequelize = require('./db')
const UserModel = require('./models/user')
const config = require('config')
const { Keyboard } = require("telegram-keyboard")

const bot = new Telegraf(config.get('token'))

const ScenesGenerator = require('./Scenes')

const curScene = new ScenesGenerator()
const taskScene = curScene.TaskGen()
const workerScene = curScene.WorkerGen()
const priorityScene = curScene.PriorityGen()
const deadlineScene = curScene.DeadlineGen()
const isOkScene = curScene.IsOkGen()
const outboundScene = curScene.OutboundGen()
//import { getMainMenu } from './keyboards.js'

//const getMainMenu = require('./keyboards.js')

bot.use(Telegraf.log())





const stage = new Stage([taskScene, workerScene, priorityScene, deadlineScene, isOkScene, outboundScene])

bot.use(session())
bot.use(stage.middleware())




bot.start( async (ctx) => {

    const chatId = ctx.chat.id
    try {
    

        await UserModel.create({chatId})

        await sequelize.authenticate()
        await sequelize.sync()

    } catch (e) {
        console.log(e);
    }
   
    ctx.reply('👋')
    const keyboard = Keyboard.make([
        ['Входящие задания', 'Исходящие задания'],
        ['Поставить задание', 'Информация'],
      ])

    //ctx.scene.enter('task')

    await ctx.reply('Privet', keyboard.reply())

    //await ctx.reply('Simple inline keyboard', keyboard.inline())
})

//Реакция на кнопки

bot.hears('Входящие задания', async (ctx) => {

    const chatId = ctx.chat.id
    const user = await UserModel.findOne({chatId})
    ctx.reply(`Задание выполнено: ${user.task}`)

})


bot.hears('Исходящие задания', async (ctx) => ctx.scene.enter('outbound'))

    // const chatId = ctx.chat.id
    // const user = await UserModel.findOne({chatId})
    // ctx.reply(`Задание выполнено: ${user.task}`)

//})

bot.hears('Поставить задание', async (ctx) => ctx.scene.enter('task'))




bot.launch()


