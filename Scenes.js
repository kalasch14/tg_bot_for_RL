
const {
    Telegraf,
    Scenes: { BaseScene, Stage }
} = require("telegraf");

const UserModel = require('./models/user')
const TaskModel = require('./models/task')

const { Keyboard, Key } = require("telegram-keyboard")

let TaskArr = []


class ScenesGenerator {

//Описание задания
    constructor(task, worker, priority, deadline){
        this.task = task
        this.worker = worker
        this.priority = priority
        this.deadline = deadline
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

            if(currentWorker){
                this.worker = currentWorker
                ctx.scene.enter('priority')
            }
        })

        worker.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
        })
        return worker
    }

//Выбор уровня важности

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


    //Дедлайн задания

    DeadlineGen(){
        const deadline = new BaseScene('deadline')

        deadline.enter(async (ctx) => {
            await ctx.reply('Дедлайн задания')
        })

        deadline.on('text', async (ctx) => {
            const dl = String(ctx.message.text)

            if(dl){
                this.deadline = dl
                await ctx.reply(`
                \nЗадание: ${ this.task }
                \nИсполнитель: ${ this.worker }
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


    //проверяем задание на правильность

    IsOkGen(){
        const isOk = new BaseScene('isOk')

        isOk.enter(async (ctx) => {
            await ctx.reply('Все верно?', isOkKeyboard)
        })

    

        isOk.on('callback_query', async (ctx) => {
            
            const ok = String(ctx.callbackQuery.data)

            if(ok === '✅'){

                await TaskModel.create({

                    priority: this.priority,
                    dateEnd: this.deadline,
                    worker: this.worker,
                    text: this.task,
                    initiator: ctx.from.id,
                    isDone: false
                })
                ctx.reply('Готово!')

                ctx.scene.leave()

            } else if(ok === '❌'){
                ctx.reply('Повторим')
                ctx.scene.enter('task')
            }
        })

        isOk.on('message', (ctx) => {
            ctx.reply('Не понял, попробуй еще раз')
            ctx.scene.reenter()
        })
        return isOk
    }


    OutboundGen(){
        const outbound = new BaseScene('outbound')
        
        outbound.enter(async (ctx) => {
            
            
            const task = await TaskModel.findAll({
                where: {
                    initiator: ctx.from.id
                }
            })

            console.log(task);

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
            
                        
                        console.log('\nsdssdsd\nsdssdsd\nsdssdsd\nsdssdsd\nsdssdsd');
                        console.log(ctx);
                        console.log('\nsdssdsd\nsdssdsd\nsdssdsd\nsdssdsd\nsdssdsd');
            
                        if(ctx.callbackQuery.data){
                            try {
    
                                TaskModel.destroy({
                                    where: {
                                        id: ctx.callbackQuery.data
                                    }
                                })
                                await ctx.reply('Задание Удалено!')
                                ctx.scene.leave()
                        
                            } catch (e) {
                                console.log(e);
                            }
            
                            //await ctx.scene.leave()
                        } else await ctx.reply('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa')
                        ctx.scene.leave()
                    })


    
        return outbound

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