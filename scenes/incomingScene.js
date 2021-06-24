const {
    Scenes: { BaseScene }
} = require("telegraf");

const TaskModel = require('../models/task')
const UserModel = require('../models/user')
const { Keyboard, Key } = require("telegram-keyboard")

const { Op } = require('sequelize');

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
                        \nЗадание: ${incomingTask[i].dataValues.text}
                        \nИнициатор: ${user.fullName}
                        \nИсполнитель(и): ${incomingTask[i].dataValues.workersArr.join(', ')}
                        \nПриоритет: ${incomingTask[i].dataValues.priority}
                        \nДедлайн: ${parseDate(incomingTask[i].dataValues.dateEnd)}
                        \nВыполнено: ${isDone(incomingTask[i].dataValues.isDone)}
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

                    await ctx.editMessageText('Инициатору отправлено сообщение о выполнении!')

                    let sender = ''
                    if(!ctx.from.last_name){
                        sender = ctx.from.first_name
                    } else sender = `${ctx.from.first_name} ${ctx.from.last_name}`

                    ctx.telegram.sendMessage(incomingTask.initiator, `
                    \n${incomingTask.dataValues.workersArr.join(', ')} выполнил(и) задание!
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
            //ctx.scene.leave()
        })

        return incoming

    }

}


module.exports = IncomingScenesGenerator