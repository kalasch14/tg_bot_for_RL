const {
    Scenes: { BaseScene }
} = require("telegraf");

const TaskModel = require('../models/task')
const { Keyboard, Key } = require("telegram-keyboard");

const parseDate = require('../middleware/parseDate')
const isDone = require('../middleware/isDone')
const userList = require('../middleware/getListofWorkersForMailing')

class OutboundScenesGenerator {

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
                        \nИсполнитель(и): ${ userList(task[i].dataValues.workersArr) }
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

                    await ctx.editMessageText('Задание Удалено!')
                    //ctx.scene.enter('outbound')
            
                } catch (e) {
                    console.log(e);
                }

            } else await ctx.reply('err')
            //ctx.scene.leave()
        })
    
        return outbound

    }

}


module.exports = OutboundScenesGenerator