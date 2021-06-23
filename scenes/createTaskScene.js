
const {
    Scenes: { BaseScene }
} = require("telegraf");

const UserModel = require('../models/user')
const TaskModel = require('../models/task')
const { Keyboard, Key } = require("telegram-keyboard");
const { Sequelize, INTEGER } = require("sequelize");

const parseDate = require('../middleware/parseDate')
const getStringOfNames = require('../middleware/getStringOfNames')
const getChat = require('../middleware/getChatIdList')
const getName = require('../middleware/getFullnameList')


class ScenesGenerator {
    
    //---------------------------------------------------------------

    //Текст задания

    //---------------------------------------------------------------

    TaskGen() {
        const task = new BaseScene('task')
        task.enter(async (ctx) => {
            await ctx.reply(`
            \nУкажи задание к исполнению
            \nДля отмены создания задания нажмите "/"
            `)
        })
        task.on('text', async (ctx) => {
            const currentTask = String(ctx.message.text)


            if(ctx.message.text !== '/'){
                ctx.session.dataStorage.task = currentTask
                //this.task = currentTask
                ctx.scene.enter('worker')
            } else {
                ctx.reply('Задание отменено!')
                ctx.scene.leave()
            }
        })

        task.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
        })

        return task
    }


    //---------------------------------------------------------------

    //Выбор ответственного лица

    //---------------------------------------------------------------

    WorkerGen(){
        
        const worker = new BaseScene('worker')

        
        worker.enter(async (ctx) => {
            await ctx.reply('Выберите департамент исполнителя или тип рассылки:', deptKeyboard)
            ctx.session.dataStorage.position = 0
            ctx.session.dataStorage.user = []
        })

        worker.on('callback_query', async (ctx) => {

            if (ctx.callbackQuery.data == 'back') {
                ctx.editMessageText('Выберите департамент исполнителя или тип рассылки:', deptKeyboard)
                ctx.session.dataStorage.position = 0
            } else {

                ctx.session.dataStorage.position++

                if (ctx.session.dataStorage.position != 2) {
                    ctx.session.dataStorage.dept = ctx.callbackQuery.data
                }
                
                
                let usersList = await UserModel.findAll({
                    where: {
                        dept: ctx.session.dataStorage.dept
                    }
                })
                    
                let keyArr = []
                for(let i = 0; i < usersList.length; i++){
                    keyArr.push([Key.callback(usersList[i].fullName, usersList[i].chatId)])
                    if (i == usersList.length - 1 || usersList.length == 0) {
                        keyArr.push([Key.callback(`Выбрать весь ${ctx.session.dataStorage.dept} департамент`, 'dept')])
                        keyArr.push([Key.callback('Назад', 'back')])
                    }
                }

                if (usersList.length == 0) {
                    keyArr.push([Key.callback('Назад', 'back')])
                }

                const userListKeyboard = Keyboard.make(keyArr).inline()

                if(ctx.session.dataStorage.position == 1){
                    await ctx.editMessageText(ctx.callbackQuery.data, userListKeyboard)
                }

                if (ctx.session.dataStorage.position == 2 && ctx.callbackQuery.data == 'dept') {

                    ctx.session.dataStorage.user = await UserModel.findAll({
                        where: {
                            dept: ctx.session.dataStorage.dept
                        }
                    })
                    await ctx.scene.enter('priority')
                    
                }
                if(ctx.session.dataStorage.position == 2 && ctx.callbackQuery.data != 'dept'){

                    const uid = ctx.callbackQuery.data

                    await ctx.session.dataStorage.user.push( await UserModel.findOne({
                        where: {
                            chatId: uid
                        }
                    }))
                    
        
                    await ctx.scene.enter('priority')
                }

            }
            
        })



        worker.on('message', (ctx) => {
            if (ctx.message.text == '/') {
                ctx.reply('Задание отменено!')
                ctx.scene.leave()
            } else {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
            }
        })
        return worker
    }





    //---------------------------------------------------------------

    //Выбор уровня важности

    //--------------------------------------------------------------

    PriorityGen(){
        const priority = new BaseScene('priority')

        priority.enter(async (ctx) => {
            await ctx.reply('Определим важность задания', priorityKeyboard)
        })


        priority.on('text', async (ctx) => {
            if(ctx.message.text == '/'){
                ctx.reply('Задание отменено!')
                ctx.scene.leave()
            }
        })
    

        priority.on('callback_query', async (ctx) => {
            
            const priorityLevel = String(ctx.callbackQuery.data)

            if(priorityLevel){
                ctx.session.dataStorage.priority = priorityLevel
                ctx.scene.enter('deadline')
            }
        })

        priority.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
        })
        return priority

    }

    //---------------------------------------------------------------

    //Дедлайн задания

    //--------------------------------------------------------------

    DeadlineGen(){
        
        const deadline = new BaseScene('deadline')



        deadline.enter(async (ctx) => {
            await ctx.reply('Введите дедлайн задания в формате гггг.мм.дд')
            ctx.session.dataStorage.flag = 0
        })

        deadline.on('text', async (ctx) => {
            ctx.session.dataStorage.flag = 0
            let enteredDate = String(ctx.message.text)

            if(enteredDate == '/'){
                await ctx.reply('Задание отменено!')
                ctx.session.dataStorage.flag = 1
                await ctx.scene.leave()
            }

            enteredDate = enteredDate.split('.')

            enteredDate = new Date(Date.UTC(enteredDate[0], enteredDate[1]-1, enteredDate[2]))

            let currDate = Date.parse(new Date)


            if (enteredDate == "Invalid Date" && ctx.session.dataStorage.flag == 0) {

                await ctx.reply('Введен неверный формат!').then(ctx.session.dataStorage.flag = 1).then(ctx.scene.reenter())
                
            } 
            
            if (ctx.session.dataStorage.flag == 0 && (Date.parse(enteredDate) <  currDate) && enteredDate != "Invalid Date"){
                await ctx.reply('Введен неверный формат!').then(ctx.session.dataStorage.flag = 1).then(ctx.scene.reenter())
                
            } else if(ctx.session.dataStorage.flag == 0 && enteredDate != "Invalid Date"){
                        ctx.session.dataStorage.deadline = enteredDate

                        // let workersList = ''
                        // ctx.session.dataStorage.user.forEach(element => {
                        //     workersList += `\n ${element.dataValues.fullName}`
                        // });

                        await ctx.reply(`
                        \nЗадание: ${ ctx.session.dataStorage.task }
                        \nИсполнитель(и): ${ getStringOfNames(ctx.session.dataStorage.user) }
                        \nПриоритет: ${ ctx.session.dataStorage.priority }
                        \nДедлайн: ${ parseDate(ctx.session.dataStorage.deadline) }
                        `)
                        ctx.scene.enter('isOk')
                    } else if (ctx.session.dataStorage.flag == 0 && enteredDate != "Invalid Date"){
                        await ctx.reply('Введен неверный формат!').then(ctx.session.dataStorage.flag = 1).then(ctx.scene.reenter())
                    }

        })
            

        return deadline

    }


    //---------------------------------------------------------------

    //проверяем задание на правильность

    //--------------------------------------------------------------

    IsOkGen(){
        const isOk = new BaseScene('isOk')

        isOk.enter(async (ctx) => {
            await ctx.reply('Все верно?', isOkKeyboard)
        })

    
        isOk.on('callback_query', async (ctx) => {
            
            const ok = String(ctx.callbackQuery.data)

            if(ok === '✅'){

                await TaskModel.create({

                    priority: ctx.session.dataStorage.priority,
                    dateEnd: ctx.session.dataStorage.deadline,
                    //worker: ctx.session.dataStorage.user,
                    text: ctx.session.dataStorage.task,
                    initiator: ctx.from.id,
                    isDone: false,
                    //chatId: ctx.session.dataStorage.user,
                    chatIdArr: getChat(ctx.session.dataStorage.user),
                    workersArr: getName(ctx.session.dataStorage.user),
                    initiatorName: ctx.from.first_name + ' ' + ctx.from.last_name
                    
                })

                ctx.reply('Готово!')

                let sender = ''

                if(!ctx.from.last_name){
                    sender = ctx.from.first_name
                } else sender = `${ctx.from.first_name} ${ctx.from.last_name}`

                ctx.telegram.sendMessage(ctx.session.dataStorage.user.chatId, `
                \nНовое задание от ${sender}
                \nЗадание: ${ ctx.session.dataStorage.task }
                \nИсполнитель: ${ ctx.session.dataStorage.user.fullName }
                \nПриоритет: ${ ctx.session.dataStorage.priority }
                \nДедлайн: ${ parseDate(ctx.session.dataStorage.deadline) }
                `)

                ctx.scene.leave()

            } else if(ok === '❌'){
               
                await ctx.reply('Повторим')

                ctx.scene.enter('task')

            }
        })
    

        isOk.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
        })
        return isOk
    }

}


//keyboards

    
const priorityKeyboard = Keyboard.make([
    [Key.callback('Высоко','Высоко 🔴')],
    [Key.callback('Средне','Средне 🟡')],
    [Key.callback('Низко','Низко 🟢')],
  ]).inline()


const isOkKeyboard = Keyboard.make([
    [Key.callback('✅','✅')],
    [Key.callback('❌','❌')]
  ]).inline()

const deptKeyboard = Keyboard.make([
    [Key.callback('Дирекция','Дирекция')],
    [Key.callback('Финансовый','Финансовый')],
    [Key.callback('Технический','Технический')],
    [Key.callback('Бухгалтерия','Бухгалтерия')],
    [Key.callback('Коммерческий','Коммерческий')]
]).inline()


module.exports = ScenesGenerator