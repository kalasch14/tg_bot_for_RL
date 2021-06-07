
const {
    Telegraf,
    Scenes: { BaseScene, Stage }
} = require("telegraf");

const UserModel = require('./models/user')
const TaskModel = require('./models/task')

const { Keyboard, Key } = require("telegram-keyboard")



class ScenesGenerator {

//Описание задания
    constructor(task, worker, priority, deadline, user, flag){
        this.task = task
        this.worker = worker
        this.priority = priority
        this.deadline = deadline
        this.user = user
        this.flag = flag
    }



    TaskGen() {
        const task = new BaseScene('task')
        task.enter(async (ctx) => {
            await ctx.reply('Укажи задание к исполнению')
        })
        task.on('text', async (ctx) => {
            const currentTask = String(ctx.message.text)

            if(currentTask){
                this.task = currentTask
                ctx.scene.enter('worker')
            }
        })
        task.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
        })

        return task
    }


//Выбор ответственного лица

    WorkerGen(){
        
        const worker = new BaseScene('worker')

        worker.enter(async (ctx) => {
            await ctx.reply('Укажи ответственного сотрудника')
        })

        worker.on('text', async (ctx) => {

            const currentWorker = String(ctx.message.text)

             this.user = await UserModel.findOne({
                where: {
                    username: currentWorker
                }
            })

            if(this.user == null){
                this.user = await UserModel.findOne({
                    where: {
                        fullName: currentWorker
                    }
                })
            } 
            if(this.user == null) {
                await ctx.reply('Пользователь с таким именем или никнеймом не найден!')
                ctx.scene.reenter()
            } else this.flag = 1

            if(this.flag == 1){
                this.flag = 0
                //this.worker = currentWorker
                ctx.scene.enter('priority')
            }
        })

        worker.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
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

    

        priority.on('callback_query', async (ctx) => {
            
            const priorityLevel = String(ctx.callbackQuery.data)

            if(priorityLevel){
                this.priority = priorityLevel
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
            await ctx.reply('Дедлайн задания')
        })

        deadline.on('text', async (ctx) => {
            const dl = String(ctx.message.text)

            // let user = await UserModel.findOne({
            //     where: {
            //         username: this.worker
            //     }
            // })

            // if(user == null){
            //     user = await UserModel.findOne({
            //         where: {
            //             fullName: this.worker
            //         }
            //     })
            // } else {
            //     ctx.reply('Пользователь с таким именем или никнеймом не найден!')
            //     ctx.scene.reenter()
            // }

            

            if(dl){
                this.deadline = dl
                await ctx.reply(`
                \nЗадание: ${ this.task }
                \nИсполнитель: ${ this.user.fullName }
                \nПриоритет: ${ this.priority }
                \nДедлайн: ${ this.deadline }
                `)
                //await TaskModel.create({ priority: this.priority, dateEnd: this.deadline, worker: this.worker, text: this.task, initiator: ctx.from.id, isDone: false})
                //ctx.scene.leave()
                ctx.scene.enter('isOk')
            }
        })

        deadline.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
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
                // let user = await UserModel.findOne({
                //     where: {
                //         username: this.worker
                //     }
                // })

                // if(user == null){
                //     user = await UserModel.findOne({
                //         where: {
                //             fullName: this.worker
                //         }
                //     })
                // }

                await TaskModel.create({

                    priority: this.priority,
                    dateEnd: this.deadline,
                    worker: this.user.fullName,
                    text: this.task,
                    initiator: ctx.from.id,
                    isDone: false,
                    chatId: this.user.chatId
                    
                })
                // .catch(function(err) {
                //     // print the error details
                
                // });

                ctx.reply('Готово!')

                let sender = ''
                if(!ctx.from.last_name){
                    sender = ctx.from.first_name
                } else sender = `${ctx.from.first_name} ${ctx.from.last_name}`

                ctx.telegram.sendMessage(this.user.chatId, `
                \nНовое задание от ${sender}
                \nЗадание: ${ this.task }
                \nИсполнитель: ${ this.user.fullName }
                \nПриоритет: ${ this.priority }
                \nДедлайн: ${ this.deadline }
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
                        \nДедлайн: ${task[i].dataValues.dateEnd},
                        \nВыполнено: ${task[i].dataValues.isDone},
                        \nВремя Создания: ${task[i].dataValues.createdAt}
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
                                //ctx.scene.leave()
                        
                            } catch (e) {
                                console.log(e);
                            }
            
                            //await ctx.scene.leave()
                        } else await ctx.reply('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa')
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

                const user = await UserModel.findAll({
                    where: {
                        chatId: ctx.from.id
                    }
                })


                await ctx.reply(`
                    \nЗадание: ${incomingTask[i].dataValues.text},
                    \nИнициатор: ${incomingTask[i].dataValues.worker},
                    \nПриоритет: ${incomingTask[i].dataValues.priority},
                    \nДедлайн: ${incomingTask[i].dataValues.dateEnd},
                    \nВыполнено: ${incomingTask[i].dataValues.isDone},
                    \nВремя Создания: ${incomingTask[i].dataValues.createdAt}
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
                \nДедлайн: ${ incomingTask.dateEnd }
                `)


                // ctx.scene.enter('outbound')
                //ctx.scene.leave()
        
            } catch (e) {
                console.log(e);
            }

            //await ctx.scene.leave()
        } else await ctx.reply('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa')
        ctx.scene.leave()
    })

    // incoming.on('callback_query', async (ctx) => {
        
                    
    //                 if(ctx.callbackQuery.data){
    //                     try {

    //                         TaskModel.destroy({
    //                             where: {
    //                                 id: ctx.callbackQuery.data
    //                             }
    //                         })
    //                         await ctx.reply('Задание Удалено!')
    //                         ctx.scene.enter('outbound')
    //                         //ctx.scene.leave()
                    
    //                     } catch (e) {
    //                         console.log(e);
    //                     }
        
    //                     //await ctx.scene.leave()
    //                 } else await ctx.reply('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa')
    //                 ctx.scene.leave()
    //             })



    return incoming

}

}
    
const priorityKeyboard = Keyboard.make([
    [Key.callback('Высоко','Высоко')],
    [Key.callback('Средне','Средне')],
    [Key.callback('Низко','Низко')],
  ]).inline()


const isOkKeyboard = Keyboard.make([
    [Key.callback('✅','✅')],
    [Key.callback('❌','❌')]
  ]).inline()

// const deleteKeyboard = Keyboard.make([
//     [Key.callback('🗑','🗑')],
//   ]).inline()


module.exports = ScenesGenerator