const UserModel = require('../models/user')
const TaskModel = require('../models/task')
const parseDate = require('../middleware/parseDate');
const { Op } = require('sequelize');

module.exports =  async (bot) => {

    try {
        UserModel.findAll()
        .then(async usersList => {
            for(let i = 0; i < usersList.length; i++){

                let activeTasksList = await TaskModel.findAll({
                    where: {
                        chatIdArr: {
                            [Op.contains]: [usersList[i].chatId]
                        },
                        isDone: false
                    }
                })
                

                if(activeTasksList.length){
                    await bot.telegram.sendMessage(usersList[i].chatId,`Список полученых заданий, которые находятся на выполнении:`)
                }

                if (activeTasksList.length != 0){
                    for(let k = 0; k < activeTasksList.length; k++){


                        if (!activeTasksList[k].isFailed) {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)}
                                \nИнициатор: ${activeTasksList[k].initiatorName}
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}

                            `)
                        } else {
                            await bot.telegram.sendMessage(usersList[i].chatId,`
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️
                                \nВремя выполнения задания истекло!
                                \nЗадание: ${activeTasksList[k].text}
                                \nПриоритет: ${activeTasksList[k].priority}
                                \nДедлайн: ${parseDate(activeTasksList[k].dateEnd)} просрочен!
                                \nИнициатор: ${activeTasksList[k].initiatorName}
                                \nДата Создания: ${parseDate(activeTasksList[k].createdAt)}
                                \n❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️☠️❗️

                            `)
                        }
                    }
                }
            }
        })
    }
    catch (e){
        console.log(e);
    }
}