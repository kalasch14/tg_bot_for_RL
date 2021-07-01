const {
    Scenes: { BaseScene }
} = require("telegraf")

const TaskModel = require('../models/task')
const UserModel = require('../models/user')
const { Keyboard, Key } = require("telegram-keyboard")


const { Op } = require('sequelize')

const parseDate = require('../middleware/parseDate')
const isDone = require('../middleware/isDone')

class IncomingScenesGenerator {

    IncomingGen(){
        const incoming = new BaseScene('incoming')
        
        incoming.enter(async (ctx) => {

        
            const incomingTask = await TaskModel.findAll({
                where: {
                    chatIdArr: {
                        [Op.contains]: [ctx.from.id]
                    },
                    isDone: false
                }
            })


            if(incomingTask.length == 0){

                await ctx.replyWithMarkdown('Нету активных входящих заданий!')

            } else {

                await ctx.replyWithMarkdown('Входящие задания:')

                for(let i = 0; i < incomingTask.length; i++){

                    const doneKeyboard = Keyboard.make([
                        [Key.callback('Отметить Выполненым', incomingTask[i].dataValues.id)],
                    ]).inline()

                    const user = await UserModel.findOne({
                        where: {
                            chatId: incomingTask[i].dataValues.initiator,
                        }
                    })

                    

                    await ctx.replyWithMarkdown(`
                        \n*Задание:* ${incomingTask[i].dataValues.text}
                        \n*Инициатор:* ${user.fullName}
                        \n*Исполнитель(и):* ${incomingTask[i].dataValues.workersArr.join(', ')}
                        \n*Приоритет:* ${incomingTask[i].dataValues.priority}
                        \n*Дедлайн:* ${parseDate(incomingTask[i].dataValues.dateEnd)}
                        \n*Выполнено:* ${isDone(incomingTask[i].dataValues.isDone)}
                        \n*Дата Создания:* ${parseDate(incomingTask[i].dataValues.createdAt)}
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

                    await ctx.editMessageText(`Инициатору отправлено сообщение о выполнении!`)

                    await ctx.telegram.sendMessage(incomingTask.initiator, `
                    \n<i><u>${incomingTask.dataValues.workersArr.join(', ')}</u> выполнил(и) задание!</i>
                    \n<b>Задание:</b> ${ incomingTask.text }
                    \n<b>Приоритет:</b> ${ incomingTask.priority }
                    \n<b>Дедлайн:</b> ${ parseDate(incomingTask.dateEnd) }
                    \n<b>Дата создания:</b> ${ parseDate(incomingTask.createdAt) }
                    `, {parse_mode: 'html'})

            
                } catch (e) {
                    console.log(e);
                }
            }
        })

        return incoming

    }

}


module.exports = IncomingScenesGenerator