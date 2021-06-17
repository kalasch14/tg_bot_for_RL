
const {
    Scenes: { BaseScene }
} = require("telegraf");

const UserModel = require('../models/user')
const TaskModel = require('../models/task')
const { Keyboard, Key } = require("telegram-keyboard");
const { Sequelize } = require("sequelize");

const parseDate = require('../middleware/parseDate')
const isDone = require('../middleware/isDone')

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
            await ctx.reply('Выберите исполнителя:')

            const usersList = await UserModel.findAll({
                where: {
                    chatId: {
                        [Sequelize.Op.not]: ctx.message.from.id 
                    }
                }
            })

            for(let i = 0; i < usersList.length; i++){
                const userListKeyboard = Keyboard.make([
                    [Key.callback('👨🏻', usersList[i].chatId)]
                  ]).inline()
                await ctx.reply(usersList[i].fullName ,userListKeyboard)
            }

        })

        worker.on('callback_query', async (ctx) => {
            
            const uid = ctx.callbackQuery.data

                ctx.session.dataStorage.user = await UserModel.findOne({
                    where: {
                        chatId: uid
                    }
                })

                
                ctx.scene.enter('priority')
            
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
                        await ctx.reply(`
                        \nЗадание: ${ ctx.session.dataStorage.task }
                        \nИсполнитель: ${ ctx.session.dataStorage.user.fullName }
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
                    worker: ctx.session.dataStorage.user.fullName,
                    text: ctx.session.dataStorage.task,
                    initiator: ctx.from.id,
                    isDone: false,
                    chatId: ctx.session.dataStorage.user.chatId,
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


module.exports = ScenesGenerator