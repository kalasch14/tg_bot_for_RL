
const {
    Scenes: { BaseScene }
} = require("telegraf");

const UserModel = require('./models/user')
const TaskModel = require('./models/task')
const { Keyboard, Key } = require("telegram-keyboard");
const { Sequelize } = require("sequelize");

const parseDate = require('./middleware/parseDate')
const isDone = require('./middleware/isDone')

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



        //старый вариант-----------------------------------------------------------------------------

        // worker.enter(async (ctx) => {
        //     await ctx.reply('Укажите ответственного сотрудника')
        // })

        // worker.on('text', async (ctx) => {

        //     const currentWorker = String(ctx.message.text)

            

            // ctx.session.dataStorage.user = await UserModel.findOne({
            //     where: {
            //         username: currentWorker
            //     }
            // })

            // if(ctx.session.dataStorage.user == null){
            //     ctx.session.dataStorage.user = await UserModel.findOne({
            //         where: {
            //             fullName: currentWorker
            //         }
            //     })
            // }

        //     if(ctx.message.text == '/'){
        //         ctx.reply('Задание отменено!')
        //         ctx.scene.leave()
        //     } else if(ctx.session.dataStorage.user == null) {
        //         await ctx.reply('Пользователь с таким именем или никнеймом не найден!')
        //         ctx.scene.reenter()
        //     } else ctx.session.dataStorage.flag = 1

        //     if(ctx.session.dataStorage.flag == 1){
        //         ctx.session.dataStorage.flag = 0
        //         //this.worker = currentWorker
        //         ctx.scene.enter('priority')
        //     }
        // })

        // worker.on('message', (ctx) => {
        //     ctx.reply('Не понял, попробуй еще раз')
        //     ctx.scene.reenter()
        // })

        //---------------------------------------------------------------------------------------------

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

    //---------------------------------------------------------------

    //Исходящие задания

    //--------------------------------------------------------------


    OutboundGen(){

        const outbound = new BaseScene('outbound')
        
        outbound.enter(async (ctx) => {
            
            const task = await TaskModel.findAll({
                where: {
                    initiator: ctx.from.id
                }
            })

            if(task.length == 0){
                await ctx.reply('Нету исходящих заданий')
            } else {

                await ctx.reply('Задания, поставленые мною:')
                
                for(let i = 0; i < task.length; i++){
                

                    const deleteKeyboard = Keyboard.make([
                        [Key.callback('🗑', task[i].dataValues.id)],
                      ]).inline()


                    await ctx.reply(`
                        \nЗадание: ${task[i].dataValues.text},
                        \nИсполнитель: ${task[i].dataValues.worker},
                        \nПриоритет: ${task[i].dataValues.priority},
                        \nДедлайн: ${parseDate(task[i].dataValues.dateEnd)},
                        \nВыполнено: ${isDone(task[i].dataValues.isDone)},
                        \nДата Создания: ${parseDate(task[i].dataValues.createdAt)}
                    `,
                    deleteKeyboard)
                    
                }
            }
        })

        outbound.on('callback_query', async (ctx) => {

            
            if(ctx.callbackQuery.data){
                try {

                    TaskModel.destroy({
                        where: {
                            id: ctx.callbackQuery.data
                        }
                    })
                    await ctx.reply('Задание Удалено!')
                    ctx.scene.enter('outbound')
            
                } catch (e) {
                    console.log(e);
                }

            } else await ctx.reply('err')
            ctx.scene.leave()
        })
    
        return outbound

    }

    //---------------------------------------------------------------

    //Входящие задания

    //--------------------------------------------------------------

    IncomingGen(){
        const incoming = new BaseScene('incoming')
        
        incoming.enter(async (ctx) => {
        
            const incomingTask = await TaskModel.findAll({
                where: {
                    chatId: ctx.from.id,
                    isDone: false
                }
            })


            if(incomingTask.length == 0){
                //await ctx.reply(ctx.from.id)
                await ctx.reply('Нету активных входящих заданий')
            } else {

                await ctx.reply('Входящие задания: ')

                for(let i = 0; i < incomingTask.length; i++){

            
                    const doneKeyboard = Keyboard.make([
                        [Key.callback('Отметить Выполненым', incomingTask[i].dataValues.id)],
                    ]).inline()

                    const user = await UserModel.findOne({
                        where: {
                            chatId: incomingTask[i].dataValues.initiator,
                        }
                    })

                    

                    await ctx.reply(`
                        \nЗадание: ${incomingTask[i].dataValues.text},
                        \nИнициатор: ${user.fullName},
                        \nПриоритет: ${incomingTask[i].dataValues.priority},
                        \nДедлайн: ${parseDate(incomingTask[i].dataValues.dateEnd)},
                        \nВыполнено: ${isDone(incomingTask[i].dataValues.isDone)},
                        \nДата Создания: ${parseDate(incomingTask[i].dataValues.createdAt)}
                    `,
                    doneKeyboard)
                    
            
                }
                
            }
        })

        incoming.on('callback_query', async (ctx) => {
                
                            
            if(ctx.callbackQuery.data){
                try {

                    const incomingTask = await TaskModel.findOne({
                        where: {
                            id: ctx.callbackQuery.data
                        }
                    })

                    incomingTask.isDone = true

                    await incomingTask.save();
                    await ctx.reply('Инициатору отправлено сообщение о выполнении!')

                    let sender = ''
                    if(!ctx.from.last_name){
                        sender = ctx.from.first_name
                    } else sender = `${ctx.from.first_name} ${ctx.from.last_name}`

                    ctx.telegram.sendMessage(incomingTask.initiator, `
                    \n${incomingTask.worker} выполнил задание!
                    \nЗадание: ${ incomingTask.text }
                    \nПриоритет: ${ incomingTask.priority }
                    \nДедлайн: ${ parseDate(incomingTask.dateEnd) }
                    \nДата создания: ${ parseDate(incomingTask.createdAt) }
                    `)

            
                } catch (e) {
                    console.log(e);
                }

                //await ctx.scene.leave()
            } else await ctx.reply('err')
            ctx.scene.leave()
        })

        return incoming

    }


    //---------------------------------------------------------------

    //Выполненные задания задания

    //--------------------------------------------------------------

    DoneGen(){

        const done = new BaseScene('done')

        done.enter(async (ctx) => {

            const doneTask = await TaskModel.findAll({
                where: {
                    chatId: ctx.from.id,
                    isDone: true
                }
            })


            if(doneTask.length == 0){
                //await ctx.reply(ctx.from.id)
                await ctx.reply('Нету активных входящих заданий')
            } else {

                await ctx.reply('Список выполненых заданий')

                for(let i = 0; i < doneTask.length; i++){


                    const user = await UserModel.findOne({
                        where: {
                            chatId: doneTask[i].dataValues.initiator,
                        }
                    })


                    await ctx.reply(`
                        \nЗадание: ${doneTask[i].dataValues.text},
                        \nИнициатор: ${user.fullName},
                        \nПриоритет: ${doneTask[i].dataValues.priority},
                        \nДедлайн: ${parseDate(doneTask[i].dataValues.dateEnd)},
                        \nВыполнено: ${isDone(doneTask[i].dataValues.isDone)},
                        \nДата Создания: ${parseDate(doneTask[i].dataValues.createdAt)}
                    `)
                    
            
                }

            }

        })

        return done

    }
//-----------------------------------------------------------------------------------------

//ввод пароля

//-----------------------------------------------------------------------------------------


    LoginGen(){

        const login = new BaseScene('login')

        login.enter(async (ctx) => {
            await ctx.reply('Введите пароль!')
        })

        login.on('text', async (ctx) => {
            if(ctx.message.text == 'parlament'){
    
                await ctx.scene.enter('dept')

            } else {
                await ctx.reply('Пароль не верный!')
                await ctx.scene.reenter()
            }
        })

        return login

    }


//-----------------------------------------------------------------------------------------

//приветствие, если пользователь авторизирован

//-----------------------------------------------------------------------------------------

    HelloGen(){
        const hello = new BaseScene('hello')

        hello.enter(async (ctx)=> {
            await ctx.reply('👋')
            const keyboard = await Keyboard.make([
                ['Входящие задания', 'Исходящие задания'],
                ['Поставить задание', 'Выполненные задания'],
            ])

            //ctx.scene.enter('task')

            await ctx.reply(`
            \nЧто умеет этот бот:
            \nПоставить задание - описываете задание, выбираете ответственного, ставите приоритет, указываете дедлайн. Ответственному человеку приходит уведомление о создании задания.
            \nВходящие задания - здадания, где Вы указаны ответственным лицом.
            \nИсходящие задания - задания, которые Вы создали.
            \nВыполненные задания - задания, выполненные вами
            
            
            `, keyboard.reply())


            await ctx.scene.leave()


        })

        return hello
    }


    DepartGen(){
        const dept = new BaseScene('dept')
        
        dept.enter(async (ctx) => {
            await ctx.reply('Есть, теперь выберите департамент!(можно выбрать только один)', deptKeyboard)
        })

        dept.on('callback_query', async (ctx) => {

            ctx.session.dataStorage.userDept = ctx.callbackQuery.data

            await ctx.scene.enter('pos')

        })
        return dept
    }


    PositionGen(){
        const pos = new BaseScene('pos')

        pos.enter(async (ctx) => {
            if (ctx.callbackQuery.data == 'Дирекция') {

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)
                
            } else if (ctx.session.dataStorage.userDept == 'Финансовый'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            } else if (ctx.callbackQuery.data == 'Технический'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            } else if (ctx.callbackQuery.data == 'Бухгалтерия'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            } else if (ctx.callbackQuery.data == 'Коммерческий'){

                ctx.reply(`Выберите должность, ваш департамент ${ctx.session.dataStorage.userDept}`, positionKeyboard)

            }
        })

        pos.on('callback_query', async ctx => {

            ctx.session.dataStorage.userPos = ctx.callbackQuery.data

            let name = ''

            if(ctx.chat.last_name == undefined){
                name = ctx.chat.first_name
            } else name = `${ctx.chat.last_name} ${ctx.chat.first_name}`
        

            await UserModel.create({

                chatId: ctx.chat.id,
                firstName: ctx.chat.first_name,
                lastName: ctx.chat.last_name,
                fullName: name,
                username: ctx.chat.username,
                dept: ctx.session.dataStorage.userDept,
                position: ctx.session.dataStorage.userPos

            })

            await ctx.scene.enter('hello')

        })

        return pos
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

const positionKeyboard = Keyboard.make([
    [Key.callback('Директор','Директор')],
    [Key.callback('ЗамДир','ЗамДир')],
    [Key.callback('Работник','Работник')],
]).inline()

// const deleteKeyboard = Keyboard.make([
//     [Key.callback('🗑','🗑')],
//   ]).inline()


module.exports = ScenesGenerator