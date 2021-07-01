const {
    Scenes: { BaseScene }
} = require("telegraf");

const TaskModel = require('../models/task')
const { Keyboard, Key } = require("telegram-keyboard");

const parseDate = require('../middleware/parseDate')
const isDone = require('../middleware/isDone')

class OutboundScenesGenerator {

    OutboundGen(){

        const outbound = new BaseScene('outbound')
        
        outbound.enter(async (ctx) => {
            
            const task = await TaskModel.findAll({
                where: {
                    initiator: ctx.from.id,
                    isDone: false
                }
            })

            if(task.length == 0){
                
                await ctx.reply('Нету исходящих заданий')

            } else {

                await ctx.reply('Задания, поставленые мною:')
                
                for(let i = 0; i < task.length; i++){
                

                    const deleteKeyboard = Keyboard.make([
                        [Key.callback('Снять задание', task[i].dataValues.id)],
                      ]).inline()



                    await ctx.replyWithMarkdown(`
                        \n*Задание:* ${ task[i].dataValues.text },
                        \n*Исполнитель(и):* ${ task[i].dataValues.workersArr.join(', ') }
                        \n*Приоритет:* ${ task[i].dataValues.priority },
                        \n*Дедлайн:* ${ parseDate(task[i].dataValues.dateEnd) },
                        \n*Выполнено:* ${ isDone(task[i].dataValues.isDone) },
                        \n*Дата Создания:* ${ parseDate(task[i].dataValues.createdAt) }
                    `,
                    deleteKeyboard)
                    
                }
            }
        })

        outbound.on('callback_query', async (ctx) => {

            
            if(ctx.callbackQuery.data){
                try {

                    // TaskModel.destroy({
                    //     where: {
                    //         id: ctx.callbackQuery.data
                    //     }
                    // })

                    await ctx.editMessageText('Исполнителям отправлено сообщение о удалении задания!')

                    const task = await TaskModel.findOne({
                        where: {
                            id: ctx.callbackQuery.data
                        }
                    })

                    await task.chatIdArr.forEach(async element => {

                        await ctx.telegram.sendMessage(element,`
                        \n<i><u>${task.initiatorName}</u> удалил задание!</i>
                        \n<b>Задание:</b> ${ task.text }
                        \n<b>Исполнители:</b> ${ task.workersArr.join(', ')  }
                        \n<b>Приоритет:</b> ${ task.priority }
                        \n<b>Дедлайн:</b> ${ parseDate(task.dateEnd) }
                        \n<b>Дата создания:</b> ${ parseDate(task.createdAt) }
                        `, {parse_mode: 'html'})
                        
                    })

                    await task.destroy()
            
                } catch (e) {
                    console.log(e);
                }
            }
        })
    
        return outbound

    }

}


module.exports = OutboundScenesGenerator