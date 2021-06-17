const {
    Telegraf,
    session,
    Scenes: { Stage }
} = require("telegraf");

const sequelize = require('./db')

const UserModel = require('./models/user')
const TaskModel = require('./models/task')

const config = require('config')
const { Keyboard } = require("telegram-keyboard")


const ScenesGenerator = require('./Scenes')

const curScene = new ScenesGenerator()
const taskScene = curScene.TaskGen()
const workerScene = curScene.WorkerGen()
const priorityScene = curScene.PriorityGen()
const deadlineScene = curScene.DeadlineGen()
const isOkScene = curScene.IsOkGen()
const outboundScene = curScene.OutboundGen()
const incomingScene = curScene.IncomingGen()
const doneScene = curScene.DoneGen()
const loginScene = curScene.LoginGen()
const helloScene = curScene.HelloGen()
const deptScene = curScene.DepartGen()
const posScene = curScene.PositionGen()

let cron = require('node-cron');

const parseDate = require('./middleware/parseDate')
//const { where } = require("sequelize/types");


//import { getMainMenu } from './keyboards.js'

//const getMainMenu = require('./keyboards.js')



const bot = new Telegraf(config.get('token'))


bot.use(Telegraf.log())

bot.use(session())



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
                // let name = ''

                // if(ctx.chat.last_name == undefined){
                //     name = ctx.chat.first_name
                // } else name = `${ctx.chat.last_name} ${ctx.chat.first_name}`


            

                // await UserModel.create({

                //     chatId: ctx.chat.id,
                //     firstName: ctx.chat.first_name,
                //     lastName: ctx.chat.last_name,
                //     fullName: name,
                //     username: ctx.chat.username

                // })
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


