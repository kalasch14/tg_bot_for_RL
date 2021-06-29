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



                    await ctx.reply(`
                        \nЗадание: ${ task[i].dataValues.text },
                        \nИсполнитель(и): ${ task[i].dataValues.workersArr.join(', ') }
                        \nПриоритет: ${ task[i].dataValues.priority },
                        \nДедлайн: ${ parseDate(task[i].dataValues.dateEnd) },
                        \nВыполнено: ${ isDone(task[i].dataValues.isDone) },
                        \nДата Создания: ${ parseDate(task[i].dataValues.createdAt) }
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

                        await ctx.telegram.sendMessage(element, `
                        \n${task.initiatorName} удалил задание!
                        \nЗадание: ${ task.text }
                        \nИсполнители: ${ task.workersArr.join(', ')  }
                        \nПриоритет: ${ task.priority }
                        \nДедлайн: ${ parseDate(task.dateEnd) }
                        \nДата создания: ${ parseDate(task.createdAt) }
                        `)
                        
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