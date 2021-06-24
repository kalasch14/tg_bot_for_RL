const {
    Scenes: { BaseScene }
} = require("telegraf");

const TaskModel = require('../models/task')
const UserModel = require('../models/user')

const parseDate = require('../middleware/parseDate')
const isDone = require('../middleware/isDone')

const { Op } = require('sequelize');

class DoneScenesGenerator {

    DoneGen(){

        const done = new BaseScene('done')

        done.enter(async (ctx) => {

            const doneTask = await TaskModel.findAll({
                where: {
                    chatIdArr: {
                        [Op.contains]: [ctx.from.id]
                    },
                    isDone: true
                }
            })


            if(doneTask.length == 0){
                //await ctx.reply(ctx.from.id)
                await ctx.reply('Нету выполненых заданий')
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
                        \nИсполнитель(и): ${doneTask[i].dataValues.workersArr.join(', ')},
                        \nДата Создания: ${parseDate(doneTask[i].dataValues.createdAt)}
                    `)
                    
            
                }

            }

        })

        return done

    }

}


module.exports = DoneScenesGenerator