const {
    Telegraf,
    session,
    Scenes: { Stage }
} = require("telegraf");

const sequelize = require('./db')

const UserModel = require('./models/user')
const TaskModel = require('./models/task')

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

const parseDate = require('./middleware/parseDate');


const bot = new Telegraf(config.get('token'))


const stage = new Stage([
    taskScene,
    workerScene, 
    priorityScene, 
    deadlineScene, 
    isOkScene, 
    outboundScene,
    incomingScene,
    doneScene,
    loginScene,
    helloScene,
    deptScene,
    posScene
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
        flag: 0
    }

    ctx.scene.enter('task')
})

bot.launch()


//Рассылка отданых активных заданий

cron.schedule('10 9 * * *', async () => { 
    try {
        let usersList = UserModel.findAll()
        .then(async usersList => {

            for(let i = 0; i < usersList.length; i++){

                let activeTasksList = await TaskModel.findAll({
                    where: {
                        initiator: usersList[i].chatId,
                        isDone: false
                    }
                })
               
                if (activeTasksList.length){
                    await bot.telegram.sendMessage(usersList[i].chatId,`Список отданых заданий, которые находятся на выполнении:`)
                }


                if (activeTasksList.length != 0){
                    for(let k = 0; k < activeTasksList.length; k++){


                        if (!activeTasksList[k].isFailed) {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \nЗадание: ${activeTasksList[k].text},
                                \nПриоритет: ${activeTasksList[k].priority},
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)},
                                \nИсполнитель: ${activeTasksList[k].worker},
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}

                            `)
                        } else {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️
                                \nВремя выполнения задания истекло!
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)} просрочен!
                                \nИсполнитель: ${activeTasksList[k].worker}
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️

                            `)
                        }
                    }
                }
                flag = 0
            }
        })
        console.log(usersList);

    }
    catch (e){
        console.log(e);
    }
    
},
{
    scheduled: true,
    timezone: "Europe/Kiev"
}
);

//Проверка на просрочку задания


cron.schedule('30 9 * * *', async () => { 
    try {
        let usersList = UserModel.findAll()
        .then(async usersList => {
            let flag = 1
            for(let i = 0; i < usersList.length; i++){


                let activeTasksList = await TaskModel.findAll({
                    where: {
                        chatId: usersList[i].chatId,
                        isDone: false
                    }
                })


                if(activeTasksList.length){
                    await bot.telegram.sendMessage(usersList[i].chatId,`Список полученых заданий, которые находятся на выполнении:`)
                }

                if (activeTasksList.length != 0){
                

                    for(let k = 0; k < activeTasksList.length; k++){


                        if (!activeTasksList[k].isFailed) {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)}
                                \nИнициатор: ${activeTasksList[k].initiatorName}
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}

                            `)
                        } else {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️
                                \nВремя выполнения задания истекло!
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)} просрочен!
                                \nИнициатор: ${activeTasksList[k].initiatorName}
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️

                            `)
                        }
                    }
                }
            }
        })
        console.log(usersList);

    }
    catch (e){
        console.log(e);
    }
    
},
{
    scheduled: true,
    timezone: "Europe/Kiev"
}
);



cron.schedule('0 5 * * *', async () => {
    try {
        TaskModel.findAll({
            where: {
                isDone: false
            }
        })
        .then(async (taskList) => {

            for(let l = 0; l < taskList.length; l++){
                let dateEnd = Date.parse(taskList[l].dateEnd)
                let dateNow = Date.parse(new Date)

                if(dateNow > dateEnd){
                    taskList[l].isFailed = true
                    await taskList[l].save()
                }
            }

        })

        
    } catch(e){
        console.log(e);
    }
},
{
    scheduled: true,
    timezone: "Europe/Kiev"
})


