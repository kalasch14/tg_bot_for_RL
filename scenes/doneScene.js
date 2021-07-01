const {
    Scenes: { BaseScene }
} = require("telegraf")

const TaskModel = require('../models/task')
const UserModel = require('../models/user')

const parseDate = require('../middleware/parseDate')
const isDone = require('../middleware/isDone')
const { Keyboard, Key } = require("telegram-keyboard")

const { Op } = require('sequelize')

class DoneScenesGenerator {

    DoneGen(){

        const done = new BaseScene('done')

        done.enter(async (ctx) => {

            await ctx.reply('Выберите тип задания:', selectKeyboard)

        })

        done.on('callback_query', async (ctx) => {
            
            if (ctx.callbackQuery.data == 'in') {

                await ctx.deleteMessage()
                await ctx.scene.enter('inc')

            } else if(ctx.callbackQuery.data == 'out'){

                await ctx.deleteMessage()
                await ctx.scene.enter('out')

            }
        })

        return done

    }


    OutGen(){
        const out = new BaseScene('out')
        

        out.enter(async (ctx) => {

            const doneTask = await TaskModel.findAll({
                where: {
                    initiator: ctx.from.id,
                    isDone: true
                }
            })
            if (doneTask.length == 0) {
                await ctx.reply('Нету выполненых заданий', backKeyboard)
            } else {

                for(let i = 0; i < doneTask.length; i++){

                    const user = await UserModel.findOne({
                        where: {
                            chatId: doneTask[i].dataValues.initiator,
                        }
                    })

                    const deleteKeyboard = Keyboard.make([
                        [Key.callback('🗑', doneTask[i].dataValues.id)],
                      ]).inline()

                    await ctx.replyWithMarkdown(`
                        \n*Задание:* ${doneTask[i].dataValues.text},
                        \n*Инициатор:* ${user.fullName},
                        \n*Приоритет:* ${doneTask[i].dataValues.priority},
                        \n*Дедлайн:* ${parseDate(doneTask[i].dataValues.dateEnd)},
                        \n*Выполнено:* ${isDone(doneTask[i].dataValues.isDone)},
                        \n*Исполнитель(и):* ${doneTask[i].dataValues.workersArr.join(', ')},
                        \n*Дата Создания:* ${parseDate(doneTask[i].dataValues.createdAt)}
                    `, deleteKeyboard)
                }
                await ctx.reply('Выполненные задания ⬆️', backKeyboard)
            }

        })

        out.on('callback_query', async (ctx) => {

            if (ctx.callbackQuery.data == 'back'){
                await ctx.deleteMessage()
                await ctx.scene.enter('done')
            } else {
                try {
                    await TaskModel.destroy({
                        where: {
                            id: ctx.callbackQuery.data
                        }
                    })

                    await ctx.editMessageText('Задание удалено!')

                    
        
                } catch (e) {
                    console.log(e);
                }

            }
        })

        return out
    }

    IncGen(){
        const inc = new BaseScene('inc')

        inc.enter(async (ctx) => {

            const doneTask = await TaskModel.findAll({
                where: {
                    chatIdArr: {
                        [Op.contains]: [ctx.from.id]
                    },
                    isDone: true
                }
            })
            if (doneTask.length == 0) {
                await ctx.reply('Нету выполненых заданий', backKeyboard)
            } else {

                for(let i = 0; i < doneTask.length; i++){

                    const user = await UserModel.findOne({
                        where: {
                            chatId: doneTask[i].dataValues.initiator,
                        }
                    })

                    await ctx.replyWithMarkdown(`
                        \n*Задание:* ${doneTask[i].dataValues.text},
                        \n*Инициатор:* ${user.fullName},
                        \n*Приоритет:* ${doneTask[i].dataValues.priority},
                        \n*Дедлайн:* ${parseDate(doneTask[i].dataValues.dateEnd)},
                        \n*Выполнено:* ${isDone(doneTask[i].dataValues.isDone)},
                        \n*Исполнитель(и):* ${doneTask[i].dataValues.workersArr.join(', ')},
                        \n*Дата Создания:* ${parseDate(doneTask[i].dataValues.createdAt)}
                    `)
                }
                await ctx.reply('Выполненные задания ⬆️', backKeyboard)

            }

        })

        inc.on('callback_query', async (ctx) => {

            if (ctx.callbackQuery.data == 'back'){
                await ctx.deleteMessage()
                await ctx.scene.enter('done')
            }

        })

        return inc
    }

}


const selectKeyboard = Keyboard.make([
    [Key.callback('Мои задания','in')],
    [Key.callback('Задания, поставленные мною','out')]
  ]).inline()

  const backKeyboard = Keyboard.make([
    [Key.callback('Назад','back')],
  ]).inline()


module.exports = DoneScenesGenerator