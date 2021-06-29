
const {
    Scenes: { BaseScene }
} = require("telegraf")

const UserModel = require('../models/user')
const TaskModel = require('../models/task')
const { Keyboard, Key } = require("telegram-keyboard")

const parseDate = require('../middleware/parseDate')
const getStringOfNames = require('../middleware/getStringOfNames')
const getChat = require('../middleware/getChatIdList')
const getName = require('../middleware/getFullnameList')

const { Op } = require('sequelize')


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
                await ctx.scene.enter('worker')
            } else {
                await ctx.reply('Задание отменено!')
                await ctx.scene.leave()
            }
        })

        task.on('message', async (ctx) => {
            await ctx.reply('Не понял, попробуй еще раз')
            await ctx.scene.reenter()
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
                await ctx.editMessageText('Выберите департамент исполнителя или тип рассылки:', deptKeyboard)
                ctx.session.dataStorage.position = 0
            } else {

                if(ctx.callbackQuery.data == 'allD'){

                    ctx.session.dataStorage.user = await UserModel.findAll({
                        where: {
                            position: 'Директор'
                        }
                    })

                    await ctx.scene.enter('priority')

                } else if(ctx.callbackQuery.data == 'allDZ'){

                    ctx.session.dataStorage.user = await UserModel.findAll({
                        where: {
                            
                                position: {
                                    [Op.or]: ['Директор', 'ЗамДир']
                                }
                            
                        }
                    })

                    await ctx.scene.enter('priority')

                } else if(ctx.callbackQuery.data == 'all'){

                    ctx.session.dataStorage.user = await UserModel.findAll()

                    await ctx.scene.enter('priority')

                } else if(ctx.callbackQuery.data == 'OK'){

                    ctx.session.dataStorage.user = await UserModel.findAll({
                        where: {
                            chatId: ctx.session.dataStorage.listOfUsers
                        }
                    })

                    if (ctx.session.dataStorage.user.length == 0) {

                        await ctx.reply('Не выбран ни один сотрудник!')

                        await ctx.deleteMessage()
                        await ctx.scene.reenter()
                        
                    } else await ctx.scene.enter('priority')

                } else {

                    if (ctx.session.dataStorage.position < 2) {
                        ctx.session.dataStorage.position++
                    }

                    if (ctx.session.dataStorage.position != 2) {
                        ctx.session.dataStorage.dept = ctx.callbackQuery.data
                    }
                    
                    

                    const uslist = async function(from, arr){

                        let usersList = await UserModel.findAll({
                            where: {
                                dept: from.dept
                            }
                        })
                            
                        for(let i = 0; i < usersList.length; i++){
                            if (ctx.session.dataStorage.listOfUsers.includes(usersList[i].chatId)) {
                                await arr.push([Key.callback(usersList[i].fullName + " ✅", usersList[i].chatId)])
                            } else {
                                await arr.push([Key.callback(usersList[i].fullName, usersList[i].chatId)])
                            }
                            if (i == usersList.length - 1 || usersList.length == 0) {
                                await arr.push([Key.callback(`Выбрать весь департамент ${from.dept}`, 'dept')])
                                await arr.push([Key.callback('OK','OK')]),
                                await arr.push([Key.callback('Назад', 'back')])
                            }
                        }
    
                        if (usersList.length == 0) {
                            await arr.push([Key.callback('Назад', 'back')])
                        }

                        return arr
                    }

                    

                    let userListKeyboard = Keyboard.make(await uslist(ctx.session.dataStorage, [])).inline()


                    if(ctx.session.dataStorage.position == 1){
                        await ctx.editMessageText(ctx.callbackQuery.data, userListKeyboard)
                    }

                    if (ctx.session.dataStorage.position == 2 && ctx.callbackQuery.data == 'dept') {


                        let user = await UserModel.findAll({
                            where: {
                                dept: ctx.session.dataStorage.dept
                            }
                        })

                        user.forEach(async item => {
                            if (!ctx.session.dataStorage.listOfUsers.includes(item.chatId)) {
                                await ctx.session.dataStorage.listOfUsers.push(item.chatId)
                            } else {
                                let i = ctx.session.dataStorage.listOfUsers.indexOf(item.chatId)
                                delete ctx.session.dataStorage.listOfUsers[i]
                            }
    
                            let userListKeyboard = Keyboard.make(await uslist(ctx.session.dataStorage, [])).inline()
    
                            await ctx.editMessageText(ctx.session.dataStorage.dept, userListKeyboard)
                        })

                        
                    }
                    if(ctx.session.dataStorage.position == 2 && ctx.callbackQuery.data != 'dept'){

                        const uid = ctx.callbackQuery.data


                        const usr = await UserModel.findOne({
                            where: {
                                chatId: uid
                            }
                        })

                        if (!ctx.session.dataStorage.listOfUsers.includes(usr.chatId)) {
                            await ctx.session.dataStorage.listOfUsers.push(usr.chatId)
                        } else {
                            let i = ctx.session.dataStorage.listOfUsers.indexOf(usr.chatId)
                            delete ctx.session.dataStorage.listOfUsers[i]
                        }

                        
                        // usr.checked = !usr.checked

                        // await usr.save()

                        let userListKeyboard = Keyboard.make(await uslist(ctx.session.dataStorage, [])).inline()

                        await ctx.editMessageText(ctx.session.dataStorage.dept, userListKeyboard)
                        
                        //await ctx.scene.enter('priority')
                    }
                }   

            }
            
        })



        worker.on('message', async (ctx) => {
            if (ctx.message.text == '/') {
                await ctx.reply('Задание отменено!')
                await ctx.scene.leave()
            } else {
                await ctx.reply('Не понял, попробуй еще раз')
                await ctx.scene.reenter()
            }
        })
        return worker
    }





    //--------------------------------------------------------------

    //Выбор уровня важности

    //--------------------------------------------------------------

    PriorityGen(){
        const priority = new BaseScene('priority')

        priority.enter(async (ctx) => {
            await ctx.reply('Определим важность задания', priorityKeyboard)
        })


        priority.on('text', async (ctx) => {
            if(ctx.message.text == '/'){
                await ctx.reply('Задание отменено!')
                await ctx.scene.leave()
            }
        })
    

        priority.on('callback_query', async (ctx) => {
            
            const priorityLevel = String(ctx.callbackQuery.data)

            if(priorityLevel){
                ctx.session.dataStorage.priority = priorityLevel
                await ctx.scene.enter('deadline')
            }
        })

        priority.on('message', async (ctx) => {
            await ctx.reply('Не понял, попробуй еще раз')
            await ctx.scene.reenter()
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

                        await ctx.reply(`
                        \nЗадание: ${ ctx.session.dataStorage.task }
                        \nИсполнитель(и): ${ getStringOfNames(ctx.session.dataStorage.user) }
                        \nПриоритет: ${ ctx.session.dataStorage.priority }
                        \nДедлайн: ${ parseDate(ctx.session.dataStorage.deadline) }
                        `)
                        await ctx.scene.enter('isOk')
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
                    text: ctx.session.dataStorage.task,
                    initiator: ctx.from.id,
                    isDone: false,
                    chatIdArr: getChat(ctx.session.dataStorage.user),
                    workersArr: getName(ctx.session.dataStorage.user),
                    initiatorName: ctx.from.first_name + ' ' + ctx.from.last_name
                    
                })

                await ctx.reply('Готово!')

                let sender = ''

                if(!ctx.from.last_name){
                    sender = ctx.from.first_name
                } else sender = `${ ctx.from.first_name } ${ ctx.from.last_name }`

                await ctx.session.dataStorage.user.forEach(async element => {
                    await ctx.telegram.sendMessage(element.dataValues.chatId, `
                    \nНовое задание от ${ sender }
                    \nЗадание: ${ ctx.session.dataStorage.task }
                    \nИсполнитель: ${ getName(ctx.session.dataStorage.user) }
                    \nПриоритет: ${ ctx.session.dataStorage.priority }
                    \nДедлайн: ${ parseDate(ctx.session.dataStorage.deadline) }
                    `) 
                });

                await ctx.scene.leave()

            } else if(ok === '❌'){

                ctx.session.dataStorage.listOfUsers = []
               
                await ctx.reply('Повторим')

                await ctx.scene.enter('task')

            }
        })
    

        isOk.on('message', async (ctx) => {
            await ctx.reply('Не понял, попробуйте еще раз')
            await ctx.scene.reenter()
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
    [Key.callback('Коммерческий','Коммерческий')],
    [Key.callback('Рассылка всем руководителям','allD')],
    [Key.callback('Рассылка всем руководителям и замам','allDZ')],
    [Key.callback('Рассылка ВСЕМ','all')],
]).inline()


module.exports = ScenesGenerator