const {
    Telegraf,
    session,
    Scenes: { Stage }
} = require("telegraf");

const sequelize = require('./db')

const UserModel = require('./models/user')


const config = require('config')



const TaskScenesGenerator = require('./scenes/createTaskScene')
const LoginScenesGenerator = require('./scenes/loginScenes')
const OutboundScenesGenerator = require('./scenes/outboundScene')
const IncomingScenesGenerator = require('./scenes/incomingScene')
const DoneScenesGenerator = require('./scenes/doneScene')

const createTaskScene = new TaskScenesGenerator()
const logScene = new LoginScenesGenerator()
const outScene = new OutboundScenesGenerator()
const inScene = new IncomingScenesGenerator()
const doneTaskScene = new DoneScenesGenerator()

const taskScene = createTaskScene.TaskGen()
const workerScene = createTaskScene.WorkerGen()
const priorityScene = createTaskScene.PriorityGen()
const deadlineScene = createTaskScene.DeadlineGen()
const isOkScene = createTaskScene.IsOkGen()

const loginScene = logScene.LoginGen()
const helloScene = logScene.HelloGen()
const deptScene = logScene.DepartGen()
const posScene = logScene.PositionGen()

const doneScene = doneTaskScene.DoneGen()

const outboundScene = outScene.OutboundGen()

const incomingScene = inScene.IncomingGen()

let cron = require('node-cron');


const bot = new Telegraf(config.get('token'))


const stage = new Stage([
    taskScene, 
    priorityScene, 
    deadlineScene, 
    isOkScene, 
    outboundScene,
    incomingScene,
    doneScene,
    loginScene,
    helloScene,
    deptScene,
    posScene,
    workerScene
])

bot.use(Telegraf.log())
bot.use(session())
bot.use(stage.middleware())

bot.start( async (ctx) => {

    try {
        await sequelize.authenticate()
        await sequelize.sync()


        let isUserExist = await UserModel.findOne({
            where:{
                chatId: ctx.chat.id
            }
        })
    
        if (isUserExist) {
           
            ctx.scene.enter('hello')

        } else {
            ctx.session.dataStorage = {
                userDept: null,
                userPos: null
            }

            await ctx.scene.enter('login')
        }
    } catch (e) {
        console.log(e);
    }


    
})

//Реакция на кнопки


bot.hears('Входящие задания', async (ctx) => {ctx.scene.enter('incoming')})


bot.hears('Исходящие задания', async (ctx) => ctx.scene.enter('outbound'))


bot.hears('Выполненные задания', async (ctx) => ctx.scene.enter('done'))


bot.hears('Поставить задание', async (ctx) => {

    ctx.session.dataStorage = {
        priority: null,
        task: null,
        deadline: null,
        worker: null,
        flag: 0,
        flag2: 0,
        user: []
    }

    ctx.scene.enter('task')
})

bot.launch()


//Рассылка входящих активных заданий
cron.schedule('11 12 * * *', function(){
    require('./cron/incomingTasksMailing')(bot)
}, 
{
    scheduled: true,
    timezone: "Europe/Kiev"
})

//Рассылка исходящих заданий
cron.schedule('23 10 * * *', function(){
    require('./cron/outcomingTaskMailing')(bot)
},
{
    scheduled: true,
    timezone: "Europe/Kiev"
})

//Проверка на просрочку задания
cron.schedule('0 5 * * *', function(){
    require('./cron/failedTaskChecking')(bot)
},
{
    scheduled: true,
    timezone: "Europe/Kiev"
})


module.exports = bot